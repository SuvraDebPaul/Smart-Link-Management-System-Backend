export interface IContactSubmission {
  name: string;
  email: string;
  topic: "general" | "billing" | "technical" | "business";
  message: string;
  status: "new" | "in-progress" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}
