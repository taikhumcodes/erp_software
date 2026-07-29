import { useState, useEffect, useRef } from 'react';
import { translateEnglishToArabic } from '@/lib/translate';

export function useAutoTranslate(
  englishText: string,
  arabicText: string,
  setArabicText: (text: string) => void
) {
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only set manuallyEdited to true if the user explicitly types in the Arabic field.
  // The first useEffect was incorrectly triggering because setting arabicText programmatically 
  // also triggered it.

  useEffect(() => {
    if (manuallyEdited) return; // Never overwrite if manually edited
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!englishText.trim()) {
      if (arabicText) setArabicText('');
      return;
    }

    // Debounce translation by 800ms
    timeoutRef.current = setTimeout(async () => {
      const translated = await translateEnglishToArabic(englishText);
      if (translated && !manuallyEdited) {
        // Unset the timeout ref before calling setArabicText 
        // to avoid marking it as manually edited in the other effect
        timeoutRef.current = null;
        setArabicText(translated);
      }
    }, 800);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [englishText, manuallyEdited, setArabicText, arabicText]);

  const handleArabicChange = (val: string) => {
    setManuallyEdited(true);
    setArabicText(val);
  };

  const resetTranslationState = () => {
    setManuallyEdited(false);
  };

  return { handleArabicChange, resetTranslationState };
}
