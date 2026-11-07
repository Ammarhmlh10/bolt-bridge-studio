"""
Message Service
Handles message preparation and sending via gateway
"""

import httpx
from typing import List, Dict, Optional
from datetime import datetime

from backend.models.database import Database
from backend.ai.engine import (
    SmartAnalysisEngine,
    prepare_messages,
    extract_variables,
    check_phone_valid
)


class MessageService:
    """Service for preparing and sending messages"""
    
    def __init__(self, db: Database):
        self.db = db
        self.ai_engine = SmartAnalysisEngine()
    
    async def prepare_campaign(
        self,
        user_id: str,
        template_id: str,
        connection_id: str,
        campaign_name: str,
        records: List[Dict],
        column_mapping: Dict[str, str],
        phone_column: str,
        name_column: Optional[str] = None
    ) -> Dict:
        """
        Prepare messages from template and records
        """
        # Get template
        template = self.db.get_template(template_id)
        if not template:
            raise ValueError("القالب غير موجود")
        
        # Get connection
        connection = self.db.get_connection(connection_id)
        if not connection:
            raise ValueError("الاتصال غير موجود")
        
        # Get settings
        settings = self.db.get_settings(user_id)
        batch_size = settings.get("batch_size", 50) if settings else 50
        
        # Prepare messages
        messages = prepare_messages(
            template_body=template["body"],
            records=records,
            column_mapping=column_mapping,
            phone_column=phone_column,
            name_column=name_column
        )
        
        # Analyze messages
        analysis = self.ai_engine.analyze_messages(messages)
        
        # Filter valid messages
        valid_messages = [m for m in messages if m["status"] == "pending"]
        
        # Create campaign
        campaign = self.db.create_campaign(
            user_id=user_id,
            name=campaign_name,
            template_id=template_id,
            connection_id=connection_id,
            total_recipients=len(valid_messages)
        )
        
        # Add recipients
        if valid_messages:
            recipients = [
                {
                    "email": msg.get("phone", ""),  # Use phone as identifier
                    "name": msg.get("recipient_name", "")
                }
                for msg in valid_messages
            ]
            self.db.add_recipients(campaign["id"], recipients)
        
        return {
            "campaign_id": campaign["id"],
            "total_count": len(messages),
            "valid_count": len(valid_messages),
            "error_count": analysis["errors"],
            "messages": messages,
            "missing_variables": list(set(
                var for msg in messages 
                if "{{" in msg["body"] 
                for var in extract_variables(msg["body"])
            ))
        }
    
    async def send_campaign(
        self,
        campaign_id: str,
        user_id: str,
        batch_size: int = 50,
        max_retries: int = 3
    ) -> Dict:
        """
        Send campaign messages via gateway
        """
        # Get campaign
        campaign = self.db.get_campaign(campaign_id)
        if not campaign:
            raise ValueError("الحملة غير موجودة")
        
        # Get connection
        connection = self.db.get_connection(campaign["connection_id"])
        if not connection:
            raise ValueError("الاتصال غير موجود")
        
        # Get template
        template = self.db.get_template(campaign["template_id"])
        
        # Get recipients
        recipients = self.db.get_recipients(campaign_id)
        pending_recipients = [r for r in recipients if r["status"] == "pending"]
        
        if not pending_recipients:
            return {
                "campaign_id": campaign_id,
                "message": "لا توجد رسائل معلقة",
                "sent": 0,
                "failed": 0
            }
        
        # Update campaign status
        self.db.update_campaign_status(campaign_id, "sending")
        
        # Prepare gateway URL
        gateway_url = connection["endpoint_url"]
        api_key = connection["api_key"]
        sender_name = connection["sender_name"]
        
        # Send messages in batches
        sent_count = 0
        failed_count = 0
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(pending_recipients), batch_size):
                batch = pending_recipients[i:i + batch_size]
                
                # Prepare batch payload
                messages_payload = []
                for recipient in batch:
                    body = template["body"] if template else "رسالة تجريبية"
                    
                    messages_payload.append({
                        "to": recipient["subscriber_email"],  # Phone
                        "message": body,
                        "sender": sender_name
                    })
                
                # Send batch
                try:
                    response = await client.post(
                        gateway_url,
                        json={"messages": messages_payload},
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if response.status_code == 200:
                        sent_count += len(batch)
                        # Update recipients status
                        for recipient in batch:
                            self.db.update_recipient_status(
                                recipient["id"], 
                                "sent"
                            )
                    else:
                        failed_count += len(batch)
                        for recipient in batch:
                            self.db.update_recipient_status(
                                recipient["id"],
                                "failed",
                                f"HTTP {response.status_code}"
                            )
                
                except Exception as e:
                    failed_count += len(batch)
                    for recipient in batch:
                        self.db.update_recipient_status(
                            recipient["id"],
                            "failed",
                            str(e)
                        )
                
                # Update campaign progress
                self.db.update_campaign_status(
                    campaign_id,
                    "sending",
                    sent_count,
                    failed_count
                )
        
        # Final status update
        final_status = "completed" if failed_count == 0 else "failed"
        self.db.update_campaign_status(
            campaign_id,
            final_status,
            sent_count,
            failed_count
        )
        
        return {
            "campaign_id": campaign_id,
            "status": final_status,
            "total": len(pending_recipients),
            "sent": sent_count,
            "failed": failed_count
        }
    
    def get_campaign_status(self, campaign_id: str) -> Dict:
        """Get campaign status and details"""
        campaign = self.db.get_campaign(campaign_id)
        if not campaign:
            raise ValueError("الحملة غير موجودة")
        
        recipients = self.db.get_recipients(campaign_id)
        
        return {
            "campaign": campaign,
            "recipients": {
                "total": len(recipients),
                "pending": sum(1 for r in recipients if r["status"] == "pending"),
                "sent": sum(1 for r in recipients if r["status"] == "sent"),
                "failed": sum(1 for r in recipients if r["status"] == "failed")
            }
        }