export function toPlainText(raw: string): string {
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractProviderText(rawResponse?: string) {
  if (!rawResponse) return "";
  try {
    const parsed = JSON.parse(rawResponse);
    return (
      parsed?.choices?.[0]?.message?.content ||
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ||
      parsed?.content?.[0]?.text ||
      parsed?.content ||
      parsed?.answer ||
      parsed?.text ||
      JSON.stringify(parsed, null, 2)
    );
  } catch {
    return rawResponse;
  }
}
