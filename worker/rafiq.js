function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function allowOrigin(origin) {
  if (!origin) return true;
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) }
  });
}

function toHtml(text) {
  const esc = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>")
    .join("");
}

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const win = 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  if (arr.length >= 20) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== "POST") return json({ error: "method", fallback: true }, 405, origin);
    if (origin && !allowOrigin(origin)) return json({ error: "origin", fallback: true }, 403, origin);

    const ip = req.headers.get("CF-Connecting-IP") || "x";
    if (limited(ip)) return json({ error: "rate", fallback: true }, 429, origin);

    const key = env.AI_API_KEY;
    if (!key) return json({ error: "no_key", fallback: true }, 503, origin);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "bad_json", fallback: true }, 400, origin);
    }
    const q = String(body.q || "").trim().slice(0, 1200);
    if (q.length < 2) return json({ error: "short", fallback: true }, 400, origin);
    const ctx = String(body.context || "").slice(0, 3500);
    const model = env.AI_MODEL || "gemini-2.5-flash";

    const prompt =
      "أنت رفيق، معلّم للصف الحادي عشر العلمي وفق رزم قطاع غزة فقط. لا تخترع دروس صفوف أخرى. إن وُجد مقتطف من الرزمة فاعتمد عليه أولاً. التعاريف والقوانين بالفصحى. رتّب الجواب: تعريف، قانون إن وجد، مثال قصير، سؤال يتأكد منه الطالب.\n\nمقتطف الرزمة:\n" +
      (ctx || "(لا مقتطف)") +
      "\n\nسؤال الطالب:\n" +
      q;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(key);

    let up;
    try {
      up = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
        })
      });
    } catch {
      return json({ error: "network", fallback: true }, 502, origin);
    }
    if (!up.ok) return json({ error: "upstream", fallback: true, status: up.status }, 502, origin);
    let data;
    try {
      data = await up.json();
    } catch {
      return json({ error: "parse", fallback: true }, 502, origin);
    }
    const text = ((data.candidates || [])[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map((p) => p.text || "").join("\n")
      : "") || "";
    if (!text.trim()) return json({ error: "empty", fallback: true }, 502, origin);
    return json({ html: toHtml(text), source: "gemini" }, 200, origin);
  }
};
