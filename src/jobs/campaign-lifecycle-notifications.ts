import connectDB from "../database/mongoose.js";
import { CampaignServices } from "../modules/campaign/campaign.service.js";

const main = async () => {
  await connectDB();
  await CampaignServices.notifyEndedCampaignsFromDB();
  console.log("Campaign lifecycle notifications processed");
  process.exit(0);
};

void main();
