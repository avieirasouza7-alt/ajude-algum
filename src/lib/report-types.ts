export const REPORT_TYPES = [
  { value: "campanha", label: "Campanha suspeita ou enganosa" },
  { value: "fraude", label: "Fraude, golpe ou PIX indevido" },
  { value: "conteudo", label: "Conteúdo ofensivo ou proibido" },
  { value: "dados", label: "Uso indevido de dados pessoais" },
  { value: "plataforma", label: "Problema técnico ou na plataforma" },
  { value: "outro", label: "Outro motivo" },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["value"];

export function reportTypeLabel(value: string) {
  return REPORT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function extractCampaignSlug(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("/campanha/")) {
      const part = trimmed.split("/campanha/")[1] ?? "";
      return part.split(/[/?#]/)[0] ?? "";
    }
  } catch {
    /* ignore */
  }
  return trimmed.replace(/^\/+|\/+$/g, "");
}
