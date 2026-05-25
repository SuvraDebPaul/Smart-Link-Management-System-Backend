import app from "./app.js";
import config from "./config/index.js";
import connectDB from "./database/mongoose.js";

const main = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
};

main();
