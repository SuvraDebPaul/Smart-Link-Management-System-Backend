import app from "./app.js";
import config from "./config/index.js";
import connectDB from "./database/mongoose.js";

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]); // Google DNS

const main = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
};

main();
