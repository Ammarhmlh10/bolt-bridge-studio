from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    SKIPPED = "skipped"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SENDING = "sending"
    COMPLETED = "completed"
    FAILED = "failed"


# =====================
# Template Schemas
# =====================

class TemplateBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=1000)


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    body: Optional[str] = Field(None, min_length=1, max_length=1000)


class TemplateResponse(TemplateBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =====================
# Document Schemas
# =====================

class ColumnDetection(BaseModel):
    column_name: str
    detected_type: str
    confidence: float


class DocumentParseRequest(BaseModel):
    pass  # File will be sent as form data


class DocumentParseResponse(BaseModel):
    source_name: str
    source_type: str
    columns: List[str]
    row_count: int
    detected_fields: List[ColumnDetection]
    sample_data: List[Dict]


# =====================
# Message Preparation Schemas
# =====================

class VariableMapping(BaseModel):
    variable: str
    column: str
    confidence: float = 1.0


class MessagePrepareRequest(BaseModel):
    template_id: str
    connection_id: str
    campaign_name: str
    column_mapping: Dict[str, str]  # variable -> column name
    phone_column: str
    records: List[Dict]


class PreparedMessage(BaseModel):
    position: int
    recipient_name: str
    phone: str
    email: Optional[str] = None
    body: str
    variables: Dict[str, str]
    status: MessageStatus
    error: Optional[str] = None


class MessagePrepareResponse(BaseModel):
    campaign_id: str
    messages: List[PreparedMessage]
    total_count: int
    valid_count: int
    error_count: int
    missing_variables: List[str]


# =====================
# Campaign Schemas
# =====================

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    template_id: str
    connection_id: str
    total_recipients: int


class CampaignUpdate(BaseModel):
    status: Optional[CampaignStatus] = None
    sent_count: Optional[int] = None
    failed_count: Optional[int] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    template_id: Optional[str]
    connection_id: Optional[str]
    status: CampaignStatus
    total_recipients: int
    sent_count: int
    failed_count: int
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =====================
# Smart AI Schemas
# =====================

class SmartSuggestion(BaseModel):
    type: str  # "template", "column", "mapping"
    value: str
    confidence: float
    reason: str


class SmartAnalysisResult(BaseModel):
    total_rows: int
    valid_rows: int
    issues: List[Dict]
    suggestions: List[SmartSuggestion]


class SmartWarning(BaseModel):
    level: str  # "info", "warning", "error"
    message: str
    affected_rows: List[int]


# =====================
# API Response
# =====================

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict] = None