// Links that open the phone's own messaging apps with a prepared message filled in.

/** Digits only, without a leading + (WhatsApp expects this). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** sms: link with the body pre-filled. "?&body=" is understood by both iPhone and Android. */
export function smsLink(phone: string, body: string): string {
  const digits = phoneDigits(phone);
  const number = phone.trim().startsWith("+") ? `+${digits}` : digits;
  return `sms:${number}?&body=${encodeURIComponent(body)}`;
}

/** WhatsApp click-to-chat link with the message pre-filled. */
export function whatsappLink(phone: string, body: string): string {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(body)}`;
}

export const DEVICE_NOT_SENT_ERROR = "لم تُرسل من الجوال";
