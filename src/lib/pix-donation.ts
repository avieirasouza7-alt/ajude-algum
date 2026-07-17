import { SITE_EMAIL_DOMAIN, SITE_NAME } from "@/lib/site-meta";

/** Chave Pix (e-mail) para doações voluntárias ao projeto — PicPay. */
export const SITE_DONATION_PIX_KEY = `doacoes@${SITE_EMAIL_DOMAIN}`;

export const SITE_DONATION_PIX_MERCHANT = "Ajude Alguem Online";
export const SITE_DONATION_PIX_CITY = "BRASILIA";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const EVP_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVP_HEX_RE = /^[0-9a-f]{32}$/i;

function isRepeatedDigits(digits: string) {
  return digits.length > 0 && /^(\d)\1+$/.test(digits);
}

function isLikelyBrazilPhoneDigits(digits: string) {
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) return false;
  if (digits.length === 11) return digits[2] === "9";
  return ["2", "3", "4", "5"].includes(digits[2] ?? "");
}

function isValidCpf(digits: string) {
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(digits[10]);
}

function isValidCnpj(digits: string) {
  if (digits.length !== 14 || isRepeatedDigits(digits)) return false;
  const calc = (base: string, weights: number[]) => {
    const total = weights.reduce((acc, w, i) => acc + Number(base[i]) * w, 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function emvField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
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

/**
 * Normaliza chave PIX para o formato usado no BR Code / cópia.
 * Telefone vira +55..., e-mail em minúsculas, CPF/CNPJ só dígitos.
 * CPF válido tem prioridade sobre formato de celular em chaves de 11 dígitos.
 */
export function normalizePixKey(rawPixKey: string) {
  const raw = rawPixKey.trim();
  const compact = raw.replace(/\s+/g, "");

  if (compact.includes("@")) return compact.toLowerCase();

  if (EVP_UUID_RE.test(compact) || EVP_HEX_RE.test(compact)) {
    return compact.toLowerCase();
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 11 && isValidCpf(digits)) return digits;
  if (digits.length === 14 && isValidCnpj(digits)) return digits;

  if (isLikelyBrazilPhoneDigits(digits)) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    const localDigits = digits.slice(2);
    if (isLikelyBrazilPhoneDigits(localDigits)) return `+${digits}`;
  }

  // Fallback: dígitos isolados (sem validar CPF/CNPJ) ou chave aleatória alfanumérica
  if (digits.length === 11 || digits.length === 14) return digits;
  return compact;
}

/** Valida se a chave PIX está em formato aceitável para QR/copia-e-cola. */
export function isValidPixKey(rawPixKey: string) {
  const normalized = normalizePixKey(rawPixKey);
  if (!normalized || normalized.length < 4) return false;

  if (normalized.includes("@")) return EMAIL_RE.test(normalized);

  if (EVP_UUID_RE.test(normalized) || EVP_HEX_RE.test(normalized)) return true;

  if (normalized.startsWith("+55")) {
    const local = normalized.slice(3);
    return isLikelyBrazilPhoneDigits(local) && !isRepeatedDigits(local);
  }

  const digits = normalized.replace(/\D/g, "");
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);

  // Chave aleatória EVP sem hífen / outros formatos bancos (32–36 chars tipicamente)
  if (/^[A-Za-z0-9-]{32,36}$/.test(normalized)) return true;

  return false;
}

export function pixKeyValidationMessage(rawPixKey: string) {
  const raw = rawPixKey.trim();
  if (!raw) return "Informe a chave PIX";
  if (!isValidPixKey(raw)) {
    return "Chave PIX inválida. Use e-mail, telefone (+55), CPF, CNPJ ou chave aleatória.";
  }
  return null;
}

/** Payload EMV estático (BR Code) para QR Pix. */
export function buildDonationPixPayload(
  pixKey = SITE_DONATION_PIX_KEY,
  options?: { merchantName?: string; city?: string },
) {
  const merchantName = stripAccents(options?.merchantName || SITE_DONATION_PIX_MERCHANT)
    .slice(0, 25)
    .toUpperCase();
  const merchantCity = stripAccents(options?.city || SITE_DONATION_PIX_CITY)
    .slice(0, 15)
    .toUpperCase();
  const normalizedPixKey = normalizePixKey(pixKey);

  const merchantAccount = emvField("00", "br.gov.bcb.pix") + emvField("01", normalizedPixKey);

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

/** Confere se o CRC do payload gerado está íntegro. */
export function isValidPixPayload(payload: string) {
  if (!payload || payload.length < 20 || !payload.includes("6304")) return false;
  const body = payload.slice(0, -4);
  const crc = payload.slice(-4);
  return pixCrc16(body) === crc.toUpperCase();
}

export const SITE_DONATION_SECTION_ID = "contribuir";

export const SITE_DONATION_TITLE = `Ajude a manter o ${SITE_NAME}`;
