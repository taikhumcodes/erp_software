/**
 * AmountInWords — Left accent-border strip with bilingual amount text.
 * "Amount In Words" label, bold English amount, Arabic amount below.
 */
import React from 'react';

export const AmountInWords: React.FC<{ amountEn?: string; amountAr?: string; color?: string }> = ({ amountEn, amountAr, color = '#D4AF37' }) => {
  if (!amountEn && !amountAr) return null;

  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      paddingLeft: '10px',
      marginBottom: '12px',
      fontSize: '10px',
    }}>
      <div style={{ fontWeight: 700, color: '#111', marginBottom: '3px' }}>
        Amount In Words
      </div>
      {amountEn && (
        <div style={{ fontWeight: 700, color: '#000', lineHeight: 1.4 }}>
          {amountEn}
        </div>
      )}
      {amountAr && (
        <div style={{
          fontFamily: '"IBM Plex Sans Arabic", sans-serif',
          direction: 'rtl',
          textAlign: 'right',
          fontWeight: 700,
          color: '#374151',
          marginTop: '2px',
          lineHeight: 1.4,
        }}>
          {amountAr}
        </div>
      )}
    </div>
  );
};
