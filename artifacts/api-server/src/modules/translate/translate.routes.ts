import { Router, type Request, type Response } from 'express';
import { logger } from '../../lib/logger.js';

const router = Router();

async function translateWithGoogle(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data && Array.isArray(data[0])) {
      const fullText = data[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
        .filter(Boolean)
        .join('');
      if (fullText) return fullText;
    }
  } catch (err) {
    logger.warn({ err }, 'Google translation provider failed');
  }
  return null;
}

async function translateWithMyMemory(text: string, from: string, to: string): Promise<string | null> {
  try {
    const langpair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${encodeURIComponent(langpair)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data?.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (err) {
    logger.warn({ err }, 'MyMemory translation provider failed');
  }
  return null;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, from = 'en', to = 'ar' } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.json({ success: true, translatedText: '' });
      return;
    }

    // Provider 1: Google Translate (executed on server; eliminates browser CORS and ad-blockers)
    let translated = await translateWithGoogle(text, from, to);

    // Provider 2: MyMemory fallback if Google is unavailable
    if (!translated) {
      translated = await translateWithMyMemory(text, from, to);
    }

    res.json({
      success: true,
      translatedText: translated || '',
    });
  } catch (err: any) {
    logger.error({ err }, 'Translation error');
    res.json({ success: false, translatedText: '', error: err.message });
  }
});

export default router;
