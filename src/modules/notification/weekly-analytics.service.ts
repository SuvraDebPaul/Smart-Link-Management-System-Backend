import { AnalyticsServices } from "../analytics/analytics.service.js";
import { User } from "../user/user.model.js";
import { NotificationServices } from "./notification.service.js";

const getPreviousWeekRange = (now = new Date()) => {
  const endDate = new Date(now);
  endDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCDate(endDate.getUTCDate() - endDate.getUTCDay());

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  return {
    startDate,
    endDate,
    reportKey: startDate.toISOString().slice(0, 10),
  };
};

const generateWeeklyAnalyticsReports = async (now = new Date()) => {
  const { startDate, endDate, reportKey } = getPreviousWeekRange(now);
  const users = await User.find({
    "notificationPreferences.weeklyAnalyticsReport": { $ne: false },
  }).select("_id");

  for (const user of users) {
    try {
      const overview = await AnalyticsServices.getAnalyticsOverviewFromDB(
        user._id.toString(),
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      );

      await NotificationServices.createNotification({
        userId: user._id,
        type: "weekly-analytics",
        title: "Your weekly analytics report",
        message: `${overview.totalClicks} link clicks, ${overview.totalPageVisits} page visits, and ${overview.uniqueVisitors} unique visitors last week.`,
        eventKey: `weekly-analytics:${user._id.toString()}:${reportKey}`,
      });
    } catch (error) {
      console.error(
        `Failed to generate weekly analytics report for ${user._id.toString()}`,
        error,
      );
    }
  }

  return { processedUsers: users.length, reportKey };
};

export const WeeklyAnalyticsServices = {
  generateWeeklyAnalyticsReports,
};
