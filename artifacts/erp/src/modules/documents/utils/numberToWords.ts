import converter from 'number-to-words';

export function numberToWords(amount: number, language: 'English' | 'Arabic' = 'English'): string {
  if (!amount || isNaN(amount)) return '';
  
  // Kuwaiti Dinar formatting (3 decimal places)
  const dinars = Math.floor(amount);
  const fils = Math.round((amount - dinars) * 1000);

  if (language === 'English') {
    let str = converter.toWords(dinars).replace(/-/g, ' ');
    // capitalize words
    str = str.replace(/\b\w/g, l => l.toUpperCase());
    
    let result = `Only ${str} Kuwaiti Dinar${dinars !== 1 ? 's' : ''}`;
    if (fils > 0) {
      let filsStr = converter.toWords(fils).replace(/-/g, ' ');
      filsStr = filsStr.replace(/\b\w/g, l => l.toUpperCase());
      result += ` And ${filsStr} Fils`;
    }
    return result;
  }
  
  return `فقط ${amount.toFixed(3)} دينار كويتي لا غير`;
}
