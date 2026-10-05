export const config = { runtime: "edge" };

// Edge runtime forbids fetching raw IPs, so the backend must be a hostname.
// Requests to /tun-oren-2026/<rest> are forwarded to `${BACKEND_BASE}/<rest>`.
const BACKEND_BASE = "http://xhttp-origin.orenadvocat.ru:24449/tun-oren-2026";

const DROP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
  "accept-encoding",
]);

export default async function handler(req) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("p") || "";
  url.searchParams.delete("p");
  const qs = url.searchParams.toString();
  const target = `${BACKEND_BASE}/${sub}${qs ? "?" + qs : ""}`;

  const headers = new Headers();
  for (const [k, v] of req.headers) {
    const l = k.toLowerCase();
    if (DROP.has(l) || l.startsWith("x-vercel") || l.startsWith("x-forwarded") || l === "forwarded") continue;
    headers.set(k, v);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
  });

  // Returning the upstream body as-is lets the edge stream it chunk by chunk;
  // plain rewrites hold back the tail of the XHTTP downlink.
  const out = new Headers();
  for (const [k, v] of upstream.headers) {
    if (!DROP.has(k.toLowerCase())) out.set(k, v);
  }
  out.set("cache-control", "no-store");
  out.set("x-accel-buffering", "no");

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
