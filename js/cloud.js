(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function toHtml(text) {
    const parts = String(text || "")
      .trim()
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return "";
    return parts
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  window.TareeqAI = {
    enabled() {
      return !!(window.TAREEQ_AI_URL && navigator.onLine);
    },
    async ask(question, opts) {
      const url = window.TAREEQ_AI_URL;
      if (!url || !navigator.onLine) return null;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 18000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            q: String(question || "").slice(0, 1200),
            subject: (opts && opts.subject) || "",
            context: String((opts && opts.context) || "").slice(0, 3500)
          })
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || data.fallback) return null;
        const html = data.html || toHtml(data.text || "");
        if (!html) return null;
        return { html, source: data.source || "cloud" };
      } catch {
        return null;
      } finally {
        clearTimeout(t);
      }
    }
  };
})();
