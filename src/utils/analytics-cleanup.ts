import type { Types } from "mongoose";
import { ClickEvent } from "../modules/analytics/analytics.model.js";
import { ConversionEvent } from "../modules/analytics/conversion.model.js";
import { PageLinkClick } from "../modules/pageVisit/pageLinkClick.model.js";
import { PageVisit } from "../modules/pageVisit/pageVisit.model.js";

export const deleteLinkAnalytics = async (
  linkIds: Types.ObjectId | Types.ObjectId[],
) => {
  const filter = Array.isArray(linkIds) ? { $in: linkIds } : linkIds;

  await Promise.all([
    ClickEvent.deleteMany({ linkId: filter }),
    ConversionEvent.deleteMany({ linkId: filter }),
  ]);
};

export const deletePageAnalytics = async (
  pageIds: Types.ObjectId | Types.ObjectId[],
) => {
  const filter = Array.isArray(pageIds) ? { $in: pageIds } : pageIds;

  await Promise.all([
    PageVisit.deleteMany({ pageId: filter }),
    PageLinkClick.deleteMany({ pageId: filter }),
  ]);
};

export const deleteCampaignAnalytics = async (campaignId: Types.ObjectId) => {
  await ConversionEvent.deleteMany({ campaignId });
};

export const deleteUserAnalytics = async (userId: Types.ObjectId) => {
  await Promise.all([
    ClickEvent.deleteMany({ userId }),
    ConversionEvent.deleteMany({ userId }),
    PageVisit.deleteMany({ userId }),
    PageLinkClick.deleteMany({ userId }),
  ]);
};
