from supabase import create_client, Client
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class Database:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.client: Client = create_client(supabase_url, supabase_key)
    
    # =====================
    # Template Operations
    # =====================
    
    def get_templates(self, user_id: str) -> List[Dict]:
        """Get all templates for a user"""
        response = self.client.table('message_templates')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('updated_at', desc=True)\
            .execute()
        return response.data
    
    def get_template(self, template_id: str) -> Optional[Dict]:
        """Get a single template"""
        response = self.client.table('message_templates')\
            .select('*')\
            .eq('id', template_id)\
            .execute()
        return response.data[0] if response.data else None
    
    def create_template(self, user_id: str, title: str, body: str) -> Dict:
        """Create a new template"""
        response = self.client.table('message_templates')\
            .insert({
                'title': title.strip(),
                'body': body.strip(),
                'user_id': user_id
            })\
            .execute()
        return response.data[0]
    
    def update_template(self, template_id: str, title: str, body: str) -> Dict:
        """Update a template"""
        response = self.client.table('message_templates')\
            .update({
                'title': title.strip(),
                'body': body.strip(),
                'updated_at': datetime.utcnow().isoformat()
            })\
            .eq('id', template_id)\
            .execute()
        return response.data[0]
    
    def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        response = self.client.table('message_templates')\
            .delete()\
            .eq('id', template_id)\
            .execute()
        return len(response.data) > 0
    
    # =====================
    # Campaign Operations
    # =====================
    
    def create_campaign(self, user_id: str, name: str, template_id: str, 
                        connection_id: str, total_recipients: int) -> Dict:
        """Create a new campaign"""
        response = self.client.table('campaigns')\
            .insert({
                'name': name.strip(),
                'template_id': template_id,
                'connection_id': connection_id,
                'status': 'draft',
                'total_recipients': total_recipients,
                'user_id': user_id
            })\
            .execute()
        return response.data[0]
    
    def update_campaign_status(self, campaign_id: str, status: str,
                               sent_count: int = 0, failed_count: int = 0) -> Dict:
        """Update campaign status"""
        response = self.client.table('campaigns')\
            .update({
                'status': status,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'updated_at': datetime.utcnow().isoformat()
            })\
            .eq('id', campaign_id)\
            .execute()
        return response.data[0]
    
    def get_campaign(self, campaign_id: str) -> Optional[Dict]:
        """Get a single campaign"""
        response = self.client.table('campaigns')\
            .select('*')\
            .eq('id', campaign_id)\
            .execute()
        return response.data[0] if response.data else None
    
    def get_user_campaigns(self, user_id: str) -> List[Dict]:
        """Get all campaigns for a user"""
        response = self.client.table('campaigns')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .execute()
        return response.data
    
    # =====================
    # Recipient Operations
    # =====================
    
    def add_recipients(self, campaign_id: str, recipients: List[Dict]) -> List[Dict]:
        """Add recipients to a campaign"""
        rows = [{
            'campaign_id': campaign_id,
            'subscriber_email': r.get('email', ''),
            'subscriber_name': r.get('name', ''),
            'status': 'pending'
        } for r in recipients]
        
        response = self.client.table('campaign_recipients')\
            .insert(rows)\
            .execute()
        return response.data
    
    def update_recipient_status(self, recipient_id: str, status: str,
                                error_message: str = None) -> Dict:
        """Update recipient status"""
        update_data = {'status': status}
        if status == 'sent':
            update_data['sent_at'] = datetime.utcnow().isoformat()
        if error_message:
            update_data['error_message'] = error_message
        
        response = self.client.table('campaign_recipients')\
            .update(update_data)\
            .eq('id', recipient_id)\
            .execute()
        return response.data[0]
    
    def get_recipients(self, campaign_id: str) -> List[Dict]:
        """Get all recipients for a campaign"""
        response = self.client.table('campaign_recipients')\
            .select('*')\
            .eq('campaign_id', campaign_id)\
            .execute()
        return response.data
    
    # =====================
    # Gateway Operations
    # =====================
    
    def get_connections(self, user_id: str) -> List[Dict]:
        """Get all gateway connections for a user"""
        response = self.client.table('gateway_connections')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .execute()
        return response.data
    
    def get_connection(self, connection_id: str) -> Optional[Dict]:
        """Get a single connection"""
        response = self.client.table('gateway_connections')\
            .select('*')\
            .eq('id', connection_id)\
            .execute()
        return response.data[0] if response.data else None
    
    def get_settings(self, user_id: str) -> Optional[Dict]:
        """Get user settings"""
        response = self.client.table('gateway_settings')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
        return response.data[0] if response.data else None
    
    def update_settings(self, user_id: str, batch_size: int = 50, 
                        max_retries: int = 3) -> Dict:
        """Update user settings"""
        # Check if settings exist
        existing = self.get_settings(user_id)
        
        if existing:
            response = self.client.table('gateway_settings')\
                .update({
                    'batch_size': batch_size,
                    'max_retries': max_retries,
                    'updated_at': datetime.utcnow().isoformat()
                })\
                .eq('user_id', user_id)\
                .execute()
        else:
            response = self.client.table('gateway_settings')\
                .insert({
                    'user_id': user_id,
                    'batch_size': batch_size,
                    'max_retries': max_retries
                })\
                .execute()
        
        return response.data[0]