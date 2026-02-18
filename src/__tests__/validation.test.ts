import { describe, it, expect } from "vitest";
import {
  GenerateSchema,
  ContentCreateSchema,
  ContentUpdateSchema,
  BulkUpdateSchema,
  SettingsUpdateSchema,
  FacebookConfigSchema,
  TemplateCreateSchema,
  AutoBuildSchema,
  ContentImportSchema,
} from "@/lib/validation";

describe("GenerateSchema", () => {
  it("accepts valid generate input", () => {
    const result = GenerateSchema.safeParse({
      pillar: "BROTHERHOOD",
      tone: "LEADER",
      postType: "TEXT",
      length: "medium",
      ctaStyle: "question",
      variantCount: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pillar", () => {
    const result = GenerateSchema.safeParse({
      pillar: "INVALID",
      tone: "LEADER",
      postType: "TEXT",
      length: "medium",
      variantCount: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects variant count above 10", () => {
    const result = GenerateSchema.safeParse({
      pillar: "BROTHERHOOD",
      tone: "LEADER",
      postType: "TEXT",
      length: "medium",
      variantCount: 15,
    });
    expect(result.success).toBe(false);
  });

  it("rejects variant count below 1", () => {
    const result = GenerateSchema.safeParse({
      pillar: "BROTHERHOOD",
      tone: "LEADER",
      postType: "TEXT",
      length: "medium",
      variantCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional topic", () => {
    const result = GenerateSchema.safeParse({
      pillar: "HUMOR",
      tone: "FUNNY",
      postType: "TEXT",
      length: "short",
      variantCount: 3,
      topic: "Sunday ride stories",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("Sunday ride stories");
    }
  });
});

describe("ContentCreateSchema", () => {
  it("accepts valid content items", () => {
    const result = ContentCreateSchema.safeParse({
      items: [
        {
          pillar: "LEADERSHIP",
          tone: "BUILDER",
          caption: "Test caption",
          hashtags: ["leadership", "builder"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = ContentCreateSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing caption", () => {
    const result = ContentCreateSchema.safeParse({
      items: [{ pillar: "LEADERSHIP", tone: "BUILDER" }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults postType to TEXT", () => {
    const result = ContentCreateSchema.safeParse({
      items: [
        {
          pillar: "LEADERSHIP",
          tone: "LEADER",
          caption: "Test",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].postType).toBe("TEXT");
    }
  });
});

describe("ContentUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = ContentUpdateSchema.safeParse({
      caption: "Updated caption",
    });
    expect(result.success).toBe(true);
  });

  it("accepts status update", () => {
    const result = ContentUpdateSchema.safeParse({
      status: "APPROVED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = ContentUpdateSchema.safeParse({
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });
});

describe("BulkUpdateSchema", () => {
  it("accepts valid bulk update", () => {
    const result = BulkUpdateSchema.safeParse({
      ids: ["550e8400-e29b-41d4-a716-446655440000"],
      status: "APPROVED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty ids array", () => {
    const result = BulkUpdateSchema.safeParse({
      ids: [],
      status: "APPROVED",
    });
    expect(result.success).toBe(false);
  });
});

describe("SettingsUpdateSchema", () => {
  it("accepts partial settings", () => {
    const result = SettingsUpdateSchema.safeParse({
      requireApproval: false,
      dailyPostTarget: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects daily target above 20", () => {
    const result = SettingsUpdateSchema.safeParse({
      dailyPostTarget: 25,
    });
    expect(result.success).toBe(false);
  });
});

describe("FacebookConfigSchema", () => {
  it("accepts valid config", () => {
    const result = FacebookConfigSchema.safeParse({
      pageId: "123456789",
      pageAccessToken: "EAABsbCS...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing pageId", () => {
    const result = FacebookConfigSchema.safeParse({
      pageAccessToken: "token",
    });
    expect(result.success).toBe(false);
  });
});

describe("TemplateCreateSchema", () => {
  it("accepts valid template", () => {
    const result = TemplateCreateSchema.safeParse({
      name: "Brotherhood Leader",
      pillar: "BROTHERHOOD",
      tone: "LEADER",
      templateText: "Write a post about motorcycle culture...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = TemplateCreateSchema.safeParse({
      name: "",
      pillar: "BROTHERHOOD",
      tone: "LEADER",
      templateText: "Text",
    });
    expect(result.success).toBe(false);
  });
});

describe("AutoBuildSchema", () => {
  it("accepts valid date", () => {
    const result = AutoBuildSchema.safeParse({
      date: "2026-02-20",
      targetCount: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = AutoBuildSchema.safeParse({
      date: "Feb 20, 2026",
    });
    expect(result.success).toBe(false);
  });
});

describe("ContentImportSchema", () => {
  it("accepts valid import data", () => {
    const result = ContentImportSchema.safeParse({
      items: [
        {
          pillar: "FAMILY",
          tone: "REFLECTIVE",
          caption: "Imported content",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
