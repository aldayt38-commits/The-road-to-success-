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
      const re = new RegExp(k + "\\s*[:=]??\\s*(-?\\d+(?:\\.\\d+)?)", "i");
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

  function parseVecs(s) {
    const t = latin(s);
    const out = [];
    const re = /[⟨<\(]\s*(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)(?:\s*[,،]\s*(-?\d+(?:\.\d+)?))?\s*[⟩>\)]/g;
    let m;
    while ((m = re.exec(t))) {
      const v = [Number(m[1]), Number(m[2])];
      if (m[3] != null && m[3] !== "") v.push(Number(m[3]));
      out.push(v);
    }
    return out;
  }

  function mag(v) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  }

  function trySolve(q) {
    const t = n(q);
    const a = nums(q);
    const vecs = parseVecs(q);

    // Vector magnitude / unit vector — brackets or «مقدار المتجه»
    if (vecs.length === 1 && (/مقدار|طول|وحده|وحدة|متجه/.test(t) || vecs[0].length >= 2)) {
      const v = vecs[0];
      const m0 = mag(v);
      if (!m0) return steps("المتجه الصفري", "|Ā| = 0", ["المركبات صفر"], "0");
      const u = v.map((x) => rnd(x / m0, 3));
      return steps(
        "مقدار المتجه",
        "|Ā| = √(x²+y²[+z²])  ،  û = Ā / |Ā|",
        [`المركبات ⟨${v.join(" ، ")}⟩`, `|Ā| = ${rnd(m0, 3)}`, `متجه الوحدة ⟨${u.join(" ، ")}⟩`],
        `${rnd(m0, 3)}`,
        "لا تجمع المقادير جمعاً عادياً."
      );
    }
    if (vecs.length === 2 && /جمع|محصله|محصلة|\+/.test(t)) {
      const v = vecs[0].map((x, i) => x + (vecs[1][i] || 0));
      return steps("جمع المتجهات", "Ā + B⃗ بالمركبات", [`⟨${v.join(" ، ")}⟩`], `⟨${v.join(" ، ")}⟩`);
    }
    if (vecs.length === 2 && /نقطي|داخلي|تعامد/.test(t)) {
      const ncomp = Math.min(vecs[0].length, vecs[1].length);
      let dot = 0;
      for (let i = 0; i < ncomp; i++) dot += vecs[0][i] * vecs[1][i];
      return steps(
        "الضرب النقطي",
        "Ā • B⃗ = Σ aᵢbᵢ",
        [`Ā • B⃗ = ${rnd(dot, 3)}`, dot === 0 ? "متعامدان (إن لم يكن أحدهما صفرياً)." : "ليسا متعامدين."],
        `${rnd(dot, 3)}`,
        "الناتج كمية قياسية لا متجه."
      );
    }
    if (!vecs.length && /مقدار المتجه|طول المتجه/.test(t) && a.length >= 2 && a.length <= 3) {
      const m0 = mag(a);
      return steps("مقدار المتجه", "|Ā| = √(x²+y²[+z²])", [`المركبات ⟨${a.join(" ، ")}⟩`, `|Ā| = ${rnd(m0, 3)}`], `${rnd(m0, 3)}`);
    }

    // a^x = b
    const em = latin(q).match(/(\d+(?:\.\d+)?)\s*\^\s*(?:x|س)\s*=\s*(\d+(?:\.\d+)?)/i);
    if (em || ((/اسيا|أسي|لوغاريتم|اس س/.test(t) || /\^\s*(x|س)/.test(latin(q))) && a.length >= 2)) {
      const base = em ? Number(em[1]) : a[0];
      const val = em ? Number(em[2]) : a[1];
      if (base > 0 && base !== 1 && val > 0) {
        const x = Math.log(val) / Math.log(base);
        return steps("معادلة أسية", "aˣ = b  ⇔  x = log b / log a", [`a=${base} ، b=${val}`, `x = ${rnd(x, 4)}`], `س = ${rnd(x, 4)}`, "ارفض أي حل يجعل وسيط اللوغاريتم ≤ 0.");
      }
    }

    // Weight W = mg (one number is enough)
    if (/وزن/.test(t) && !/فرق|قارن/.test(t) && a.length >= 1) {
      const m = labeled(q, ["كغ", "كتلة", "كتله", "كتلته"]) != null ? labeled(q, ["كغ", "كتلة", "كتله", "كتلته"]) : a[0];
      const g = a.length >= 2 && a[1] >= 9 && a[1] <= 11 ? a[1] : 10;
      return steps("الوزن", "W = m g", [`m = ${m} كغ`, `g = ${g}`, `W = ${rnd(m * g)}`], `${rnd(m * g)} نيوتن`, "الوزن قوة، والكتلة مقدار القصور — لا تخلط الوحدات.");
    }

    if (a.length < 2) return "";

    // Work W = F d cosθ  — must mention شغل, before F=ma
    if (/شغل/.test(t) && !/طاقه حرك|طاقة حرك/.test(t)) {
      const F = labeled(q, ["ن", "نيوتن", "قوة", "قوه"]) != null ? labeled(q, ["ن", "نيوتن", "قوة", "قوه"]) : a[0];
      const d = labeled(q, ["ازاحه", "إزاحة", "مسافه", "متر", "م\\b"]) != null ? labeled(q, ["ازاحه", "إزاحة", "مسافه", "متر"]) : a[1];
      const deg = labeled(q, ["درجه", "زاوية", "θ"]) != null ? labeled(q, ["درجه", "زاوية"]) : a[2];
      const cos = deg != null ? Math.cos((deg * Math.PI) / 180) : 1;
      const w = F * d * cos;
      return steps(
        "الشغل",
        "W = F d cosθ",
        [`F = ${F} ن`, `d = ${d} م`, deg != null ? `θ = ${deg}° ، cosθ = ${rnd(cos, 3)}` : "θ = 0° (القوة باتجاه الإزاحة) ، cosθ = 1", `W = ${rnd(w)}`],
        `${rnd(w)} جول`,
        "إذا θ=90° فالشغل صفر."
      );
    }

    // Torque
    if (/عزم/.test(t)) {
      const r = labeled(q, ["ذراع", "م\\b", "متر"]) != null ? labeled(q, ["ذراع", "متر"]) : a[0];
      const F = labeled(q, ["ن", "نيوتن", "قوة", "قوه"]) != null ? labeled(q, ["ن", "نيوتن", "قوة", "قوه"]) : a[1];
      const deg = a[2];
      const s = deg != null ? Math.sin((deg * Math.PI) / 180) : 1;
      const rr = r != null ? r : a[0];
      const FF = F != null ? F : a[1];
      return steps(
        "العزم",
        "τ = r F sinθ",
        [`r=${rr} م`, `F=${FF} ن`, deg != null ? `θ=${deg}°` : "القوة عمودية sinθ=1", `τ=${rnd(rr * FF * s)}`],
        `${rnd(rr * FF * s)} نيوتن.متر`,
        "لا تنسَ sinθ إن لم تكن القوة عمودية."
      );
    }

    // Kinetic
    if (/طاقه حرك|طاقة حرك|حركيه|حركية/.test(t) && /طاق/.test(t)) {
      const m = labeled(q, ["كغ", "kg", "كتلة", "كتله"]) != null ? labeled(q, ["كغ", "kg", "كتلة", "كتله"]) : a[0];
      const v = labeled(q, ["م/ث", "سرعه", "سرعة"]) != null ? labeled(q, ["م/ث", "سرعه", "سرعة"]) : a[1];
      const k = 0.5 * m * v * v;
      return steps("طاقة الحركة", "K = ½ m v²", [`m = ${m}`, `v = ${v}`, `K = 0.5×${m}×${v}² = ${rnd(k)}`], `${rnd(k)} جول`);
    }

    // Potential
    if (/وضع|كامنه|كامنة/.test(t) && /طاق/.test(t)) {
      const m = labeled(q, ["كغ", "kg", "كتلة", "كتله"]) != null ? labeled(q, ["كغ", "kg", "كتلة", "كتله"]) : a[0];
      const h = labeled(q, ["ارتفاع", "م\\b", "متر"]) != null ? labeled(q, ["ارتفاع", "متر"]) : a[1];
      const g = a.length >= 3 ? a[2] : 10;
      return steps("طاقة الوضع", "U = m g h", [`m = ${m}`, `g = ${g} (إن لم يُعطَ، g=10 في مسائل الصف)`, `h = ${h}`, `U = ${rnd(m * g * h)}`], `${rnd(m * g * h)} جول`);
    }
    if (/ارتفاع/.test(t) && /طاق/.test(t) && !/مقذوف|تحليق/.test(t)) {
      const m = labeled(q, ["كغ", "كتلة", "كتله"]) != null ? labeled(q, ["كغ", "كتلة", "كتله"]) : a[0];
      const h = labeled(q, ["ارتفاع"]) != null ? labeled(q, ["ارتفاع"]) : a[1];
      const g = 10;
      return steps("طاقة الوضع", "U = m g h", [`m = ${m}`, `g = ${g}`, `h = ${h}`, `U = ${rnd(m * g * h)}`], `${rnd(m * g * h)} جول`);
    }

    // Projectile
    if (/مقذوف|مدى|تحليق|اقصى ارتفاع|أقصى ارتفاع/.test(t)) {
      const v = a[0], th = a[1], g = a[2] || 10;
      const rad = (th * Math.PI) / 180;
      const T = (2 * v * Math.sin(rad)) / g;
      const H = (v * v * Math.sin(rad) * Math.sin(rad)) / (2 * g);
      const R = (v * v * Math.sin(2 * rad)) / g;
      return steps(
        "حركة المقذوفات",
        "T=2v sinθ / g  ،  H=v² sin²θ / 2g  ،  R=v² sin2θ / g",
        [`v = ${v} م/ث ، θ = ${th}° ، g = ${g}`, `زمن التحليق T = ${rnd(T, 2)} ث`, `أقصى ارتفاع H = ${rnd(H, 2)} م`, `المدى R = ${rnd(R, 2)} م`],
        `T=${rnd(T, 2)} ث ، H=${rnd(H, 2)} م ، R=${rnd(R, 2)} م`,
        "المدى الأكبر عند 45° إذا نقطة القذف والهبوط بمستوى واحد."
      );
    }

    // Coulomb
    if (/كولوم|شحن/.test(t) && a.length >= 3) {
      const q1 = a[0] * 1e-6, q2 = a[1] * 1e-6, r = a[2] < 10 ? a[2] : a[2] / 100;
      const F = (9e9 * Math.abs(q1 * q2)) / (r * r);
      return steps(
        "قانون كولوم",
        "F = k |q₁ q₂| / r²   ،  k=9×10⁹",
        [`اعتبر الشحنات بالميكروكولوم إن لم يُذكر غير ذلك: q₁=${a[0]}μC ، q₂=${a[1]}μC`, `r = ${r} م`, `F = ${rnd(F, 4)} ن`],
        `${rnd(F, 4)} نيوتن`,
        "حوّل μC إلى 10⁻⁶ وسم إلى متر قبل التعويض."
      );
    }

    // Z score
    if ((/علامه معياريه|علامة معيارية|\bz\b|زد /.test(t) || /معياري/.test(t)) && a.length >= 3) {
      const X = a[0], mu = a[1], sig = a[2];
      if (sig) {
        const z = (X - mu) / sig;
        return steps("العلامة المعيارية", "Z = (X − μ) / σ", [`X=${X}`, `μ=${mu}`, `σ=${sig}`, `Z=${rnd(z, 3)}`], `Z = ${rnd(z, 3)}`, "البسط X−μ وليس μ−X إلا إذا طُلب العكس.");
      }
    }

    // binomial
    if (/ذو الحدين|بيرنولي|توافيق/.test(t) && a.length >= 3) {
      const n0 = a[0], k = a[1], p = a[2] > 1 ? a[2] / 100 : a[2];
      function fact(x) {
        let r = 1;
        for (let i = 2; i <= x; i++) r *= i;
        return r;
      }
      const C = fact(n0) / (fact(k) * fact(n0 - k));
      const P = C * Math.pow(p, k) * Math.pow(1 - p, n0 - k);
      return steps(
        "التوزيع ذو الحدين",
        "P(X=k)= C(n,k) p^k (1-p)^{n-k}",
        [`n=${n0} ، k=${k} ، p=${p}`, `C(${n0},${k}) = ${rnd(C, 0)}`, `P = ${rnd(P, 4)}`],
        `${rnd(P, 4)}`,
        "لا تنسَ ضرب احتمال الفشل (1-p)."
      );
    }

    // percent yield
    if (/مردود/.test(t) && a.length >= 2) {
      const act = a[0], th = a[1];
      const pct = (act / th) * 100;
      return steps("المردود المئوي", "%yield = (الفعلي / النظري) × 100%", [`الفعلي = ${act}`, `النظري = ${th}`, `% = ${rnd(pct, 2)}%`], `${rnd(pct, 2)} %`, "إذا كان الفعلي أكبر من النظري راجع الوحدات.");
    }

    // C = Q/V
    if (/سعه|سعة|مواسع/.test(t) && a.length >= 2) {
      const Q = a[0] * 1e-6, V = a[1];
      const C = Q / V;
      return steps("سعة المواسع", "C = Q / V", [`Q=${a[0]} μC → ${Q} كولوم`, `V=${V} فولت`, `C=${C} فاراد = ${rnd(C * 1e6, 3)} μF`], `${rnd(C * 1e6, 3)} ميكروفاراد`);
    }

    // circular
    if (/دائري|جاذب|مركزي/.test(t) && a.length >= 2) {
      const v = a[0], r = a[1], m = a[2];
      const ac = (v * v) / r;
      const extra = m ? `F_c = m v²/r = ${rnd(m * ac)} ن` : "";
      return steps("الحركة الدائرية", "a_c = v² / r   ،   F_c = m v² / r", [`v=${v}`, `r=${r}`, `a_c=${rnd(ac)}`, extra].filter(Boolean), `${rnd(ac)} م/ث²`, "الاتجاه نحو المركز.");
    }

    // colligative
    if (/تجمد|غليان|مولاليه|مولالية/.test(t) && a.length >= 2) {
      const K = a[0], m = a[1];
      return steps("الخواص الجامعة", "ΔT = K · m", [`K=${K}`, `m=${m} مولال`, `ΔT=${rnd(K * m, 3)}`], `${rnd(K * m, 3)}`, "المولالية مول/كغ مذيب وليست المولارية.");
    }

    // F = m a LAST among mechanics, and only if clearly Newton
    const wantA = /تسارع/.test(t);
    const wantF = /نيوتن|محصله|محصلة/.test(t) || (/قوه|قوة/.test(t) && /كتله|كتلة/.test(t));
    const blocked = /شغل|عزم|طاق|مدى|مقذوف|كولوم|شحن|مواسع|متجه/.test(t);
    if (!blocked && (wantA || wantF) && a.length >= 2) {
      const mL = labeled(q, ["كغ", "kg", "كتلة", "كتله"]);
      const fL = labeled(q, ["نيوتن", "قوة", "قوه", "محصلة", "محصله"]);
      const aL = labeled(q, ["م/ث", "تسارع"]);
      if (wantA || (fL != null && mL != null && aL == null)) {
        const F = fL != null ? fL : a.find((x) => x !== mL) || a[1];
        const m = mL != null ? mL : a.find((x) => x !== F) || a[0];
        if (m) {
          return steps(
            "القانون الثاني لنيوتن",
            "ΣF = m a",
            [`المحصلة F = ${F} ن`, `الكتلة m = ${m} كغ`, `a = F/m = ${F}/${m} = ${rnd(F / m)}`],
            `${rnd(F / m)} م/ث²`,
            "القوى على الجسم نفسه فقط، لا تجمع الفعل ورد الفعل."
          );
        }
      }
      const m = mL != null ? mL : a[0];
      const acc = aL != null ? aL : a[1];
      return steps("القانون الثاني لنيوتن", "ΣF = m a", [`m = ${m} كغ`, `a = ${acc} م/ث²`, `F = ${m}×${acc} = ${rnd(m * acc)}`], `${rnd(m * acc)} نيوتن`, "الوحدة: kg·m/s² = ن.");
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
      const auto = trySolve(question);
      if (auto) return auto;
      const tmpl = template(lesson);
      if (tmpl) return `<p>ما قدرت أعوّض أرقام سؤالك تلقائياً، فخذ أسلوب الكتاب من المثال:</p>` + tmpl;
      return `<p>اكتب المعطيات بأرقام واضحة (مثل: كتلة 2 كغ وقوة 10 ن) عشان أحلّها خطوة خطوة.</p>`;
    },
    canAuto(question) {
      const auto = trySolve(question);
      return !!(auto && auto.indexOf("حل بأسلوب وزاري") !== -1);
    }
  };
})();
