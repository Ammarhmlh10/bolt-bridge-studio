# واجهة الخادم لتطبيق الجوال — هدهد الفواتير (v1)

الخادم يعالج المستندات ويجهّز الرسائل من قوالب المستخدم، ثم يعيدها لتطبيق الجوال.
تطبيق الجوال هو من يرسل الرسائل عبر بوابة الاتصالات المربوطة عليه، ثم يبلغ الخادم بالنتيجة.

- العنوان الأساسي: `https://<نطاق-التطبيق>/api/public/v1`
- المصادقة: سجّل الدخول في التطبيق بنفس حساب Lovable Cloud (البريد وكلمة المرور) عبر `supabase-js`،
  ثم أرسل `Authorization: Bearer <access_token>` مع كل طلب.
- كل الأخطاء بالشكل: `{ "error": { "code": "...", "message": "رسالة عربية" } }`

## الحدود

| البند | القيمة |
| --- | --- |
| أنواع الملفات | CSV، Excel (`.xlsx`/`.xls`)، PDF |
| أقصى حجم ملف | 5 ميغابايت |
| أقصى عدد رسائل في الدفعة | 2000 |
| أقصى عدد نتائج في طلب تقرير واحد | 500 |

## المتغيرات في القوالب

تُكتب بالشكل `{{name}}` أو `{{الاسم}}`. لكل صف تتوفر:

- كل عمود باسمه (المسافات تتحول إلى `_`)، مثل `{{رقم_العضوية}}`.
- الحقول القياسية المكتشفة تلقائياً من عناوين الأعمدة (عربي أو إنجليزي):
  `name`/`الاسم`، `phone`/`الجوال`، `email`/`البريد`، `amount`/`المبلغ`،
  `invoice_number`/`رقم_الفاتورة`، `due_date`/`تاريخ_الاستحقاق`.
- أرقام الجوال تُوحَّد بصيغة دولية (`05XXXXXXXX` ← `+9665XXXXXXXX`). الصف بلا رقم صالح يُعلَّم `skipped`.

## النقاط

### `GET /health`
بدون مصادقة. `{ "ok": true }`

### `GET /templates`
قوالب المستخدم مع المتغيرات المستخدمة في كل قالب.

### `POST /documents/parse` (معاينة، لا يحفظ شيئاً)
`multipart/form-data` بالحقل `file`. يعيد `columns` و `records` و `detected_fields`.

### `POST /batches` — تجهيز دفعة رسائل
إما `multipart/form-data` بالحقلين `file` و `template_id`،
أو JSON إذا كانت البيانات عندك في التطبيق:

```json
{ "template_id": "uuid", "source_name": "عملاء نوفمبر", "records": [{ "name": "أحمد", "phone": "0551234567", "amount": 150 }] }
```

الرد (201):

```json
{
  "batch": { "id": "uuid", "status": "ready", "total_count": 3, "ready_count": 2, "skipped_count": 1, "...": "..." },
  "messages": [{ "id": "uuid", "position": 1, "recipient_name": "أحمد", "phone": "+966551234567", "body": "نص الرسالة", "status": "pending", "error": null }],
  "missing_variables": []
}
```

### `GET /batches`
آخر 50 دفعة.

### `GET /batches/{id}?status=pending`
الدفعة ورسائلها. `status` اختياري: `pending` | `sent` | `failed` | `skipped`.

### `POST /batches/{id}/report` — إبلاغ نتيجة الإرسال من الجوال

```json
{ "results": [{ "id": "message-uuid", "status": "sent" }, { "id": "message-uuid", "status": "failed", "error": "Gateway timeout" }] }
```

`status` يقبل `sent` أو `failed` أو `pending` (لإعادة المحاولة). يعيد `updated` و `ignored` والدفعة بعد تحديث العدادات.
تصبح الدفعة `completed` عندما لا تبقى رسائل `pending`.

### `DELETE /batches/{id}`
حذف الدفعة ورسائلها.

## التسلسل المقترح في تطبيق الجوال

1. `GET /templates` لعرض القوالب.
2. المستخدم يختار ملفاً وقالباً ← `POST /batches`.
3. `GET /batches/{id}?status=pending` ← أرسل كل رسالة عبر البوابة المربوطة على الجوال.
4. بعد كل مجموعة رسائل ← `POST /batches/{id}/report`.
