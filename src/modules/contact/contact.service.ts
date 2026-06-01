import { ContactSubmission } from "./contact.model.js";

const createContactSubmissionIntoDB = async (payload: {
  name: string;
  email: string;
  topic: "general" | "billing" | "technical" | "business";
  message: string;
}) => {
  const result = await ContactSubmission.create(payload);

  return {
    id: result._id,
    status: result.status,
    createdAt: result.createdAt,
  };
};

export const ContactServices = {
  createContactSubmissionIntoDB,
};
