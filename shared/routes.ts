import { z } from "zod";
import { insertDevotionalSchema, devotionals } from "./schema";

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
