// Pure document → message preparation rules shared by the server API and tests.
import { extractPlaceholders, replacePlaceholders } from "./hodhod-rules";

export type CanonicalField = "name" | "phone" | "email" | "amount" | "invoice_number" | "due_date";

export type PreparedMessage = {
  position: number;
  recipient_name: string;
  phone: string | null;
  email: string | null;
  body: string;
  variables: Record<string, string>;
  status: "pending" | "skipped";
  error: string | null;
};

export const PHONE_INVALID_ERROR = "رقم الجوال غير صالح أو مفقود";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_DIGITS.indexOf(d);
    return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(d));
  });
}

/**
 * Normalizes a phone number to E.164 (+country...). Local Saudi formats
 * (05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX) become +9665XXXXXXXX.
 * Returns null when the value cannot be a phone number.
 */
export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let value = toLatinDigits(String(raw)).trim();
  if (!value) return null;
  const hasPlus = value.startsWith("+");
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (!hasPlus && digits.startsWith("00")) digits = digits.slice(2);
  else if (!hasPlus) {
    if (/^05\d{8}$/.test(digits)) digits = `966${digits.slice(1)}`;
    else if (/^5\d{8}$/.test(digits)) digits = `966${digits}`;
  }
  value = digits;
  if (value.length < 8 || value.length > 15) return null;
  return `+${value}`;
}

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  name: ["name", "full name", "customer", "customer name", "client", "client name", "subscriber", "الاسم", "اسم العميل", "العميل", "اسم المشترك", "المشترك", "الاسم الكامل"],
  phone: ["phone", "mobile", "phone number", "mobile number", "tel", "telephone", "whatsapp", "msisdn", "الجوال", "رقم الجوال", "الهاتف", "رقم الهاتف", "الموبايل", "جوال", "هاتف", "واتساب", "رقم الواتساب"],
  email: ["email", "e-mail", "mail", "email address", "البريد", "البريد الإلكتروني", "الايميل", "الإيميل"],
  amount: ["amount", "total", "value", "price", "balance", "amount due", "المبلغ", "الإجمالي", "الاجمالي", "القيمة", "المبلغ المستحق", "المستحق", "الرصيد"],
  invoice_number: ["invoice", "invoice number", "invoice no", "invoice id", "bill number", "رقم الفاتورة", "الفاتورة", "رقم الفاتوره"],
  due_date: ["due date", "due", "date", "تاريخ الاستحقاق", "الاستحقاق", "التاريخ", "تاريخ الفاتورة"],
};

/** Arabic placeholder names that always mirror the standard fields. */
export const ARABIC_FIELD_NAMES: Record<CanonicalField, string> = {
  name: "الاسم",
  phone: "الجوال",
  email: "البريد",
  amount: "المبلغ",
  invoice_number: "رقم_الفاتورة",
  due_date: "تاريخ_الاستحقاق",
};

function normalizeHeader(header: string): string {
  return toLatinDigits(header)
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Maps spreadsheet headers to canonical fields; the first matching column wins. */
export function detectColumns(headers: string[]): Partial<Record<CanonicalField, string>> {
  const result: Partial<Record<CanonicalField, string>> = {};
  for (const field of Object.keys(FIELD_ALIASES) as CanonicalField[]) {
    const aliases = FIELD_ALIASES[field];
    const match = headers.find((h) => aliases.includes(normalizeHeader(h)));
    if (match !== undefined) result[field] = match;
  }
  return result;
}

/** Turns a header into a placeholder-safe variable name (letters, digits, underscores). */
export function toVariableName(header: string): string {
  return toLatinDigits(header)
    .trim()
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

/** Builds the template variables for one record: canonical fields plus every column by its own name. */
export function buildVariables(
  record: Record<string, unknown>,
  mapping: Partial<Record<CanonicalField, string>>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const name = toVariableName(key);
    if (name) vars[name] = value === null || value === undefined ? "" : String(value).trim();
  }
  for (const [field, column] of Object.entries(mapping) as [CanonicalField, string][]) {
    const value = record[column];
    vars[field] = value === null || value === undefined ? "" : String(value).trim();
  }
  if (vars["phone"]) vars["phone"] = normalizePhone(vars["phone"]) ?? vars["phone"];
  // Arabic names for the standard fields, so {{الاسم}} works even when the column is "Customer Name".
  for (const [field, arabic] of Object.entries(ARABIC_FIELD_NAMES) as [CanonicalField, string][]) {
    if (!vars[arabic] && vars[field]) vars[arabic] = vars[field];
  }
  return vars;
}

export function isBlankRecord(record: Record<string, unknown>): boolean {
  return Object.values(record).every((v) => v === null || v === undefined || String(v).trim() === "");
}

export function prepareMessages(templateBody: string, records: Record<string, unknown>[]): {
  messages: PreparedMessage[];
  missingVariables: string[];
} {
  const rows = records.filter((r) => !isBlankRecord(r));
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const mapping = detectColumns(headers);
  const placeholders = extractPlaceholders(templateBody);
  const missing = new Set<string>();

  const messages = rows.map((record, index): PreparedMessage => {
    const variables = buildVariables(record, mapping);
    for (const p of placeholders) if (!variables[p]) missing.add(p);
    const phone = normalizePhone(variables["phone"]);
    const email = variables["email"] ? variables["email"] : null;
    return {
      position: index + 1,
      recipient_name: variables["name"] ?? "",
      phone,
      email,
      body: replacePlaceholders(templateBody, variables).trim(),
      variables,
      status: phone ? "pending" : "skipped",
      error: phone ? null : PHONE_INVALID_ERROR,
    };
  });

  return { messages, missingVariables: Array.from(missing) };
}
