# VELNIX EXTRACTOR PRO

واجهة عربية لاستخراج قوائم Live من حساب Xtream يملك المستخدم حق استخدامه.

## النشر الحالي

- الواجهة الأمامية: GitHub Pages من مجلد `public/`.
- خدمة API: Supabase Edge Function باسم `xtream-extractor`.
- مشروع Supabase: `selovvyxvvdcdvdvlqzo` (منطقة Frankfurt / eu-central-1).
- عنوان الوظيفة: `https://selovvyxvvdcdvdvlqzo.supabase.co/functions/v1/xtream-extractor`.

## إعداد GitHub Pages

تمت إضافة Workflow في `.github/workflows/deploy-pages.yml` لنشر مجلد `public` تلقائياً عند كل تحديث إلى فرع `main`.

إذا لم يكن GitHub Pages مفعّلاً بعد:
1. افتح إعدادات المستودع Settings.
2. افتح Pages.
3. من Build and deployment اختر GitHub Actions.
4. انتظر انتهاء Workflow باسم Deploy VELNIX EXTRACTOR to GitHub Pages.

رابط الموقع المتوقع: https://2iq2.github.io/VELNIX-EXTRACTOR/

## الوظيفة

- فحص اتصال Xtream API.
- قراءة تصنيفات وقنوات Live.
- تصفية وبحث محلي.
- تصدير M3U وM3U8 وTXT وCSV وJSON.
- استيراد ملفات M3U/M3U8 محلياً.
- تنزيل قائمة M3U من مزوّد الخدمة.

## الخصوصية والأمان

- لا تُحفظ بيانات الاشتراك في قاعدة بيانات التطبيق.
- لا تضع بيانات الدخول داخل رابط السيرفر؛ أدخلها في الحقول المخصصة.
- الوظيفة تقبل فقط طلبات من أصل GitHub Pages المحدد، وتطبّق تحديداً مؤقتاً للطلبات، وتمنع عناوين IP المباشرة والنطاقات الداخلية والتحويلات، وتضع حدوداً للوقت وحجم الرد.
- فحوص DNS حماية أولية وليست ضماناً كاملاً ضد DNS rebinding؛ لا تستخدم الخدمة مع عناوين مزوّد غير موثوقة.
- روابط البث وملفات التصدير قد تحتوي بيانات اشتراكك. احتفظ بها بشكل خاص.
- استخدم فقط اشتراكات وخوادم لديك تصريح باستخدامها. لا تتجاوز DRM أو قيود المزوّد.

## ملاحظات تقنية

- Supabase Edge Function تعمل على Deno، وليست خادم Express دائم.
- لا يحتاج المتصفح إلى مفتاح Supabase السري؛ المفتاح المستخدم في الواجهة هو publishable key فقط.
