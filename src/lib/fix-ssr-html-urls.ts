/** Corrige URLs quebradas no HTML SSR do Cloudflare (`https://` vira `https:\`). */
export function fixSsrHtmlUrls(html: string): string {
  return html.replace(/https:\\(?=[a-zA-Z0-9])/g, "https://").replace(/&amp;#47;/g, "/");
}
