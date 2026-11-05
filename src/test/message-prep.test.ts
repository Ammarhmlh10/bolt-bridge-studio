import { describe, expect, it } from "vitest";

import { extractPlaceholders, replacePlaceholders } from "@/lib/hodhod-rules";
import { detectColumns, normalizePhone, prepareMessages, PHONE_INVALID_ERROR } from "@/lib/message-prep";

describe("phone normalization", () => {
  it("turns a local Saudi mobile 05XXXXXXXX into +9665XXXXXXXX", () => {
    expect(normalizePhone("0551234567")).toBe("+966551234567");
  });
  it("accepts Arabic-Indic digits and separators", () => {
    expect(normalizePhone("٠٥٥ ١٢٣ ٤٥٦٧")).toBe("+966551234567");
  });
  it("converts a 00 international prefix to +", () => {
    expect(normalizePhone("00971501234567")).toBe("+971501234567");
  });
  it("rejects values that are too short", () => {
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("Arabic placeholders", () => {
  it("fills {{الاسم}} as well as {{name}}", () => {
    expect(extractPlaceholders("مرحباً {{الاسم}} و {{name}}")).toEqual(["الاسم", "name"]);
    expect(replacePlaceholders("مرحباً {{الاسم}}", { الاسم: "سارة" })).toBe("مرحباً سارة");
  });
});

describe("column detection", () => {
  it("maps Arabic headers to the standard fields", () => {
    expect(detectColumns(["اسم العميل", "رقم الجوال", "المبلغ", "رقم الفاتورة"])).toEqual({
      name: "اسم العميل",
      phone: "رقم الجوال",
      amount: "المبلغ",
      invoice_number: "رقم الفاتورة",
    });
  });
});

describe("prepareMessages", () => {
  const template = "عزيزي {{name}}، فاتورتك رقم {{invoice_number}} بمبلغ {{المبلغ}} ريال.";

  it("renders one message per non-empty row using the template", () => {
    const { messages } = prepareMessages(template, [
      { الاسم: "أحمد", الجوال: "0551234567", المبلغ: "150", "رقم الفاتورة": "INV-1" },
      { الاسم: "", الجوال: "", المبلغ: "", "رقم الفاتورة": "" },
    ]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      position: 1,
      recipient_name: "أحمد",
      phone: "+966551234567",
      body: "عزيزي أحمد، فاتورتك رقم INV-1 بمبلغ 150 ريال.",
      status: "pending",
    });
  });

  it("skips a row without a valid phone and explains why", () => {
    const { messages } = prepareMessages(template, [{ name: "منى", phone: "abc", المبلغ: "90" }]);
    expect(messages[0]?.status).toBe("skipped");
    expect(messages[0]?.error).toBe(PHONE_INVALID_ERROR);
  });

  it("fills Arabic field names from English columns", () => {
    const { messages } = prepareMessages("مرحباً {{الاسم}}، المبلغ {{المبلغ}}", [
      { "Customer Name": "Khalid", Mobile: "0561112233", Total: "75" },
    ]);
    expect(messages[0]?.body).toBe("مرحباً Khalid، المبلغ 75");
  });

  it("reports template variables the document does not provide", () => {
    const { missingVariables } = prepareMessages(template, [{ name: "علي", phone: "0551234567" }]);
    expect(missingVariables).toEqual(["invoice_number", "المبلغ"]);
  });
});
