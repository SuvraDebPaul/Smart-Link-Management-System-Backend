import connectDB from "../database/mongoose.js";
import { NotificationDeliveryServices } from "../modules/notification/notification-delivery.service.js";

const main = async () => {
  await connectDB();

  const result = await NotificationDeliveryServices.retryPendingDeliveries();

  console.log(
    `Notification delivery retry complete for ${result.processedNotifications} notifications`,
  );
};

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Notification delivery retry failed", error);
    process.exit(1);
  });
