"""
Main API Router
FastAPI endpoints for the backend
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
from datetime import datetime

from backend.config import settings
from backend.models.database import Database
from backend.models.schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    MessagePrepareResponse, ApiResponse,
    CampaignResponse, CampaignCreate
)
from backend.services.document_parser import DocumentParser
from backend.services.message_service import MessageService
from backend.ai.engine import SmartAnalysisEngine
from supabase import create_client


# =====================
# App Setup
# =====================

app = FastAPI(
    title="Hudhud API",
    description="Backend API for Hudhud Message Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client for JWT verification
supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Initialize services
db = Database(settings.supabase_url, settings.supabase_anon_key)
# Use anon key as fallback if service role key is not available
service_key = settings.supabase_service_role_key or settings.supabase_anon_key
db_service = Database(settings.supabase_url, service_key)
parser = DocumentParser()
message_service = MessageService(db_service)
ai_engine = SmartAnalysisEngine(settings.ai_confidence_threshold)


# =====================
# Dependencies
# =====================

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header (JWT validation)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Verify the token with Supabase
        user = supabase_client.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return user.user.id
    except HTTPException:
        raise
    except Exception as e:
        # For other errors, return a test user_id for development
        if settings.debug:
            return "00000000-0000-0000-0000-000000000001"
        raise HTTPException(status_code=401, detail="Invalid authentication token")


# =====================
# Health Check
# =====================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# =====================
# Document Endpoints
# =====================

@app.post("/api/v1/documents/parse")
async def parse_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Parse uploaded document (CSV/Excel) and detect columns
    """
    try:
        parsed_doc = await parser.parse_file(file)
        analysis = parser.analyze_document(parsed_doc)
        
        return {
            "success": True,
            "message": "تم تحليل الملف بنجاح",
            "data": analysis
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في الخادم: {str(e)}")


# =====================
# Template Endpoints
# =====================

@app.get("/api/v1/templates")
async def get_templates(user_id: str = Depends(get_current_user)):
    """Get all templates for user"""
    templates = db.get_templates(user_id)
    return {
        "success": True,
        "data": templates
    }


@app.get("/api/v1/templates/{template_id}")
async def get_template(template_id: str, user_id: str = Depends(get_current_user)):
    """Get a single template"""
    template = db.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="القالب غير موجود")
    return {
        "success": True,
        "data": template
    }


@app.post("/api/v1/templates")
async def create_template(
    template: TemplateCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new template"""
    try:
        new_template = db.create_template(
            user_id=user_id,
            title=template.title,
            body=template.body
        )
        return {
            "success": True,
            "message": "تم إنشاء القالب بنجاح",
            "data": new_template
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/templates/{template_id}")
async def update_template(
    template_id: str,
    template: TemplateUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a template"""
    try:
        updated = db.update_template(
            template_id=template_id,
            title=template.title,
            body=template.body
        )
        return {
            "success": True,
            "message": "تم تحديث القالب بنجاح",
            "data": updated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/templates/{template_id}")
async def delete_template(
    template_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a template"""
    try:
        db.delete_template(template_id)
        return {
            "success": True,
            "message": "تم حذف القالب بنجاح"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/templates/{template_id}/variables")
async def get_template_variables(template_id: str):
    """Extract variables from a template"""
    template = db.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="القالب غير موجود")
    
    from backend.ai.engine import extract_variables
    variables = extract_variables(template["body"])
    
    return {
        "success": True,
        "data": {
            "template_id": template_id,
            "variables": variables
        }
    }


# =====================
# Smart AI Endpoints
# =====================

@app.post("/api/v1/ai/suggest-template")
async def suggest_template(
    columns: List[str],
    records: List[Dict],
    user_id: str = Depends(get_current_user)
):
    """Suggest best template based on document columns"""
    # Analyze columns
    column_analysis = ai_engine.detect_columns(columns, records)
    
    # Get user templates
    templates = db.get_templates(user_id)
    
    # Get default templates
    default_templates = [
        {"id": "default_1", "title": "ترحيب بالعميل", "body": "مرحباً {{الاسم}}، شكراً لانضمامك!"},
        {"id": "default_2", "title": "تأكيد الطلب", "body": "عزيزي {{الاسم}}، تم تأكيد طلبك. المبلغ: {{المبلغ}}"},
        {"id": "default_3", "title": "إشعار بالدفع", "body": "{{الاسم}}، مبلغ {{المبلغ}} مستحق. التاريخ: {{تاريخ_الاستحقاق}}"},
    ]
    
    all_templates = templates + default_templates
    
    # Get suggestions
    suggestions = ai_engine.suggest_template(column_analysis, all_templates)
    
    return {
        "success": True,
        "data": {
            "suggestions": [
                {
                    "template_id": s.template_id,
                    "template_title": s.template_title,
                    "match_score": s.match_score,
                    "variables_matched": s.variables_matched,
                    "variables_missing": s.variables_missing
                }
                for s in suggestions
            ]
        }
    }


@app.post("/api/v1/ai/auto-link")
async def auto_link_variables(
    template_body: str,
    columns: List[str],
    records: List[Dict]
):
    """Auto-link template variables to document columns"""
    # Analyze columns
    column_analysis = ai_engine.detect_columns(columns, records)
    
    # Get links
    links = ai_engine.auto_link_variables(template_body, column_analysis)
    
    return {
        "success": True,
        "data": {
            "links": [
                {
                    "variable": link.variable,
                    "column": link.suggested_column,
                    "confidence": link.confidence
                }
                for link in links
            ]
        }
    }


@app.post("/api/v1/ai/analyze-messages")
async def analyze_messages(messages: List[Dict]):
    """Analyze prepared messages for issues"""
    analysis = ai_engine.analyze_messages(messages)
    warnings = ai_engine.generate_warnings(messages, "campaign")
    
    return {
        "success": True,
        "data": {
            "analysis": analysis,
            "warnings": warnings
        }
    }


# =====================
# Campaign Endpoints
# =====================

@app.get("/api/v1/campaigns")
async def get_campaigns(user_id: str = Depends(get_current_user)):
    """Get all campaigns for user"""
    campaigns = db.get_user_campaigns(user_id)
    return {
        "success": True,
        "data": campaigns
    }


@app.get("/api/v1/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user_id: str = Depends(get_current_user)):
    """Get campaign details"""
    status = message_service.get_campaign_status(campaign_id)
    return {
        "success": True,
        "data": status
    }


@app.post("/api/v1/campaigns/prepare")
async def prepare_campaign(
    template_id: str,
    connection_id: str,
    campaign_name: str,
    records: List[Dict],
    column_mapping: Dict[str, str],
    phone_column: str,
    name_column: str = None,
    user_id: str = Depends(get_current_user)
):
    """Prepare messages for a campaign"""
    try:
        result = await message_service.prepare_campaign(
            user_id=user_id,
            template_id=template_id,
            connection_id=connection_id,
            campaign_name=campaign_name,
            records=records,
            column_mapping=column_mapping,
            phone_column=phone_column,
            name_column=name_column
        )
        
        return {
            "success": True,
            "message": "تم تجهيز الرسائل بنجاح",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    batch_size: int = 50,
    max_retries: int = 3,
    user_id: str = Depends(get_current_user)
):
    """Send campaign messages"""
    try:
        result = await message_service.send_campaign(
            campaign_id=campaign_id,
            user_id=user_id,
            batch_size=batch_size,
            max_retries=max_retries
        )
        
        return {
            "success": True,
            "message": "تم إرسال الحملة بنجاح",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# Connection Endpoints
# =====================

@app.get("/api/v1/connections")
async def get_connections(user_id: str = Depends(get_current_user)):
    """Get all gateway connections"""
    connections = db.get_connections(user_id)
    return {
        "success": True,
        "data": connections
    }


# =====================
# Settings Endpoints
# =====================

@app.get("/api/v1/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    """Get user settings"""
    settings_data = db.get_settings(user_id)
    return {
        "success": True,
        "data": settings_data or {"batch_size": 50, "max_retries": 3}
    }


# =====================
# Default Templates
# =====================

DEFAULT_TEMPLATES = [
    {
        "title": "ترحيب بالعميل",
        "body": "مرحباً {{الاسم}}، شكراً لانضمامك إلى خدماتنا! 我们很高兴为您提供服务。"
    },
    {
        "title": "تأكيد الطلب",
        "body": "عزيزي {{الاسم}}، تم تأكيد طلبك رقم {{رقم_الطلب}}. المبلغ المستحق: {{المبلغ}} ريال."
    },
    {
        "title": "إشعار بالدفع",
        "body": "أ{{الاسم}}، مبلغ {{المبلغ}} ريال مستحق. تاريخ الاستحقاق: {{تاريخ_الاستحقاق}}. يرجى السداد في الموعد المحدد."
    },
    {
        "title": "تذكير بالموعد",
        "body": "تذكير: موعدك يوم {{التاريخ}} الساعة {{الوقت}}. نرجو الحضور في الوقت المحدد."
    },
    {
        "title": "شكراً після покупки",
        "body": "شكراً لثقتكم بنا {{الاسم}}! نقدر تواصلكم دائماً.，期待再次为您服务。"
    },
    {
        "title": "إشعار بالشحن",
        "body": "{{الاسم}}، تم شحن طلبك رقم {{رقم_الطلب}}. رقم التتبع: {{رقم_التتبع}}"
    },
    {
        "title": "تأكيد الدفع",
        "body": "عزيزي {{الاسم}}، تم استلام مبلغ {{المبلغ}} ريال. رقم الفاتورة: {{رقم_الفاتورة}}"
    }
]


@app.get("/api/v1/templates/default/list")
async def get_default_templates():
    """Get default templates"""
    return {
        "success": True,
        "data": DEFAULT_TEMPLATES
    }


# =====================
# Run Server
# =====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )