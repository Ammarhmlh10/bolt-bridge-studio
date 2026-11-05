import { createFileRoute } from "@tanstack/react-router";

import { json, preflight } from "@/lib/api.server";

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: () => json({ ok: true, service: "hodhod-invoices", version: "v1" }),
    },
  },
});
