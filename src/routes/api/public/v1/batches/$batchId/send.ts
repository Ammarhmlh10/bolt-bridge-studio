import { createFileRoute } from "@tanstack/react-router";

import { authenticate, handle, json, preflight, readJson } from "@/lib/api.server";
import { sendViaGateway } from "@/lib/batches.server";

// Sends the next chunk of pending messages through the caller's own gateway connection.
export const Route = createFileRoute("/api/public/v1/batches/$batchId/send")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request, params }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          return json(await sendViaGateway(ctx, params.batchId, await readJson(request)));
        }),
    },
  },
});
