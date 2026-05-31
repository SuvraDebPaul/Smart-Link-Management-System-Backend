import connectDB from "../database/mongoose.js";
import { WeeklyAnalyticsServices } from "../modules/notification/weekly-analytics.service.js";

const main = async () => {
  await connectDB();

  const result =
    await WeeklyAnalyticsServices.generateWeeklyAnalyticsReports();

  console.log(
    `Weekly analytics report complete for ${result.processedUsers} users (${result.reportKey})`,
  );
};

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Weekly analytics report failed", error);
    process.exit(1);
  });
