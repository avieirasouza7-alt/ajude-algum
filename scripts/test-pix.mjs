import {
  normalizePixKey,
  isValidPixKey,
  buildDonationPixPayload,
  isValidPixPayload,
} from "../src/lib/pix-donation.ts";

const cases = [
  ["61 993939343", true, "+5561993939343"],
  ["08433788914", true, "08433788914"],
  ["00000000000", false, "00000000000"],
  ["doacoes@ajudealguemonline.com.br", true, "doacoes@ajudealguemonline.com.br"],
  ["abc", false, "abc"],
  ["123e4567-e89b-12d3-a456-426614174000", true, "123e4567-e89b-12d3-a456-426614174000"],
];

let failed = 0;
for (const [key, expectValid, expectNorm] of cases) {
  const n = normalizePixKey(key);
  const v = isValidPixKey(key);
  const payload = buildDonationPixPayload(key);
  const crc = isValidPixPayload(payload);
  const ok = v === expectValid && n === expectNorm && (!expectValid || crc);
  if (!ok) failed += 1;
  console.log({ key, n, v, expectValid, expectNorm, crc, ok });
}

if (failed) {
  console.error(`FAILED ${failed} case(s)`);
  process.exit(1);
}
console.log("All PIX checks passed");
