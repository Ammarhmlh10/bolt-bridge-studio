"""
Smart AI Engine - On-Device AI for Message Preparation
Arabic RTL support with local processing
"""

import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


# =====================
# Constants
# =====================

ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

PHONE_PATTERNS = [
    r'^\+?[0-9]{7,15}$',
    r'^00[0-9]{7,15}$',
    r'^0[0-9]{7,12}$',
    r'^966[0-9]{9}$',
    r'^20[0-9]{8,11}$',
]

EMAIL_PATTERN = r'^[\w\.-]+@[\w\.-]+\.\w+$'

# Column name mappings (Arabic -> English and vice versa)
FIELD_ALIASES = {
    "name": ["name", "full name", "customer", "client", "الاسم", "اسم العميل", "العميل", "المشترك", "الاسم الكامل"],
    "phone": ["phone", "mobile", "tel", "whatsapp", "الجوال", "رقم الجوال", "الهاتف", "الموبايل", "واتساب"],
    "email": ["email", "mail", "البريد", "البريد الإلكتروني", "الايميل"],
    "amount": ["amount", "total", "price", "المبلغ", "الإجمالي", "القيمة", "المستحق"],
    "invoice_number": ["invoice", "invoice_number", "رقم الفاتورة", "الفاتورة"],
    "due_date": ["due_date", "date", "تاريخ الاستحقاق", "التاريخ"],
}

# Arabic field names
ARABIC_FIELD_NAMES = {
    "name": "الاسم",
    "phone": "الجوال",
    "email": "البريد",
    "amount": "المبلغ",
    "invoice_number": "رقم_الفاتورة",
    "due_date": "تاريخ_الاستحقاق",
}


# =====================
# Data Classes
# =====================

@dataclass
class ColumnAnalysis:
    column_name: str
    detected_type: str  # "phone", "email", "name", "amount", "date", "text", "unknown"
    confidence: float
    sample_values: List[str]
    valid_count: int
    total_count: int


@dataclass
class TemplateSuggestion:
    template_id: str
    template_title: str
    match_score: float
    variables_matched: List[str]
    variables_missing: List[str]


@dataclass
class VariableLink:
    variable: str
    suggested_column: str
    confidence: float


# =====================
# Helper Functions
# =====================

def to_latin_digits(text: str) -> str:
    """Convert Arabic/Persian digits to Latin"""
    result = text
    for i, d in enumerate(ARABIC_DIGITS):
        result = result.replace(d, str(i))
    for i, d in enumerate(PERSIAN_DIGITS):
        result = result.replace(d, str(i))
    return result


def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    return to_latin_digits(text).strip().lower().replace("_", " ").replace("-", " ")


def extract_variables(template_body: str) -> List[str]:
    """Extract variables from template like {{Name}}, {{Amount}}"""
    pattern = r'\{\{\s*(\w+)\s*\}\}'
    matches = re.findall(pattern, template_body)
    return list(set(matches))


def check_phone_valid(phone: str) -> bool:
    """Validate phone number"""
    if not phone:
        return False
    phone = to_latin_digits(phone.strip())
    for pattern in PHONE_PATTERNS:
        if re.match(pattern, phone):
            return True
    return False


def check_email_valid(email: str) -> bool:
    """Validate email"""
    if not email:
        return False
    return bool(re.match(EMAIL_PATTERN, email.strip()))


# =====================
# Smart Analysis Engine
# =====================

class SmartAnalysisEngine:
    """Main AI Engine for document analysis and message preparation"""
    
    def __init__(self, confidence_threshold: float = 0.4):
        self.confidence_threshold = confidence_threshold
    
    def analyze_column(self, column_name: str, values: List[str]) -> ColumnAnalysis:
        """
        Analyze a single column to detect its type
        """
        total = len(values)
        if total == 0:
            return ColumnAnalysis(
                column_name=column_name,
                detected_type="unknown",
                confidence=0.0,
                sample_values=[],
                valid_count=0,
                total_count=0
            )
        
        # Get sample values (first 10 non-empty)
        samples = [v for v in values[:20] if v and v.strip()][:10]
        
        # Detect type based on patterns
        phone_count = sum(1 for v in samples if check_phone_valid(v))
        email_count = sum(1 for v in samples if check_email_valid(v))
        number_count = sum(1 for v in samples if v.replace(".", "").replace(",", "").isdigit())
        
        # Check for name patterns
        name_indicators = ["name", "customer", "client", "الاسم", "عميل", "مشترك"]
        name_count = sum(1 for v in samples if any(ind in normalize_text(v) for ind in name_indicators))
        
        # Check column name for hints
        normalized_name = normalize_text(column_name)
        
        # Calculate confidence scores
        phone_conf = phone_count / len(samples) if samples else 0
        email_conf = email_count / len(samples) if samples else 0
        name_conf = (name_count / len(samples) if samples else 0) + \
                   (0.5 if any(field in normalized_name for field in FIELD_ALIASES["name"]) else 0)
        
        # Determine type
        detected_type = "unknown"
        confidence = 0.0
        
        if phone_conf >= 0.7:
            detected_type = "phone"
            confidence = phone_conf
        elif email_conf >= 0.7:
            detected_type = "email"
            confidence = email_conf
        elif name_conf >= 0.5:
            detected_type = "name"
            confidence = min(name_conf, 1.0)
        elif number_count >= 0.7:
            if "amount" in normalized_name or "price" in normalized_name or "المبلغ" in column_name:
                detected_type = "amount"
            else:
                detected_type = "number"
            confidence = number_count / len(samples)
        elif any(field in normalized_name for field in FIELD_ALIASES["phone"]):
            detected_type = "phone"
            confidence = 0.8
        elif any(field in normalized_name for field in FIELD_ALIASES["email"]):
            detected_type = "email"
            confidence = 0.8
        elif any(field in normalized_name for field in FIELD_ALIASES["name"]):
            detected_type = "name"
            confidence = 0.8
        
        return ColumnAnalysis(
            column_name=column_name,
            detected_type=detected_type,
            confidence=confidence,
            sample_values=samples,
            valid_count=sum(1 for v in values if v and v.strip()),
            total_count=total
        )
    
    def detect_columns(self, columns: List[str], records: List[Dict]) -> Dict[str, ColumnAnalysis]:
        """
        Analyze all columns in a document
        """
        results = {}
        
        for col in columns:
            values = [str(record.get(col, "")) for record in records]
            results[col] = self.analyze_column(col, values)
        
        return results
    
    def suggest_template(self, column_analysis: Dict[str, ColumnAnalysis], 
                        templates: List[Dict]) -> List[TemplateSuggestion]:
        """
        Suggest the best template based on document columns
        """
        suggestions = []
        
        # Get available variables from document
        doc_vars = set()
        for col, analysis in column_analysis.items():
            if analysis.detected_type != "unknown":
                # Add both English and Arabic versions
                for field, aliases in FIELD_ALIASES.items():
                    if analysis.detected_type == field:
                        doc_vars.add(field)
                        if field in ARABIC_FIELD_NAMES:
                            doc_vars.add(ARABIC_FIELD_NAMES[field])
        
        # Score each template
        for template in templates:
            template_vars = set(extract_variables(template.get("body", "")))
            
            matched = doc_vars.intersection(template_vars)
            missing = template_vars - doc_vars
            
            if template_vars:
                score = len(matched) / len(template_vars)
            else:
                score = 0.5  # No variables = 50% match
            
            if score >= self.confidence_threshold:
                suggestions.append(TemplateSuggestion(
                    template_id=template.get("id", ""),
                    template_title=template.get("title", ""),
                    match_score=score,
                    variables_matched=list(matched),
                    variables_missing=list(missing)
                ))
        
        # Sort by score
        suggestions.sort(key=lambda x: x.match_score, reverse=True)
        return suggestions[:5]
    
    def auto_link_variables(self, template_body: str, 
                           column_analysis: Dict[str, ColumnAnalysis]) -> List[VariableLink]:
        """
        Automatically link template variables to document columns
        """
        template_vars = extract_variables(template_body)
        links = []
        
        for var in template_vars:
            best_match = None
            best_confidence = 0.0
            
            var_lower = var.lower().replace("_", " ")
            
            for col, analysis in column_analysis.items():
                col_lower = normalize_text(col)
                
                # Direct match
                if var_lower == col_lower:
                    best_match = col
                    best_confidence = 1.0
                    break
                
                # Partial match
                if var_lower in col_lower or col_lower in var_lower:
                    if analysis.confidence > best_confidence:
                        best_match = col
                        best_confidence = analysis.confidence * 0.9
                
                # Type-based match
                for field, aliases in FIELD_ALIASES.items():
                    if var_lower in [a.lower() for a in aliases] and \
                       analysis.detected_type == field:
                        if analysis.confidence > best_confidence:
                            best_match = col
                            best_confidence = analysis.confidence * 0.85
            
            if best_match:
                links.append(VariableLink(
                    variable=var,
                    suggested_column=best_match,
                    confidence=best_confidence
                ))
        
        return links
    
    def analyze_messages(self, messages: List[Dict]) -> Dict:
        """
        Analyze prepared messages and detect issues
        """
        issues = []
        valid_count = 0
        
        for idx, msg in enumerate(messages):
            row_issues = []
            
            # Check phone validity
            if not check_phone_valid(msg.get("phone", "")):
                row_issues.append({
                    "type": "invalid_phone",
                    "message": "رقم الهاتف غير صالح",
                    "value": msg.get("phone", "")
                })
            
            # Check message body
            body = msg.get("body", "")
            if not body or len(body.strip()) < 3:
                row_issues.append({
                    "type": "empty_message",
                    "message": "الرسالة فارغة أو قصيرة جداً"
                })
            
            if len(body) > 600:
                row_issues.append({
                    "type": "long_message",
                    "message": f"الرسالة طويلة جداً ({len(body)} حرف)",
                    "length": len(body)
                })
            
            # Check for unreplaced variables
            if "{{" in body and "}}" in body:
                missing_vars = extract_variables(body)
                row_issues.append({
                    "type": "missing_variables",
                    "message": f"متغيرات غير مستبدلة: {', '.join(missing_vars)}",
                    "variables": missing_vars
                })
            
            if row_issues:
                issues.append({
                    "row": idx + 1,
                    "issues": row_issues
                })
            else:
                valid_count += 1
        
        return {
            "total": len(messages),
            "valid": valid_count,
            "errors": len(messages) - valid_count,
            "issues": issues
        }
    
    def generate_warnings(self, messages: List[Dict], campaign_name: str) -> List[Dict]:
        """
        Generate proactive warnings before sending
        """
        warnings = []
        
        # Check total count
        if len(messages) > 1000:
            warnings.append({
                "level": "warning",
                "message": f"الدفعة كبيرة جداً ({len(message)} رسالة). قد تستغرق وقتاً طويلاً."
            })
        
        # Check for duplicates
        phones = [m.get("phone", "") for m in messages if m.get("phone")]
        unique_phones = set(phones)
        if len(phones) != len(unique_phones):
            dup_count = len(phones) - len(unique_phones)
            warnings.append({
                "level": "warning",
                "message": f"توجد {dup_count} أرقام مكررة"
            })
        
        # Check for empty messages
        empty_count = sum(1 for m in messages if not m.get("body", "").strip())
        if empty_count > 0:
            warnings.append({
                "level": "error",
                "message": f"توجد {empty_count} رسائل فارغة"
            })
        
        return warnings


# =====================
# Message Preparation
# =====================

def replace_placeholders(template: str, variables: Dict[str, str]) -> str:
    """Replace {{variable}} with values"""
    for key, value in variables.items():
        template = re.sub(r'\{\{\s*' + key + r'\s*\}\}', value, template)
    return template


def prepare_messages(template_body: str, records: List[Dict],
                     column_mapping: Dict[str, str], phone_column: str,
                     name_column: str = None) -> List[Dict]:
    """
    Prepare messages by replacing template variables with record values
    """
    messages = []
    template_vars = extract_variables(template_body)
    
    for idx, record in enumerate(records):
        # Build variables from mapping
        vars_dict = {}
        for var in template_vars:
            col = column_mapping.get(var)
            if col:
                vars_dict[var] = str(record.get(col, "")).strip()
        
        # Add Arabic field names
        for eng, ar in ARABIC_FIELD_NAMES.items():
            if eng in vars_dict:
                vars_dict[ar] = vars_dict[eng]
        
        # Prepare message
        body = replace_placeholders(template_body, vars_dict)
        phone = to_latin_digits(str(record.get(phone_column, "")).strip())
        name = str(record.get(name_column, "")).strip() if name_column else ""
        
        # Determine status
        status = "pending"
        error = None
        
        if not phone:
            status = "skipped"
            error = "رقم الهاتف غير موجود"
        elif not body or body.strip() == template_body.strip():
            status = "skipped"
            error = "متغيرات غير مستبدلة"
        
        messages.append({
            "position": idx + 1,
            "recipient_name": name,
            "phone": phone,
            "email": record.get("email", ""),
            "body": body,
            "variables": vars_dict,
            "status": status,
            "error": error
        })
    
    return messages