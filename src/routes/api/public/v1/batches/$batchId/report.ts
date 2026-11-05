import { createFileRoute } from "@tanstack/react-router";

import { authenticate, handle, json, preflight, readJson } from "@/lib/api.server";
import { reportResults } from "@/lib/batches.server";

// The phone app reports what happened to each message after sending it through its own gateway.
export const Route = createFileRoute("/api/public/v1/batches/$batchId/report")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request, params }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          return json(await reportResults(ctx, params.batchId, await readJson(request)));
        }),
    },
  },
});
