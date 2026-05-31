import { ClickEvent } from "../analytics/analytics.model.js";
import { ApiKey } from "../apiKey/apiKey.model.js";
import { Campaign } from "../campaign/campaign.model.js";
import { Domain } from "../domain/domain.model.js";
import { Link } from "../link/link.model.js";
import { Page } from "../page/page.model.js";
import { PageLinkClick } from "../pageVisit/pageLinkClick.model.js";
import { PageVisit } from "../pageVisit/pageVisit.model.js";
import { Notification } from "../notification/notification.model.js";
import { User } from "./user.model.js";

const deleteAppUserData = async (betterAuthUserId: string) => {
  const user = await User.findOne({ betterAuthUserId }).select("_id");

  if (!user) {
    return;
  }

  const userId = user._id;

  await Promise.all([
    ClickEvent.deleteMany({ userId }),
    PageVisit.deleteMany({ userId }),
    PageLinkClick.deleteMany({ userId }),
    ApiKey.deleteMany({ user: userId }),
    Link.deleteMany({ userId }),
    Campaign.deleteMany({ userId }),
    Page.deleteMany({ userId }),
    Domain.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
  ]);

  await User.deleteOne({ _id: userId });
};

export const AccountDeletionServices = {
  deleteAppUserData,
};
