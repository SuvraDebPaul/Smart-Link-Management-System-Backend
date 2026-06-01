import { model, Schema } from "mongoose";
import type { IContactSubmission } from "./contact.interface.js";

const contactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: {
      type: String,
      enum: ["general", "billing", "technical", "business"],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "in-progress", "resolved"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

contactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission = model<IContactSubmission>(
  "ContactSubmission",
  contactSubmissionSchema,
);
