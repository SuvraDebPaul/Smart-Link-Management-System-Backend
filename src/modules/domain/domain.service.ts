import { Types } from "mongoose";
import { nanoid } from "nanoid";
import AppError from "../../errors/AppError.js";
import { Domain } from "./domain.model.js";
import { Link } from "../link/link.model.js";
import dns from "node:dns/promises";
import type { TAuthUser } from "../user/user.interface.js";
import { checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { NotificationServices } from "../notification/notification.service.js";

const normalizeDomain = (domain: string) => {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();
};

const notifyDomainVerificationFailed = async (
  userId: Types.ObjectId,
  domainId: Types.ObjectId,
  domain: string,
) => {
  await NotificationServices.createNotification({
    userId,
    type: "domain-verification-failed",
    title: "Domain verification failed",
    message: `DNS verification failed for ${domain}. Check the TXT record and try again.`,
    eventKey: `domain-verification-failed:${domainId.toString()}`,
  });
};

const buildDomainResponse = (domain: any) => {
  return {
    id: domain._id,
    domain: domain.domain,
    status: domain.status,
    verificationToken: domain.verificationToken,
    dnsInstruction: {
      type: "TXT",
      name: domain.domain,
      value: domain.verificationToken,
    },
    isActive: domain.isActive,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
};

const createDomainIntoDB = async (
  payload: {
    domain: string;
  },
  userPayload: TAuthUser,
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);
  const totalDomains = await Domain.countDocuments({
    userId: userObjectId,
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "customDomains",
    currentUsage: totalDomains,
  });
  const normalizedDomain = normalizeDomain(payload.domain);

  const existingDomain = await Domain.findOne({
    domain: normalizedDomain,
  });

  if (existingDomain) {
    throw new AppError(409, "This domain is already connected");
  }

  const verificationToken = `smartlink-verify-${nanoid(16)}`;

  const result = await Domain.create({
    userId: userObjectId,
    domain: normalizedDomain,
    status: "pending",
    verificationToken,
    isActive: false,
  });

  return buildDomainResponse(result);
};

const getMyDomainsFromDB = async (userId: string) => {
  const result = await Domain.find({
    userId: new Types.ObjectId(userId),
  }).sort({
    createdAt: -1,
  });

  return result.map((domain) => buildDomainResponse(domain));
};

const getSingleDomainFromDB = async (id: string, userId: string) => {
  const domain = await Domain.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  return buildDomainResponse(domain);
};

const updateDomainIntoDB = async (
  id: string,
  userPayload: TAuthUser,
  payload: {
    isActive?: boolean;
  },
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);

  const domain = await Domain.findOne({
    _id: new Types.ObjectId(id),
    userId: userObjectId,
  });

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }
  if (payload.isActive === true && domain.status !== "verified") {
    throw new AppError(400, "Verify the domain before activating it");
  }

  if (payload.isActive === true && !domain.isActive) {
    const totalActiveDomains = await Domain.countDocuments({
      userId: userObjectId,
      isActive: true,
    });

    checkPlanLimit({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      key: "customDomains",
      currentUsage: totalActiveDomains,
    });
  }

  if (typeof payload.isActive === "boolean") {
    domain.isActive = payload.isActive;
  }

  const result = await domain.save();

  return buildDomainResponse(result);
};

const deleteDomainFromDB = async (id: string, userId: string) => {
  const domain = await Domain.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  await Link.updateMany(
    {
      domainId: domain._id,
      userId: new Types.ObjectId(userId),
    },
    {
      $set: {
        domainId: null,
      },
    },
  );

  return buildDomainResponse(domain);
};

const verifyDomainManuallyIntoDB = async (id: string, userId: string) => {
  const domain = await Domain.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  domain.status = "verified";
  domain.isActive = true;

  const result = await domain.save();

  return buildDomainResponse(result);
};

const verifyDomainDnsIntoDB = async (id: string, userPayload: TAuthUser) => {
  const userObjectId = new Types.ObjectId(userPayload.id);

  const domain = await Domain.findOne({
    _id: new Types.ObjectId(id),
    userId: userObjectId,
  });

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  try {
    const txtRecords = await dns.resolveTxt(domain.domain);

    const flattenedRecords = txtRecords.map((record) => record.join(""));

    const isVerified = flattenedRecords.includes(domain.verificationToken);

    if (!isVerified) {
      domain.status = "failed";
      await domain.save();
      await notifyDomainVerificationFailed(
        userObjectId,
        domain._id,
        domain.domain,
      );

      throw new AppError(
        400,
        "DNS TXT record not found. Please add the verification token and try again.",
      );
    }

    if (!domain.isActive) {
      const totalActiveDomains = await Domain.countDocuments({
        userId: userObjectId,
        isActive: true,
      });

      checkPlanLimit({
        plan: userPayload.plan,
        subscriptionStatus: userPayload.subscriptionStatus,
        key: "customDomains",
        currentUsage: totalActiveDomains,
      });
    }

    domain.status = "verified";
    domain.isActive = true;

    const result = await domain.save();

    return buildDomainResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    domain.status = "failed";
    await domain.save();
    await notifyDomainVerificationFailed(userObjectId, domain._id, domain.domain);

    throw new AppError(
      400,
      "Unable to verify DNS TXT record. Please check your DNS settings and try again.",
    );
  }
};

export const DomainServices = {
  createDomainIntoDB,
  getMyDomainsFromDB,
  getSingleDomainFromDB,
  updateDomainIntoDB,
  deleteDomainFromDB,
  verifyDomainManuallyIntoDB,
  verifyDomainDnsIntoDB,
};
