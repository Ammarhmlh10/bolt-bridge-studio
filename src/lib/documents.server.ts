// Reads uploaded documents (CSV, Excel, PDF invoices) into plain records.
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "ai";
import * as XLSX from "xlsx";

import { ApiError } from "./api.server";
import { MAX_DOCUMENT_BYTES, MAX_ROWS_PER_BATCH } from "./hodhod-rules";
import { isBlankRecord } from "./message-prep";
import { createLovableAiGatewayRunIdFetch } from "./ai/run-id";

export type SourceType = "csv" | "xlsx" | "pdf";
export type ParsedDocument = {
  source_type: SourceType;
  source_name: string;
  columns: string[];
  records: Record<string, string>[];
};

const AI_MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

export function detectSourceType(file: File): SourceType | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (name.endsWith(".csv") || type === "text/csv") return "csv";
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    type.includes("spreadsheetml") ||
    type === "application/vnd.ms-excel"
  )
    return "xlsx";
  return null;
}

export async function readUploadedFile(file: unknown): Promise<ParsedDocument> {
  if (!(file instanceof File)) throw new ApiError(400, "bad_request", "أرفق الملف في الحقل file.");
  if (file.size === 0) throw new ApiError(400, "bad_request", "الملف فارغ.");
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new ApiError(413, "payload_too_large", "حجم الملف أكبر من 5 ميغابايت.");
  }
  const type = detectSourceType(file);
  if (!type) throw new ApiError(415, "unsupported_file", "نوع الملف غير مدعوم. استخدم CSV أو Excel أو PDF.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const records = type === "pdf" ? await extractInvoicesFromPdf(bytes, file.name) : readSpreadsheet(bytes, type);
  const rows = records.filter((r) => !isBlankRecord(r));
  if (rows.length === 0) throw new ApiError(422, "unprocessable", "لم نجد أي بيانات عملاء في الملف.");
  if (rows.length > MAX_ROWS_PER_BATCH) {
    throw new ApiError(422, "unprocessable", `الملف يحتوي على ${rows.length} صفاً، والحد الأقصى ${MAX_ROWS_PER_BATCH}.`);
  }
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return { source_type: type, source_name: file.name.slice(0, 255), columns, records: rows };
}

function readSpreadsheet(bytes: Uint8Array, type: "csv" | "xlsx"): Record<string, string>[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook =
      type === "csv"
        ? XLSX.read(new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, ""), { type: "string" })
        : XLSX.read(bytes, { type: "array" });
  } catch {
    throw new ApiError(422, "unprocessable", "تعذر قراءة الملف. تأكد أنه جدول صالح.");
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new ApiError(422, "unprocessable", "الملف لا يحتوي على أي ورقة بيانات.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const header = String(key).trim();
      if (!header || header.startsWith("__EMPTY")) continue;
      out[header] = String(value ?? "").trim();
    }
    return out;
  });
}

const INVOICE_FIELDS = [
  "name",
  "phone",
  "email",
  "invoice_number",
  "amount",
  "currency",
  "issue_date",
  "due_date",
  "description",
] as const;

type ExtractedInvoice = Record<(typeof INVOICE_FIELDS)[number], string | null>;

const invoiceSchema = jsonSchema<{ invoices: ExtractedInvoice[] }>({
  type: "object",
  additionalProperties: false,
  required: ["invoices"],
  properties: {
    invoices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [...INVOICE_FIELDS],
        properties: Object.fromEntries(INVOICE_FIELDS.map((f) => [f, { type: ["string", "null"] }])),
      },
    },
  },
});

const INSTRUCTIONS = `أنت أداة لاستخراج بيانات الفواتير. اقرأ ملف PDF المرفق واستخرج كل فاتورة موجهة لعميل.
لكل فاتورة أعد: name (اسم العميل)، phone (رقم جوال العميل كما هو مكتوب)، email، invoice_number، amount (المبلغ الإجمالي المستحق كرقم فقط بدون عملة)، currency، issue_date، due_date (بصيغة YYYY-MM-DD إن أمكن)، description (وصف قصير لا يتجاوز 80 حرفاً).
استخدم null لأي حقل غير موجود ولا تخترع بيانات. إذا كان الملف كشفاً بعدة عملاء فأعد فاتورة لكل عميل. أعد 500 فاتورة كحد أقصى.`;

async function extractInvoicesFromPdf(bytes: Uint8Array, filename: string): Promise<Record<string, string>[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new ApiError(500, "server_error", "خدمة قراءة الفواتير غير مهيأة.");

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  let streamError: unknown = null;
  const result = streamText({
    model: provider.responses(AI_MODEL),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "استخرج الفواتير من هذا الملف." },
          { type: "file", data: Buffer.from(bytes).toString("base64"), mediaType: "application/pdf", filename },
        ],
      },
    ],
    output: Output.object({ schema: invoiceSchema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
    onError: ({ error }) => {
      streamError = error;
    },
  });

  let invoices: ExtractedInvoice[] = [];
  try {
    const output = await result.output;
    invoices = output.invoices ?? [];
  } catch (err) {
    const cause = streamError ?? err;
    if (NoObjectGeneratedError.isInstance(cause) && cause.text) {
      try {
        invoices = (JSON.parse(cause.text) as { invoices?: ExtractedInvoice[] }).invoices ?? [];
      } catch {
        throw new ApiError(422, "unprocessable", "تعذر فهم محتوى ملف PDF. جرّب ملفاً أوضح.");
      }
    } else {
      throw mapAiError(cause);
    }
  }

  return invoices.slice(0, MAX_ROWS_PER_BATCH).map((inv) => {
    const record: Record<string, string> = {};
    for (const field of INVOICE_FIELDS) {
      const value = inv[field];
      record[field] = value === null || value === undefined ? "" : String(value).trim();
    }
    return record;
  });
}

function mapAiError(err: unknown): ApiError {
  const status = APICallError.isInstance(err) ? err.statusCode : undefined;
  console.error("[documents] PDF extraction failed", status, err);
  if (status === 429) return new ApiError(429, "rate_limited", "الخدمة مشغولة الآن. حاول بعد دقيقة.");
  if (status === 402) return new ApiError(402, "ai_credits", "رصيد خدمة قراءة الفواتير نفد. تواصل مع مسؤول الحساب.");
  if (status === 403) return new ApiError(403, "ai_credits", "خدمة قراءة الفواتير غير متاحة حالياً لهذا الحساب.");
  if (status === 400) return new ApiError(422, "unprocessable", "تعذر قراءة ملف PDF. تأكد أنه غير محمي بكلمة مرور.");
  return new ApiError(502, "server_error", "تعذر تحليل ملف PDF الآن. حاول مرة أخرى.");
}
