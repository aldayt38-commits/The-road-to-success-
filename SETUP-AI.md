# ربط رفيق بنموذج ذكاء اصطناعي (اختياري)

الموقع على GitHub Pages ثابت، لذلك **المفتاح لا يُوضع في الموقع**. المساعد المحلي يعمل دائماً بدون نت وبدون مفتاح.

المزوّد المختار: **Google Gemini API** — نموذج `gemini-2.5-flash`.
الخطة المجانية موجودة على الموقع الرسمي وليست بلا حدود. على الخطة المجانية قد تُستخدم المدخلات لتحسين منتجات Google. التفاصيل: https://ai.google.dev/gemini-api/docs/pricing

## 1) أنشئ المفتاح من الجوال

1. افتح https://aistudio.google.com/apikey
2. سجّل بحساب Google.
3. Create API key → انسخ المفتاح.
4. **لا تبعث المفتاح في الشات ولا تضعه في GitHub.**

## 2) انشر العامل (Cloudflare Worker — مجاني محدود)

من كمبيوتر فيه Node:

```
npm i -g wrangler
wrangler login
wrangler secret put AI_API_KEY
```

الصق المفتاح عندما يُطلب. ثم:

```
wrangler deploy
```

يعطيك عنواناً مثل `https://tareeq-najah-rafiq.xxxxx.workers.dev`

## 3) اربط الموقع

في الملف `js/config.js` ضع العنوان فقط (ليس المفتاح):

```
window.TAREEQ_AI_URL = "https://tareeq-najah-rafiq.xxxxx.workers.dev";
```

ارفع التعديل إلى GitHub Pages.

## متغيرات البيئة على العامل

| الاسم | مطلوب | مثال |
|---|---|---|
| `AI_API_KEY` | نعم (سر) | مفتاح Gemini |
| `AI_MODEL` | لا | `gemini-2.5-flash` |

بدون `AI_API_KEY` أو عند انقطاع النت أو رفض الطلب، رفيق يرجع للمساعد المحلي.
