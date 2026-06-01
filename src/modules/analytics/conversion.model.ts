import { model, Schema } from "mongoose";

const conversionEventSchema = new Schema(
  {
    linkId: { type: Schema.Types.ObjectId, ref: "Link", required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventName: { type: String, default: "conversion" },
    value: { type: Number, default: 0 },
    convertedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

export const ConversionEvent = model("ConversionEvent", conversionEventSchema);
