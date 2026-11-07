import { createFileRoute } from "@tanstack/react-router";

import { ApiError, authenticate, handle, json, preflight } from "@/lib/api.server";
import { readUploadedFile } from "@/lib/documents.server";
import { detectColumns } from "@/lib/message-prep";

// Preview: reads a document and returns its rows without saving anything.
export const Route = createFileRoute("/api/public/v1/documents/parse")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request }) =>
        handle(async () => {
          await authenticate(request);
          const form = await request.formData().catch(() => {
            throw new ApiError(400, "bad_request", "أرسل الملف كنموذج multipart/form-data.");
          });
          const doc = await readUploadedFile(form.get("file"));
          return json({ ...doc, count: doc.records.length, detected_fields: detectColumns(doc.columns) });
        }),
    },
  },
});
