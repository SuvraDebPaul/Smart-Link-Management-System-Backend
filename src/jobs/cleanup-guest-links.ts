import connectDB from "../database/mongoose.js";
import { GuestLinkCleanupServices } from "../modules/link/guest-link-cleanup.service.js";

const main = async () => {
  await connectDB();

  const result = await GuestLinkCleanupServices.deleteExpiredGuestLinks();

  console.log(`Guest link cleanup complete for ${result.deletedLinks} links`);
};

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Guest link cleanup failed", error);
    process.exit(1);
  });
