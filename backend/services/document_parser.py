"""
Document Parser Service
Supports: CSV, Excel (XLSX), PDF
"""

import pandas as pd
import io
import re
import pdfplumber
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from fastapi import UploadFile

from backend.ai.engine import SmartAnalysisEngine, to_latin_digits


@dataclass
class ParsedDocument:
    source_name: str
    source_type: str  # "csv", "xlsx", or "pdf"
    columns: List[str]
    records: List[Dict]
    row_count: int


class DocumentParser:
    """Parse CSV, Excel, and PDF files"""
    
    SUPPORTED_TYPES = {
        "text/csv": "csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.ms-excel": "xlsx",
        "application/pdf": "pdf",
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    MAX_ROWS = 1000
    
    def __init__(self):
        self.ai_engine = SmartAnalysisEngine()
    
    def detect_file_type(self, filename: str, content_type: str, content: bytes = None) -> Optional[str]:
        """Detect file type from extension, content type, and magic bytes"""
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        
        # Check magic bytes first for more accurate detection
        if content and len(content) >= 4:
            magic = content[:4]
            # PDF magic bytes
            if magic[:4] == b'%PDF':
                return "pdf"
            # Excel/XLSX (ZIP-based)
            elif magic == b'PK\x03\x04':
                return "xlsx"
        
        # Then check file extension
        if ext == "pdf" or content_type == "application/pdf":
            return "pdf"
        elif ext == "csv" or content_type == "text/csv":
            return "csv"
        elif ext in ["xlsx", "xls"]:
            return "xlsx"
        
        return None
    
    async def parse_file(self, file: UploadFile) -> ParsedDocument:
        """Parse uploaded file"""
        # Read file content
        content = await file.read()
        
        # Debug: log file info
        print(f"[DEBUG] File: {file.filename}, Content-Type: {file.content_type}")
        
        # Check file size
        if len(content) > self.MAX_FILE_SIZE:
            raise ValueError(f"حجم الملف أكبر من {self.MAX_FILE_SIZE // (1024*1024)} ميغابايت")
        
        # Detect file type from content (magic bytes) as fallback
        file_type = self.detect_file_type(file.filename, file.content_type, content)
        if not file_type:
            raise ValueError("نوع الملف غير مدعوم. استخدم CSV أو Excel أو PDF")
        
        # Parse based on type
        try:
            if file_type == "csv":
                return self._parse_csv(content, file.filename)
            elif file_type == "xlsx":
                return self._parse_excel(content, file.filename)
            elif file_type == "pdf":
                return self._parse_pdf(content, file.filename)
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
    
    def _parse_pdf(self, content: bytes, filename: str) -> ParsedDocument:
        """Parse PDF file - extract tables with proper encoding using PyMuPDF"""
        import fitz  # PyMuPDF
        
        try:
            all_rows = []
            
            # Open with PyMuPDF
            with fitz.open("pdf", content) as pdf:
                for page_num, page in enumerate(pdf):
                    # Extract tables using page.find_tables()
                    try:
                        tables = page.find_tables()
                        for table in tables:
                            if table.extract():
                                extracted = table.extract()
                                if extracted:
                                    all_rows.extend(extracted)
                    except Exception:
                        # If find_tables fails, try text extraction
                        pass
                    
                    # Also try to extract text as fallback
                    if not all_rows:
                        text = page.get_text("text")
                        if text.strip():
                            lines = text.strip().split('\n')
                            # Try to parse as table-like structure
                            for line in lines:
                                if line.strip():
                                    # Split by multiple spaces or tabs
                                    parts = line.split()
                                    if len(parts) > 1:
                                        all_rows.append(parts)
            
            if not all_rows:
                raise ValueError("لم يتم العثور على بيانات في ملف PDF")
            
            # Find the best header row (first row with most cells)
            header_row_idx = 0
            max_cols = 0
            for i, row in enumerate(all_rows[:10]):  # Check first 10 rows
                valid_cells = sum(1 for cell in row if cell and str(cell).strip())
                if valid_cells > max_cols:
                    max_cols = valid_cells
                    header_row_idx = i
            
            # Extract headers and data
            headers = all_rows[header_row_idx]
            data = all_rows[header_row_idx + 1:]
            
            # Filter out empty rows
            data = [row for row in data if any(cell and str(cell).strip() for cell in row)]
            
            # Ensure all rows have same number of columns
            num_cols = len(headers)
            data = [row[:num_cols] + [''] * (num_cols - len(row)) if len(row) >= num_cols else row for row in data]
            
            # Clean headers
            cleaned_headers = []
            for i, header in enumerate(headers):
                if header and str(header).strip():
                    header_str = str(header).strip()
                    # Remove newlines and clean up
                    header_str = ' '.join(header_str.split())
                    cleaned_headers.append(header_str if header_str else f"عمود_{i+1}")
                else:
                    cleaned_headers.append(f"عمود_{i+1}")
            
            # Create DataFrame
            df = pd.DataFrame(data, columns=cleaned_headers)
                
            return self._process_dataframe(df, filename, "pdf")
        
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"تعذر قراءة ملف PDF: {str(e)}")
            
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"تعذر قراءة ملف PDF: {str(e)}")
    
    def _clean_column_name(self, name: str) -> str:
        """Clean column names - keep as UTF-8 for frontend to display properly"""
        if not name:
            return "unnamed"
        
        # Just clean the name - keep UTF-8 for correct display in frontend
        # Don't apply reshaping here - let frontend handle display
        name = name.replace('\n', ' ').replace('\r', '').strip()
        name = ' '.join(name.split())
        
        # Limit length
        if len(name) > 100:
            name = name[:100] + '...'
        
        return name if name else "unnamed"
    
    def _parse_text_as_csv(self, text: str, filename: str) -> ParsedDocument:
        """Parse text as CSV-like format for PDFs without tables"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if len(lines) < 2:
            raise ValueError("الملف لا يحتوي على بيانات كافية")
        
        # Try to detect delimiter (tab, comma, etc.)
        delimiters = [',', '\t', ';', '|']
        best_delimiter = ','
        max_cols = 0
        
        for delim in delimiters:
            first_line_cols = len(lines[0].split(delim))
            if first_line_cols > max_cols:
                max_cols = first_line_cols
                best_delimiter = delim
        
        # Parse headers
        headers = [h.strip() for h in lines[0].split(best_delimiter)]
        
        # Parse data rows
        records = []
        for line in lines[1:]:
            values = [v.strip() for v in line.split(best_delimiter)]
            if len(values) == len(headers):
                record = dict(zip(headers, values))
                records.append(record)
        
        if not records:
            raise ValueError("لم يتم العثور على بيانات صالحة في الملف")
        
        return ParsedDocument(
            source_name=filename,
            source_type="pdf",
            columns=headers,
            records=records,
            row_count=len(records)
        )
    
    def _process_dataframe(self, df: pd.DataFrame, filename: str, 
                          source_type: str) -> ParsedDocument:
        """Process pandas DataFrame"""
        # Clean column names using Arabic reshaping
        df.columns = [self._clean_column_name(str(col)) for col in df.columns]
        
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