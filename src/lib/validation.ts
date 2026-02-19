import { z } from "zod";

// Enums matching Prisma schema
const PillarEnum = z.enum(["BROTHERHOOD", "LEADERSHIP", "HUMOR", "ENTREPRENEURSHIP", "FAMILY"]);
const ToneEnum = z.enum(["LEADER", "FUNNY", "REFLECTIVE", "BUILDER", "CLUBHOUSE"]);
const PostTypeEnum = z.enum(["TEXT", "LINK", "IMAGE"]);
const StatusEnum = z.enum(["DRAFT", "READY_FOR_REVIEW", "APPROVED", "SCHEDULED", "POSTED", "FAILED"]);
const PlatformEnum = z.enum(["FACEBOOK", "INSTAGRAM", "X"]);

// --- Generate ---
export const GenerateSchema = z.object({
  pillar: PillarEnum,
  tone: ToneEnum,
  postType: PostTypeEnum,
  length: z.enum(["short", "medium", "long"]),
  ctaStyle: z.string().default("none"),
  topic: z.string().optional(),
  variantCount: z.number().int().min(1).max(10),
});

// --- Content Create ---
export const ContentItemCreateSchema = z.object({
  pillar: PillarEnum,
  tone: ToneEnum,
  postType: PostTypeEnum.optional().default("TEXT"),
  platform: PlatformEnum.optional().default("FACEBOOK"),
  caption: z.string().min(1).max(5000),
  hashtags: z.array(z.string()).optional().default([]),
  topic: z.string().optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
});

export const ContentCreateSchema = z.object({
  items: z.array(ContentItemCreateSchema).min(1).max(50),
});

// --- Content Update ---
export const ContentUpdateSchema = z.object({
  status: StatusEnum.optional(),
  caption: z.string().min(1).max(5000).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  linkUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// --- Bulk Update ---
export const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: StatusEnum,
});

// --- Settings Update ---
export const SettingsUpdateSchema = z.object({
  requireApproval: z.boolean().optional(),
  autoPostEnabled: z.boolean().optional(),
  dailyPostTarget: z.number().int().min(1).max(20).optional(),
  strictMode: z.boolean().optional(),
  blockedWords: z.string().optional(),
});

// --- Facebook Config ---
export const FacebookConfigSchema = z.object({
  pageId: z.string().min(1),
  pageAccessToken: z.string().min(1),
});

// --- Template Create ---
export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  pillar: PillarEnum,
  tone: ToneEnum,
  templateText: z.string().min(1).max(5000),
});

// --- Template Update ---
export const TemplateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  pillar: PillarEnum.optional(),
  tone: ToneEnum.optional(),
  templateText: z.string().min(1).max(5000).optional(),
});

// --- Calendar Auto-Build ---
export const AutoBuildSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  targetCount: z.number().int().min(1).max(9).optional(),
});

// --- Content Import ---
export const ContentImportItemSchema = z.object({
  platform: PlatformEnum.optional(),
  postType: PostTypeEnum.optional(),
  pillar: PillarEnum,
  tone: ToneEnum,
  status: StatusEnum.optional(),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
  topic: z.string().optional(),
  linkUrl: z.string().optional(),
});

export const ContentImportSchema = z.object({
  items: z.array(ContentImportItemSchema).min(1),
});
