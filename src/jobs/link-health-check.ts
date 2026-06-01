import connectDB from "../database/mongoose.js";
import { LinkServices } from "../modules/link/link.service.js";

const main = async () => {
  await connectDB();
  const result = await LinkServices.checkAllLinkHealthFromDB();
  console.log(`Link health check complete for ${result.checkedLinks} links`);
  process.exit(0);
};

void main();
