/**
 * Centralized configuration module.
 * All hardcoded values are extracted here and can be overridden via environment variables.
 */

export const config = {
  // Worker settings
  worker: {
    pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS) || 30000,
    maxAttempts: Number(process.env.WORKER_MAX_ATTEMPTS) || 3,
    backoffMinutes: (process.env.WORKER_BACKOFF_MINUTES || "1,5,15")
      .split(",")
      .map(Number),
    batchSize: Number(process.env.WORKER_BATCH_SIZE) || 10,
  },

  // Rate limiting
  rateLimit: {
    windowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 60,
    perWindow: Number(process.env.RATE_LIMIT_PER_WINDOW) || 200,
    // API endpoint rate limiting (requests per minute per IP)
    apiRequestsPerMinute: Number(process.env.API_RATE_LIMIT_PER_MINUTE) || 60,
  },

  // OpenAI
  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    imageModel: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
    maxRetries: Number(process.env.OPENAI_MAX_RETRIES) || 3,
    retryDelayMs: Number(process.env.OPENAI_RETRY_DELAY_MS) || 1000,
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 4000,
    temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.85,
  },

  // Facebook Graph API
  facebook: {
    graphApiBase: process.env.FACEBOOK_GRAPH_API_BASE || "https://graph.facebook.com/v19.0",
  },

  // Content generation
  content: {
    maxVariants: Number(process.env.MAX_VARIANTS) || 10,
    defaultScheduleTimes: (
      process.env.SCHEDULE_TIMES || "09:00,10:30,12:00,13:30,15:00,16:30,18:00,19:30,21:00"
    ).split(","),
  },

  // Image upload
  upload: {
    maxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 10,
    uploadDir: process.env.UPLOAD_DIR || "public/uploads",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },

  // Auth
  auth: {
    enabled: process.env.AUTH_ENABLED === "true",
    secret: process.env.NEXTAUTH_SECRET || "",
  },
} as const;
