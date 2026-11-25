/**
 * Robust English to Arabic translation utility.
 * 
 * Flow:
 * 1. Primary: Server-side translation proxy (/api/translate) which avoids all
 *    browser ad-blockers, corporate network restrictions, and CORS origin limits.
 * 2. Fallback: Direct client fetch to public translation endpoints.
 */
export async function translateEnglishToArabic(text: string): Promise<string> {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // 1. Primary: Backend translation proxy
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmed, from: 'en', to: 'ar' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.translatedText) {
        return data.translatedText;
      }
    }
  } catch (backendErr) {
    console.warn('Backend translation failed, trying client fallback:', backendErr);
  }

  // 2. Fallback: Direct browser fetch to Google Translate
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(trimmed)}`;
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
    console.error('All translation providers failed:', err);
  }

  return '';
}
