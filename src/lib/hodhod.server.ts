// Server-only helpers for the HodHod platform and SMS gateway endpoints.
import { isPrivateHost, parseSubscribers, type Subscriber } from "./hodhod-rules";

export type ConnectionSecret = {
  id: string;
  endpoint_url: string;
  sender_name: string;
  api_key: string;
};

/**
 * Loads a connection including its API key. The key column is not readable by
 * signed-in users, so this uses the privileged client but always scopes to the
 * verified caller's user id.
 */
export async function loadConnectionSecret(
  userId: string,
  connectionId: string,
): Promise<ConnectionSecret | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn, error } = await supabaseAdmin
    .from("gateway_connections")
    .select("id, endpoint_url, sender_name")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!conn) return null;
  const { data: secret, error: secretError } = await supabaseAdmin
    .from("gateway_connection_secrets")
    .select("api_key")
    .eq("connection_id", conn.id)
    .maybeSingle();
  if (secretError) throw secretError;
  if (!secret) return null;
  return { ...conn, api_key: secret.api_key };
}

/** Stores the API key for a connection the caller has already been verified to own. */
export async function saveConnectionSecret(connectionId: string, apiKey: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("gateway_connection_secrets")
    .upsert({ connection_id: connectionId, api_key: apiKey }, { onConflict: "connection_id" });
  if (error) throw error;
}

function assertPublicHost(endpointUrl: string): URL {
  const url = new URL(endpointUrl);
  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) {
    throw new Error("عنوان الخدمة غير مسموح");
  }
  return url;
}

export async function fetchHodHodSubscribers(apiKey: string, endpointUrl: string): Promise<Subscriber[]> {
  const url = assertPublicHost(endpointUrl);
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("HodHod subscribers request failed", response.status, text.slice(0, 300));
    throw new Error(`تعذر جلب المشتركين من الخدمة (رمز ${response.status})`);
  }
  const data = (await response.json().catch(() => null)) as unknown;
  return parseSubscribers(data);
}

export async function sendSingleMessage(
  endpointUrl: string,
  apiKey: string,
  senderName: string,
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = assertPublicHost(endpointUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sender: senderName, to, message }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
    }
    await response.body?.cancel();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function probeEndpoint(endpointUrl: string): Promise<{ reachable: boolean; status: number | null }> {
  let url: URL;
  try {
    url = assertPublicHost(endpointUrl);
  } catch {
    return { reachable: false, status: null };
  }
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
    await response.body?.cancel();
    return { reachable: response.status < 500, status: response.status };
  } catch {
    return { reachable: false, status: null };
  }
}
