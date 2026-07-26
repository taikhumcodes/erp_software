// Basic implementation for English. In a real system, you might use a library like 'number-to-words'
// and 'tafqeetjs' for Arabic.

export function numberToWords(amount: number, language: 'English' | 'Arabic' = 'English'): string {
  if (!amount || isNaN(amount)) return '';
  
  if (language === 'English') {
    return `Only ${amount.toFixed(3)} KWD`; // Placeholder for actual implementation
  }
  
  return `فقط ${amount.toFixed(3)} دينار كويتي لا غير`; // Placeholder for actual Arabic implementation
}
