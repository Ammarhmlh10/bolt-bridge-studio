<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- App is an Arabic RTL, mobile-first web rebuild of a former Expo (Bolt) app; signed-in pages live under `src/routes/_authenticated/` (client-only gate), `/` only redirects. Why: the source had no public surface.
- Write every `createServerFn(...).middleware(...).validator(...).handler(...)` chain inline in `*.functions.ts`; never build it through a helper/factory. Why: the compiler only extracts direct chains, a factory makes the handler run in the browser.
- Gateway API keys live only in `gateway_connection_secrets` (service-role only) and are read/written through `src/lib/hodhod.server.ts` after an ownership check; `gateway_connections.api_key` is deprecated and must stay NULL. Why: keys must never reach the browser.
- Business limits (sender length, batch size, retries, template lengths, placeholder syntax) live in `src/lib/hodhod-rules.ts` and are covered by `src/test/hodhod-rules.test.ts`. Why: one source of truth for browser and server.
- `legacy_user_map` (service-role only) holds original Bolt user IDs → new user IDs for the pending user import. Why: imported records must be re-owned only after verified email match.
