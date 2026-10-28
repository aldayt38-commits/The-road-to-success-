# ربط رفيق (حساب تحت 18)

جيمي وغروك وأوبن راوتر **يشترطوا 18 سنة**. لا تستخدم حساب أحد غيرك ولا تغيّر تاريخ الميلاد.

المزوّد المناسب حسب شروطه الرسمية: **Hugging Face** — العمر الأدنى **13 سنة**.
التسجيل: https://huggingface.co/join
التوكن: https://huggingface.co/settings/tokens
التوثيق: https://huggingface.co/docs/inference-providers/en/index
الشروط: https://huggingface.co/terms-of-service

الخطة ليست بلا حدود: رصيد/طلبات مجانية محدودة وقد تتباطأ. إذا خلص الرصيد رفيق يرجع للمساعد المحلي.

## من الجوال — التوكن

1. افتح https://huggingface.co/join وسجّل بإيميلك.
2. افتح https://huggingface.co/settings/tokens
3. Create new token → نوع **Read** يكفي للتجربة (أو Fine-grained مع صلاحية Inference).
4. انسخ التوكن (يبدأ غالباً بـ `hf_`).
5. **لا تبعثه في الشات ولا تضعه في GitHub ولا في ملفات الموقع.**

## أين يُحفظ التوكن

على **Cloudflare Worker** كسرّ اسمه حرفياً:

`AI_API_KEY`

اختياري:

| الاسم | القيمة |
|---|---|
| `AI_PROVIDER` | `huggingface` |
| `AI_MODEL` | `Qwen/Qwen2.5-7B-Instruct` |

إذا طلب Cloudflare سناً فوق 18 لنشر العامل، اطلب من ولي أمرك يعمل `wrangler deploy` وأنت تعطيه التوكن على جهازه مباشرة (مو عبر الشات).

```
npm i -g wrangler
wrangler login
wrangler secret put AI_API_KEY
wrangler deploy
```

بعدها ضع عنوان العامل فقط في `js/config.js`:

```
window.TAREEQ_AI_URL = "https://tareeq-najah-rafiq.xxxxx.workers.dev";
```

بدون هالخطوة رفيق المحلي يشتغل بدون نت وبدون مفتاح.
