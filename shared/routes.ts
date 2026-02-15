import { z } from "zod";
import { insertDevotionalSchema, devotionals, insertPrayerRequestSchema, prayerRequests, prayerReplies, threadMessages, autoReplyTemplates, insertThreadMessageSchema, insertAutoReplyTemplateSchema, biblePassages, bibleTranslationSchema, sundaySchoolLessons, insertSundaySchoolLessonSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  devotionals: {
    getToday: {
      method: "GET" as const,
      path: "/api/devotionals/today",
      responses: {
        200: z.custom<typeof devotionals.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getByDate: {
      method: "GET" as const,
      path: "/api/devotionals/date/:date",
      responses: {
        200: z.custom<typeof devotionals.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/devotionals",
      responses: {
        200: z.array(z.custom<typeof devotionals.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/devotionals",
      input: insertDevotionalSchema,
      responses: {
        201: z.custom<typeof devotionals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/devotionals/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/devotionals/:id",
      input: insertDevotionalSchema.partial(),
      responses: {
        200: z.custom<typeof devotionals.$inferSelect>(),
        400: errorSchemas.validation,
        403: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  prayerRequests: {
    create: {
      method: "POST" as const,
      path: "/api/prayer-requests",
      input: insertPrayerRequestSchema,
      responses: {
        201: z.custom<typeof prayerRequests.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/prayer-requests",
      responses: {
        200: z.array(z.custom<typeof prayerRequests.$inferSelect>()),
      },
    },
    getReplies: {
      method: "GET" as const,
      path: "/api/prayer-requests/:id/replies",
      responses: {
        200: z.array(z.custom<typeof prayerReplies.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/prayer-requests/:id",
      responses: {
        200: z.custom<typeof prayerRequests.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/prayer-requests/:id/status",
      responses: {
        200: z.custom<typeof prayerRequests.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getThread: {
      method: "GET" as const,
      path: "/api/prayer-requests/:id/thread",
      responses: {
        200: z.array(z.custom<typeof threadMessages.$inferSelect>()),
      },
    },
    addThreadMessage: {
      method: "POST" as const,
      path: "/api/prayer-requests/:id/thread",
      input: insertThreadMessageSchema.omit({ requestId: true }),
      responses: {
        201: z.custom<typeof threadMessages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  autoReplyTemplates: {
    list: {
      method: "GET" as const,
      path: "/api/auto-reply-templates",
      responses: {
        200: z.array(z.custom<typeof autoReplyTemplates.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/auto-reply-templates/:type",
      responses: {
        200: z.custom<typeof autoReplyTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    upsert: {
      method: "POST" as const,
      path: "/api/auto-reply-templates",
      input: insertAutoReplyTemplateSchema,
      responses: {
        200: z.custom<typeof autoReplyTemplates.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  scripture: {
    get: {
      method: "GET" as const,
      path: "/api/scripture",
      input: z.object({
        reference: z.string(),
        translation: bibleTranslationSchema.optional().default("KJV"),
      }),
      responses: {
        200: z.custom<typeof biblePassages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  sundaySchool: {
    list: {
      method: "GET" as const,
      path: "/api/sunday-school",
      responses: {
        200: z.array(z.custom<typeof sundaySchoolLessons.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/sunday-school/:id",
      responses: {
        200: z.custom<typeof sundaySchoolLessons.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/sunday-school",
      input: insertSundaySchoolLessonSchema,
      responses: {
        201: z.custom<typeof sundaySchoolLessons.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/sunday-school/:id",
      input: insertSundaySchoolLessonSchema.partial(),
      responses: {
        200: z.custom<typeof sundaySchoolLessons.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/sunday-school/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
