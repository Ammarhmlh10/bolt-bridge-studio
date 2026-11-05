import { createFileRoute } from "@tanstack/react-router";

import { authenticate, handle, json, preflight } from "@/lib/api.server";
import { listTemplates } from "@/lib/batches.server";
import { extractPlaceholders } from "@/lib/hodhod-rules";

export const Route = createFileRoute("/api/public/v1/templates")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: ({ request }) =>
        handle(async () => {
          const ctx = await authenticate(request);
          const templates = await listTemplates(ctx);
          return json({ templates: templates.map((t) => ({ ...t, variables: extractPlaceholders(t.body) })) });
        }),
    },
  },
});
