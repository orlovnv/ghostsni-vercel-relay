
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

function copyRequestHeaders(req) {
  const headers = {};

  for (const [name, value] of Object.entries(req.headers)) {
    const lowerName = name.toLowerCase();

    if (hopByHopHeaders.has(lowerName)) {
      continue;
    }

    if (Array.isArray(value)) {
      headers[name] = value.join(", ");
    } else if (value !== undefined) {
      headers[name] = value;
    }
  }

  return headers;
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, name) => {
    const lowerName = name.toLowerCase();

    if (!hopByHopHeaders.has(lowerName)) {
      res.setHeader(name, value);
    }
  });
}

export default async function handler(req, res) {
  const backendUrl = process.env.XRAY_BACKEND_URL;

  if (!backendUrl) {
    res.statusCode = 500;
    res.end("XRAY_BACKEND_URL is not configured");
    return;
  }

  const incomingUrl = new URL(req.url, "http://vercel.local");
  const xhttpPath = incomingUrl.searchParams.get("xhttp_path");

  if (!xhttpPath || !xhttpPath.startsWith("/tun-oren-2026")) {
    res.statusCode = 404;
    res.end("XHTTP path is not mapped");
    return;
  }

  incomingUrl.searchParams.delete("xhttp_path");

  const targetPath =
    xhttpPath +
    (incomingUrl.searchParams.size > 0 ? `?${incomingUrl.searchParams.toString()}` : "");
  const target = new URL(targetPath, backendUrl);

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method,
      headers: copyRequestHeaders(req),
      body: hasBody ? req : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual"
    });

    res.statusCode = upstream.status;
    res.statusMessage = upstream.statusText;
    copyResponseHeaders(upstream, res);

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }

    res.end();
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(`Relay error: ${error?.message || String(error)}`);
  }
}
