import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ApiError, authenticate, handle, json, preflight, readJson } from "@/lib/api.server";
import { createBatch, listBatches } from "@/lib/batches.server";
import { readUploadedFile } from "@/lib/documents.server";
import { MAX_ROWS_PER_BATCH } from "@/lib/hodhod-rules";

const jsonBody = z.object({
  template_id: z.string().uuid(),
  source_name: z.string().trim().max(255).optional(),
  // Set when the records came from POST /documents/parse, so the batch keeps the original file type.
  source_type: z.enum(["csv", "xlsx", "pdf", "json"]).optional(),
  records: z
    .array(z.record(z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])))
    .min(1)
    .max(MAX_ROWS_PER_BATCH),
});

export const Route = createFileRoute("/api/public/v1/batches/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: ({ request }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          return json({ batches: await listBatches(ctx) });
        }),
      // Create a batch from an uploaded file (multipart: file + template_id) or from JSON records.
      POST: ({ request }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          const contentType = request.headers.get("content-type") ?? "";

          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData().catch(() => {
              throw new ApiError(400, "bad_request", "تعذر قراءة النموذج المرسل.");
            });
            const templateId = String(form.get("template_id") ?? "");
            const doc = await readUploadedFile(form.get("file"));
            const result = await createBatch(ctx, {
              templateId,
              sourceName: doc.source_name,
              sourceType: doc.source_type,
              records: doc.records,
            });
            return json({ ...result, columns: doc.columns }, 201);
          }

          const parsed = jsonBody.safeParse(await readJson(request));
          if (!parsed.success) {
            throw new ApiError(400, "bad_request", "بيانات الطلب غير مكتملة.", parsed.error.flatten().fieldErrors);
          }
          const result = await createBatch(ctx, {
            templateId: parsed.data.template_id,
            sourceName: parsed.data.source_name ?? "بيانات من التطبيق",
            sourceType: parsed.data.source_type ?? "json",
            records: parsed.data.records,
          });
          return json(result, 201);
        }),
    },
  },
});
