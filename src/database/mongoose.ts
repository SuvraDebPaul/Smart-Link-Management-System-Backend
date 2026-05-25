import mongoose from "mongoose";
import config from "../config/index.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.database_url);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
