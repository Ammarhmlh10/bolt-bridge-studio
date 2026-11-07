import { createFileRoute } from "@tanstack/react-router";

import { authenticate, handle, json, preflight } from "@/lib/api.server";
import { deleteBatch, getBatch } from "@/lib/batches.server";

export const Route = createFileRoute("/api/public/v1/batches/$batchId/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      // ?status=pending returns only the messages the phone still has to send.
      GET: ({ request, params }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          const status = new URL(request.url).searchParams.get("status");
          return json(await getBatch(ctx, params.batchId, status));
        }),
      DELETE: ({ request, params }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          await deleteBatch(ctx, params.batchId);
          return json({ deleted: true });
        }),
    },
  },
});
