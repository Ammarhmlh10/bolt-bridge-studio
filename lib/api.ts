/**
 * API Client for SmartHoop Backend
 */

const API_BASE_URL = 'http://localhost:8000';

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type DocumentAnalysisResult = {
  source_name: string;
  source_type: string;
  columns: string[];
  row_count: number;
  detected_fields: Array<{
    column_name: string;
    detected_type: string;
    confidence: number;
    sample_values: string[];
    valid_count: number;
    total_count: number;
  }>;
  suggested_phone_column: string | null;
  suggested_name_column: string | null;
  sample_data: Record<string, string>[];
};

export type VariableMapping = {
  variable: string;
  column: string;
  confidence: number;
};

// Helper to get auth token
function getAuthToken(): string {
  // In a real app, get from secure storage
  return 'test'; // Development token
}

// Upload document to backend
export async function uploadDocument(file: File): Promise<ApiResponse<DocumentAnalysisResult>> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/documents/parse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'فشل تحميل الملف');
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'خطأ في الاتصال');
  }
}

// Get default templates
export async function getDefaultTemplates() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/templates/default/list`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('فشل تحميل القوالب');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

// AI suggestions for template based on columns
export async function suggestTemplateFromColumns(columns: string[], records: Record<string, string>[]) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/suggest-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        columns,
        records,
      }),
    });

    if (!response.ok) {
      throw new Error('فشل الحصول على اقتراحات');
    }

    const data = await response.json();
    return data.data?.suggestions || [];
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}

// Auto-link variables to columns
export async function autoLinkVariables(templateBody: string, columns: string[], records: Record<string, string>[]) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/auto-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_body: templateBody,
        columns,
        records,
      }),
    });

    if (!response.ok) {
      throw new Error('فشل الربط التلقائي');
    }

    const data = await response.json();
    return data.data?.links || [];
  } catch (error) {
    console.error('Error auto-linking:', error);
    return [];
  }
}

// Prepare campaign with document data
export async function prepareCampaign(
  templateId: string,
  connectionId: string,
  campaignName: string,
  records: Record<string, string>[],
  columnMapping: Record<string, string>,
  phoneColumn: string,
  nameColumn?: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/campaigns/prepare`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        connection_id: connectionId,
        campaign_name: campaignName,
        records,
        column_mapping: columnMapping,
        phone_column: phoneColumn,
        name_column: nameColumn,
      }),
    });

    if (!response.ok) {
      throw new Error('فشل تجهيز الحملة');
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error preparing campaign:', error);
    throw error;
  }
}