(function () {
  const IND = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };

  function latin(s) {
    return String(s || "").replace(/[٠-٩]/g, (d) => IND[d] || d);
  }
  function nums(s) {
    return [...latin(s).matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])).filter((n) => Number.isFinite(n));
  }
  function labeled(s, keys) {
    const t = latin(s);
    for (const k of keys) {
      const re = new RegExp(k + "\\s*[:=]?\\s*(-?\\d+(?:\\.\\d+)?)", "i");
      const m = t.match(re);
      if (m) return Number(m[1]);
      const re2 = new RegExp("(-?\\d+(?:\\.\\d+)?)\\s*" + k, "i");
      const m2 = t.match(re2);
      if (m2) return Number(m2[1]);
    }
    return null;
  }
  function n(s) {
    return String(s || "")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/[ىي]/g, "ي")
      .replace(/ة/g, "ه")
      .toLowerCase();
  }
  function rnd(x, d) {
    const p = Math.pow(10, d == null ? 3 : d);
    return Math.round(x * p) / p;
  }
  function steps(title, law, rows, ans, warn) {
    return `<div class="callout">
      <b>حل بأسلوب وزاري — ${title}</b>
      <p><b>القانون (فصحى الكتاب):</b></p>
      <div class="formula">${law}</div>
      <ol>${rows.map((r) => `<li>${r}</li>`).join("")}</ol>
      <p><b>الناتج:</b> ${ans}</p>
      ${warn ? `<p><b>دير بالك:</b> ${warn}</p>` : ""}
    </div>`;
  }

  function trySolve(q, L) {
    const t = n(q);
    const a = nums(q);
    const blob = n((L && (L.title + " " + L.summary + " " + (L.keywords || []).join(" "))) || "");

    // F = m a
    if (/نيوتن|تسارع|محصله|قوه|قوة|كتله|كتلة/.test(t + blob) && a.length >= 2) {
      const mL = labeled(q, ["كغ", "kg", "كتلة", "كتله"]);
      const fL = labeled(q, ["نيوتن", "قوة", "قوه", "محصلة"]);
      const aL = labeled(q, ["م/ث", "تسارع"]);
      const wantA = /تسارع/.test(t);
      if (wantA || (fL != null && mL != null && aL == null)) {
        const F = fL != null ? fL : a.find((x) => x !== mL) || a[1];
        const m = mL != null ? mL : a.find((x) => x !== F) || a[0];
        if (m) return steps("القانون الثاني لنيوتن", "ΣF = m a", [`المحصلة F = ${F} ن`, `الكتلة m = ${m} كغ`, `a = F/m = ${F}/${m} = ${rnd(F / m)}`], `${rnd(F / m)} م/ث²`, "القوى على الجسم نفسه فقط، لا تجمع الفعل ورد الفعل.");
      }
      const m = mL != null ? mL : a[0];
      const acc = aL != null ? aL : a[1];
      return steps("القانون الثاني لنيوتن", "ΣF = m a", [`m = ${m} كغ`, `a = ${acc} م/ث²`, `F = ${m}×${acc} = ${rnd(m * acc)}`], `${rnd(m * acc)} نيوتن`, "الوحدة: kg·m/s² = ن.");
    }

    // W = F d cos
    if ((/شغل/.test(t) || /شغل/.test(blob)) && a.length >= 2) {
      const F = a[0], d = a[1], deg = a[2];
      const cos = deg != null ? Math.cos((deg * Math.PI) / 180) : 1;
      const w = F * d * cos;
      return steps("الشغل", "W = F d cosθ", [`F = ${F} ن`, `d = ${d} م`, deg != null ? `θ = ${deg}° ، cosθ = ${rnd(cos, 3)}` : "θ = 0° (القوة باتجاه الإزاحة) ، cosθ = 1", `W = ${rnd(w)}`], `${rnd(w)} جول`, "إذا θ=90° فالشغل صفر.");
    }

    // K = 1/2 m v^2
    if ((/طاقه حرك|طاقة حرك/.test(t) || /حركيه|حركية/.test(blob)) && a.length >= 2) {
      const m = a[0], v = a[1];
      const k = 0.5 * m * v * v;
      return steps("طاقة الحركة", "K = ½ m v²", [`m = ${m}`, `v = ${v}`, `K = 0.5×${m}×${v}² = ${rnd(k)}`], `${rnd(k)} جول`);
    }

    // U = mgh
    if ((/وضع|كامنه|كامنة|ارتفاع/.test(t) && /طاق/.test(t + blob)) && a.length >= 2) {
      const m = a[0], h = a[1], g = a[2] || 10;
      return steps("طاقة الوضع", "U = m g h", [`m = ${m}`, `g = ${g}`, `h = ${h}`, `U = ${rnd(m * g * h)}`], `${rnd(m * g * h)} جول`);
    }

    // projectile
    if ((/مقذوف|مدى|تحليق|اقصى ارتفاع|أقصى ارتفاع/.test(t) || /مقذوف/.test(blob)) && a.length >= 2) {
      const v = a[0], th = a[1], g = a[2] || 10;
      const rad = (th * Math.PI) / 180;
      const T = (2 * v * Math.sin(rad)) / g;
      const H = (v * v * Math.sin(rad) * Math.sin(rad)) / (2 * g);
      const R = (v * v * Math.sin(2 * rad)) / g;
      return steps("حركة المقذوفات", "T=2v sinθ / g  ،  H=v² sin²θ / 2g  ،  R=v² sin2θ / g", [
        `v = ${v} م/ث ، θ = ${th}° ، g = ${g}`,
        `زمن التحليق T = ${rnd(T, 2)} ث`,
        `أقصى ارتفاع H = ${rnd(H, 2)} م`,
        `المدى R = ${rnd(R, 2)} م`
      ], `T=${rnd(T, 2)} ث ، H=${rnd(H, 2)} م ، R=${rnd(R, 2)} م`, "المدى الأكبر عند 45° إذا نقطة القذف والهبوط بمستوى واحد.");
    }

    // Coulomb
    if ((/كولوم|شحن/.test(t) || /كولوم/.test(blob)) && a.length >= 3) {
      const q1 = a[0] * 1e-6, q2 = a[1] * 1e-6, r = a[2] < 10 ? a[2] : a[2] / 100;
      const F = (9e9 * Math.abs(q1 * q2)) / (r * r);
      return steps("قانون كولوم", "F = k |q₁ q₂| / r²   ،  k=9×10⁹", [
        `اعتبر الشحنات بالميكروكولوم إن لم يُذكر غير ذلك: q₁=${a[0]}μC ، q₂=${a[1]}μC`,
        `r = ${r} م`,
        `F = ${rnd(F, 4)} ن`
      ], `${rnd(F, 4)} نيوتن`, "حوّل μC إلى 10⁻⁶ وسم إلى متر قبل التعويض.");
    }

    // Z score
    if ((/علامه معياريه|علامة معيارية| z |زد /.test(t) || /معياري/.test(blob)) && a.length >= 3) {
      const X = a[0], mu = a[1], sig = a[2];
      const z = (X - mu) / sig;
      return steps("العلامة المعيارية", "Z = (X − μ) / σ", [`X=${X}`, `μ=${mu}`, `σ=${sig}`, `Z=${rnd(z, 3)}`], `Z = ${rnd(z, 3)}`, "البسط X−μ وليس μ−X إلا إذا طُلب العكس.");
    }

    // binomial
    if ((/ذو الحدين|بيرنولي|توافيق/.test(t) || /حدين/.test(blob)) && a.length >= 3) {
      const n0 = a[0], k = a[1], p = a[2] > 1 ? a[2] / 100 : a[2];
      function fact(x) {
        let r = 1;
        for (let i = 2; i <= x; i++) r *= i;
        return r;
      }
      const C = fact(n0) / (fact(k) * fact(n0 - k));
      const P = C * Math.pow(p, k) * Math.pow(1 - p, n0 - k);
      return steps("التوزيع ذو الحدين", "P(X=k)= C(n,k) p^k (1-p)^{n-k}", [
        `n=${n0} ، k=${k} ، p=${p}`,
        `C(${n0},${k}) = ${rnd(C, 0)}`,
        `P = ${rnd(P, 4)}`
      ], `${rnd(P, 4)}`, "لا تنسَ ضرب احتمال الفشل (1-p).");
    }

    // percent yield
    if ((/مردود/.test(t) || /مردود/.test(blob)) && a.length >= 2) {
      const act = a[0], th = a[1];
      const y = (Math.min(act, th) / Math.max(act, th)) * 100;
      const pct = (act / th) * 100;
      return steps("المردود المئوي", "%yield = (الفعلي / النظري) × 100%", [`الفعلي = ${act}`, `النظري = ${th}`, `% = ${rnd(pct, 2)}%`], `${rnd(pct, 2)} %`, "إذا كان الفعلي أكبر من النظري راجع الوحدات.");
    }

    // vector magnitude
    if ((/مقدار المتجه|طول المتجه|متجه/.test(t) || /متجه/.test(blob)) && a.length >= 2 && a.length <= 3) {
      const mag = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
      return steps("مقدار المتجه", "|Ā| = √(x²+y²[+z²])", [`المركبات ⟨${a.join(" ، ")}⟩`, `|Ā| = ${rnd(mag, 3)}`], `${rnd(mag, 3)}`, "لا تجمع المقادير جمعاً عادياً.");
    }

    // log / exponential  a^x = b
    if ((/اسيا|أسي|لوغاريتم/.test(t) || /اسي|لوغاريتم/.test(blob)) && a.length >= 2) {
      const base = a[0], val = a[1];
      const x = Math.log(val) / Math.log(base);
      return steps("معادلة أسية", "aˣ = b  ⇔  x = log b / log a", [`a=${base} ، b=${val}`, `x = ${rnd(x, 4)}`], `س = ${rnd(x, 4)}`, "ارفض أي حل يجعل وسيط اللوغاريتم ≤ 0.");
    }

    // C = Q/V
    if ((/سعه|سعة|مواسع/.test(t) || /سعه|مواسع/.test(blob)) && a.length >= 2) {
      const Q = a[0] * 1e-6, V = a[1];
      const C = Q / V;
      return steps("سعة المواسع", "C = Q / V", [`Q=${a[0]} μC → ${Q} كولوم`, `V=${V} فولت`, `C=${C} فاراد = ${rnd(C * 1e6, 3)} μF`], `${rnd(C * 1e6, 3)} ميكروفاراد`);
    }

    // τ = r F
    if ((/عزم/.test(t) || /عزم/.test(blob)) && a.length >= 2) {
      const r = a[0], F = a[1], deg = a[2];
      const s = deg != null ? Math.sin((deg * Math.PI) / 180) : 1;
      return steps("العزم", "τ = r F sinθ", [`r=${r} م`, `F=${F} ن`, deg != null ? `θ=${deg}°` : "القوة عمودية sinθ=1", `τ=${rnd(r * F * s)}`], `${rnd(r * F * s)} نيوتن.متر`, "لا تنسَ sinθ إن لم تكن القوة عمودية.");
    }

    // a = v^2/r
    if ((/دائري|جاذب|مركزي/.test(t) || /دائري/.test(blob)) && a.length >= 2) {
      const v = a[0], r = a[1], m = a[2];
      const ac = (v * v) / r;
      const extra = m ? `F_c = m v²/r = ${rnd(m * ac)} ن` : "";
      return steps("الحركة الدائرية", "a_c = v² / r   ،   F_c = m v² / r", [`v=${v}`, `r=${r}`, `a_c=${rnd(ac)}`, extra].filter(Boolean), `${rnd(ac)} م/ث²`, "الاتجاه نحو المركز.");
    }

    // ΔT = K m
    if ((/تجمد|غليان|مولاليه|مولالية/.test(t) || /جامعه|جامعة/.test(blob)) && a.length >= 2) {
      const K = a[0], m = a[1];
      return steps("الخواص الجامعة", "ΔT = K · m", [`K=${K}`, `m=${m} مولال`, `ΔT=${rnd(K * m, 3)}`], `${rnd(K * m, 3)}`, "المولالية مول/كغ مذيب وليست المولارية.");
    }

    return "";
  }

  function template(L) {
    if (!L || !L.example) return "";
    return `<div class="callout">
      <b>نموذج حل من الرزمة (اتبع نفس الأسلوب):</b>
      <p>${L.example.q}</p>
      <ol>${L.example.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      <p><b>الناتج في الكتاب:</b> ${L.example.ans}</p>
    </div>`;
  }

  window.Solver = {
    solve(question, lesson) {
      const auto = trySolve(question, lesson);
      const tmpl = template(lesson);
      if (auto && tmpl) return auto + tmpl;
      if (auto) return auto;
      if (tmpl) return `<p>ما قدرت أعوّض أرقام سؤالك تلقائياً، فخذ أسلوب الكتاب من المثال:</p>` + tmpl;
      return `<p>اكتب المعطيات بأرقام واضحة (مثل: كتلة 2 كغ وقوة 10 ن) عشان أحلّها خطوة خطوة.</p>`;
    }
  };
})();
