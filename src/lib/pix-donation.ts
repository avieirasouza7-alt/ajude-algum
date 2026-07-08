import { SITE_EMAIL_DOMAIN, SITE_NAME } from "@/lib/site-meta";

/** Chave Pix (e-mail) para doações voluntárias ao projeto — PicPay. */
export const SITE_DONATION_PIX_KEY = `doacoes@${SITE_EMAIL_DOMAIN}`;

export const SITE_DONATION_PIX_MERCHANT = "Ajude Alguem Online";
export const SITE_DONATION_PIX_CITY = "BRASILIA";

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function emvField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function normalizePixKey(rawPixKey: string) {
  const raw = rawPixKey.trim();
  const compact = raw.replace(/\s+/g, "");

  if (compact.includes("@")) return compact.toLowerCase();

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 14 && digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 11 || digits.length === 14) return digits;

  return compact;
}

function pixCrc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Payload EMV estático (BR Code) para QR Pix com chave e-mail. */
export function buildDonationPixPayload(pixKey = SITE_DONATION_PIX_KEY) {
  const merchantName = stripAccents(SITE_DONATION_PIX_MERCHANT).slice(0, 25).toUpperCase();
  const merchantCity = stripAccents(SITE_DONATION_PIX_CITY).slice(0, 15).toUpperCase();
  const normalizedPixKey = normalizePixKey(pixKey);

  const merchantAccount =
    emvField("00", "br.gov.bcb.pix") + emvField("01", normalizedPixKey);

  let payload =
    emvField("00", "01") +
    emvField("01", "11") +
    emvField("26", merchantAccount) +
    emvField("52", "0000") +
    emvField("53", "986") +
    emvField("58", "BR") +
    emvField("59", merchantName) +
    emvField("60", merchantCity) +
    emvField("62", emvField("05", "***"));

  payload += "6304";
  return payload + pixCrc16(payload);
}

export const SITE_DONATION_SECTION_ID = "contribuir";

export const SITE_DONATION_TITLE = `Ajude a manter o ${SITE_NAME}`;
