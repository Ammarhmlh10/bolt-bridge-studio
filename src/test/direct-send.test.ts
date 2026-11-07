import { describe, expect, it } from "vitest";

import { smsLink, whatsappLink } from "@/lib/direct-send";

describe("direct send links", () => {
  it("sms link keeps the international number and pre-fills the Arabic message", () => {
    expect(smsLink("+966551234567", "مرحبا أحمد")).toBe(
      `sms:+966551234567?&body=${encodeURIComponent("مرحبا أحمد")}`,
    );
  });

  it("whatsapp link uses digits only and pre-fills the message", () => {
    expect(whatsappLink("+966 55 123 4567", "فاتورة 150 ر.س")).toBe(
      `https://wa.me/966551234567?text=${encodeURIComponent("فاتورة 150 ر.س")}`,
    );
  });
});
