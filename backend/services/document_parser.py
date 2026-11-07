"""
Document Parser Service
Supports: CSV, Excel (XLSX)
"""

import pandas as pd
import io
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from fastapi import UploadFile

from backend.ai.engine import SmartAnalysisEngine, to_latin_digits


@dataclass
class ParsedDocument:
    source_name: str
    source_type: str  # "csv" or "xlsx"
    columns: List[str]
    records: List[Dict]
    row_count: int


class DocumentParser:
    """Parse CSV and Excel files"""
    
    SUPPORTED_TYPES = {
        "text/csv": "csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.ms-excel": "xlsx",
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    MAX_ROWS = 1000
    
    def __init__(self):
        self.ai_engine = SmartAnalysisEngine()
    
    def detect_file_type(self, filename: str, content_type: str) -> Optional[str]:
        """Detect file type from extension and content type"""
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        
        if ext == "csv" or content_type == "text/csv":
            return "csv"
        elif ext in ["xlsx", "xls"] or content_type in self.SUPPORTED_TYPES:
            return "xlsx"
        
        return None
    
    async def parse_file(self, file: UploadFile) -> ParsedDocument:
        """Parse uploaded file"""
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > self.MAX_FILE_SIZE:
            raise ValueError(f"حجم الملف أكبر من {self.MAX_FILE_SIZE // (1024*1024)} ميغابايت")
        
        # Detect file type
        file_type = self.detect_file_type(file.filename, file.content_type)
        if not file_type:
            raise ValueError("نوع الملف غير مدعوم. استخدم CSV أو Excel")
        
        # Parse based on type
        try:
            if file_type == "csv":
                return self._parse_csv(content, file.filename)
            elif file_type == "xlsx":
                return self._parse_excel(content, file.filename)
        except Exception as e:
            raise ValueError(f"تعذر قراءة الملف: {str(e)}")
    
    def _parse_csv(self, content: bytes, filename: str) -> ParsedDocument:
        """Parse CSV file"""
        # Try different encodings
        encodings = ['utf-8-sig', 'utf-8', 'cp1256', 'latin-1']
        
        for encoding in encodings:
            try:
                text = content.decode(encoding)
                df = pd.read_csv(io.StringIO(text))
                break
            except:
                continue
        else:
            raise ValueError("تعذر قراءة ملف CSV")
        
        return self._process_dataframe(df, filename, "csv")
    
    def _parse_excel(self, content: bytes, filename: str) -> ParsedDocument:
        """Parse Excel file"""
        try:
            df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
        except Exception as e:
            raise ValueError(f"تعذر قراءة ملف Excel: {str(e)}")
        
        return self._process_dataframe(df, filename, "xlsx")
    
    def _process_dataframe(self, df: pd.DataFrame, filename: str, 
                          source_type: str) -> ParsedDocument:
        """Process pandas DataFrame"""
        # Clean column names
        df.columns = [str(col).strip() for col in df.columns]
        
        # Remove empty rows
        df = df.dropna(how='all')
        
        # Check row count
        if len(df) > self.MAX_ROWS:
            raise ValueError(f"الملف يحتوي على {len(df)} صفاً، الحد الأقصى {self.MAX_ROWS}")
        
        if len(df) == 0:
            raise ValueError("الملف لا يحتوي على بيانات")
        
        # Convert to records
        records = df.to_dict('records')
        
        # Clean each record
        cleaned_records = []
        for record in records:
            cleaned = {}
            for key, value in record.items():
                if pd.isna(value):
                    cleaned[key] = ""
                elif isinstance(value, (int, float)):
                    cleaned[key] = str(value)
                else:
                    cleaned[key] = str(value).strip()
            cleaned_records.append(cleaned)
        
        return ParsedDocument(
            source_name=filename,
            source_type=source_type,
            columns=list(df.columns),
            records=cleaned_records,
            row_count=len(cleaned_records)
        )
    
    def analyze_document(self, parsed_doc: ParsedDocument) -> Dict:
        """Analyze document columns and suggest mappings"""
        # Analyze columns
        column_analysis = self.ai_engine.detect_columns(
            parsed_doc.columns, 
            parsed_doc.records
        )
        
        # Format results
        detected_fields = []
        for col, analysis in column_analysis.items():
            detected_fields.append({
                "column_name": col,
                "detected_type": analysis.detected_type,
                "confidence": analysis.confidence,
                "sample_values": analysis.sample_values[:3],
                "valid_count": analysis.valid_count,
                "total_count": analysis.total_count
            })
        
        # Suggest phone column
        phone_column = None
        for col, analysis in column_analysis.items():
            if analysis.detected_type == "phone" and analysis.confidence >= 0.7:
                phone_column = col
                break
        
        # Suggest name column
        name_column = None
        for col, analysis in column_analysis.items():
            if analysis.detected_type == "name" and analysis.confidence >= 0.5:
                name_column = col
                break
        
        return {
            "source_name": parsed_doc.source_name,
            "source_type": parsed_doc.source_type,
            "columns": parsed_doc.columns,
            "row_count": parsed_doc.row_count,
            "detected_fields": detected_fields,
            "suggested_phone_column": phone_column,
            "suggested_name_column": name_column,
            "sample_data": parsed_doc.records[:5]
        }