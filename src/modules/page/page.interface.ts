import { Types } from "mongoose";

export type TPageTheme = "light" | "dark" | "gradient";

export interface IPageLink {
  title: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface IPage {
  userId: Types.ObjectId;
  slug: string;
  title: string;
  bio?: string | null;
  avatarUrl?: string | null;
  theme: TPageTheme;
  links: IPageLink[];
  visits: number;
  isPublished: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
