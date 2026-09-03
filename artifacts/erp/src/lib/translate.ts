/**
 * Simple English to Arabic translation utility using a public API.
 */
export async function translateEnglishToArabic(text: string): Promise<string> {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && Array.isArray(data[0])) {
      const fullText = data[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
        .filter(Boolean)
        .join('');
      if (fullText) return fullText;
    }
  } catch (err) {
    console.error('Translation failed:', err);
  }
  return '';
}
