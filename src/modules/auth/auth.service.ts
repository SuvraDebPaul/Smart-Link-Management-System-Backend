import jwt, { type SignOptions } from "jsonwebtoken";
import config from "../../config/index.js";
import { User } from "../user/user.model.js";
import AppError from "../../errors/AppError.js";
import bcrypt from "bcrypt";

const createAccessToken = (payload: {
  id: string;
  email: string;
  role: string;
}) => {
  const options = (
    config.jwt_access_expires_in != null
      ? { expiresIn: config.jwt_access_expires_in as SignOptions["expiresIn"] }
      : {}
  ) as SignOptions;

  return jwt.sign(payload, config.jwt_access_secret, options);
};

const registerUserIntoDB = async (payload: {
  name: string;
  email: string;
  password: string;
}) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new AppError(409, "User already exists with this email address");
  }

  const hashPassword = await bcrypt.hash(payload.password, 12);

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashPassword,
    role: "user",
    plan: "free",
    isVerified: false,
  });

  const accessToken = createAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
    accessToken,
  };
};

const loginUserFromDB = async (payload: {
  email: string;
  password: string;
}) => {
  const user = await User.findOne({ email: payload.email }).select("+password");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = createAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
    },
    accessToken,
  };
};

const AuthServices = {
  registerUserIntoDB,
  loginUserFromDB,
};

export default AuthServices;
