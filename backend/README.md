# Hudhud Backend - Python API

Backend API مبني بـ Python (FastAPI) لإدارة نظام قوالب الرسائل والذكاء الاصطناعي.

## المتطلبات

- Python 3.14+
- Supabase Project

## التثبيت

```bash
cd backend
pip install -r requirements.txt
```

## تشغيل السيرفر

```bash
python run.py
```

أو:

```bash
uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
```

## الهيكل

```
backend/
├── api/
│   └── main.py          # API endpoints
├── ai/
│   └── engine.py        # Smart AI Engine
├── models/
│   ├── database.py      # Supabase Database
│   └── schemas.py       # Pydantic Models
├── services/
│   ├── document_parser.py  # CSV/Excel Parser
│   └── message_service.py  # Message Service
├── config.py            # Configuration
├── requirements.txt     # Dependencies
└── run.py              # Server Runner
```

## الـ API Endpoints

### المستندات
- `POST /api/v1/documents/parse` - تحليل ملف (CSV/Excel)

### القوالب
- `GET /api/v1/templates` - جلب القوالب
- `POST /api/v1/templates` - إنشاء قالب
- `PUT /api/v1/templates/{id}` - تحديث قالب
- `DELETE /api/v1/templates/{id}` - حذف قالب
- `GET /api/v1/templates/default/list` - القوالب الافتراضية

### الذكاء الاصطناعي
- `POST /api/v1/ai/suggest-template` - اقتراح قالب
- `POST /api/v1/ai/auto-link` - ربط تلقائي للمتغيرات
- `POST /api/v1/ai/analyze-messages` - تحليل الرسائل

### الحملات
- `GET /api/v1/campaigns` - جلب الحملات
- `POST /api/v1/campaigns/prepare` - تجهيز الحملة
- `POST /api/v1/campaigns/{id}/send` - إرسال الحملة

## القوالب الافتراضية

1. **ترحيب بالعميل**: `مرحباً {{الاسم}}، شكراً لانضمامك!`
2. **تأكيد الطلب**: `عزيزي {{الاسم}}، تم تأكيد طلبك رقم {{رقم_الطلب}}. المبلغ: {{المبلغ}}`
3. **إشعار بالدفع**: `{{الاسم}}، مبلغ {{المبلغ}} مستحق. التاريخ: {{تاريخ_الاستحقاق}}`
4. **تذكير بالموعد**: `تذكير: موعدك يوم {{التاريخ}} الساعة {{الوقت}}`
5. **شكراً**: `شكراً لثقتكم بنا {{الاسم}}!`
6. **إشعار بالشحن**: `{{الاسم}}، تم شحن طلبك رقم {{رقم_الطلب}}. رقم التتبع: {{رقم_التتبع}}`
7. **تأكيد الدفع**: `عزيزي {{الاسم}}، تم استلام مبلغ {{المبلغ}} ريال.`

## محرك الذكاء الاصطناعي

- **ColumnAutoDetect**: اكتشاف تلقائي للأعمدة
- **TemplateAutoSuggest**: اقتراح القالب المناسب
- **VariableAutoLink**: ربط المتغيرات تلقائياً
- **MessageSmartAnalysis**: تحليل واكتشاف المشاكل
- **SmartWarnings**: تحذيرات استباقية

## التوثيق

افتح: http://localhost:8000/docs