import connectDB from "../database/mongoose.js";
import { Campaign } from "../modules/campaign/campaign.model.js";
import { Link } from "../modules/link/link.model.js";
import { NotificationServices } from "../modules/notification/notification.service.js";
import { User } from "../modules/user/user.model.js";

const main = async () => {
  await connectDB();
  const now = new Date();
  const campaigns = await Campaign.find({ reportFrequency: { $ne: "none" } });
  for (const campaign of campaigns) {
    const user = await User.findById(campaign.userId).select("plan subscriptionStatus");
    if (
      !user ||
      !["pro", "lifetime"].includes(user.plan) ||
      !["active", "trialing"].includes(user.subscriptionStatus)
    ) {
      continue;
    }
    const waitMs = campaign.reportFrequency === "daily" ? 86400000 : 604800000;
    if (campaign.lastReportAt && now.getTime() - campaign.lastReportAt.getTime() < waitMs) continue;
    const links = await Link.find({ campaignId: campaign._id }).select("clicks");
    const clicks = links.reduce((sum, link) => sum + link.clicks, 0);
    await NotificationServices.createNotification({
      userId: campaign.userId,
      type: "campaign-report",
      title: `${campaign.name} scheduled report`,
      message: `${links.length} links, ${clicks} clicks, and ${campaign.conversions ?? 0} conversions.`,
      eventKey: `campaign-report:${campaign._id.toString()}:${now.toISOString().slice(0, 10)}`,
    });
    campaign.lastReportAt = now;
    await campaign.save();
  }
  process.exit(0);
};
void main();
