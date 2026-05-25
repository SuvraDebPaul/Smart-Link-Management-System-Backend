export type TUserRole = "user" | "admin";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  plan: "free" | "basic" | "pro" | "premium";
  isVerified: boolean;
}
