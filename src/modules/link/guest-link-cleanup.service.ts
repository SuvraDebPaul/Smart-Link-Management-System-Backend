import { Link } from "./link.model.js";
import { deleteLinkAnalytics } from "../../utils/analytics-cleanup.js";

const deleteExpiredGuestLinks = async () => {
  const expiredLinks = await Link.find({
    isGuest: true,
    expiresAt: { $lte: new Date() },
  }).select("_id");
  const linkIds = expiredLinks.map((link) => link._id);

  if (linkIds.length === 0) {
    return { deletedLinks: 0 };
  }

  await Promise.all([
    deleteLinkAnalytics(linkIds),
    Link.deleteMany({ _id: { $in: linkIds } }),
  ]);

  return { deletedLinks: linkIds.length };
};

export const GuestLinkCleanupServices = {
  deleteExpiredGuestLinks,
};
