/**
 * AmountInWords — Bordered box with bilingual amount text.
 * "Amount In Words" header, bold English amount, Arabic amount below.
 */
import React from 'react';

export const AmountInWords: React.FC<{ amountEn?: string; amountAr?: string; color?: string }> = ({ amountEn, amountAr, color = '#D4AF37' }) => {
  if (!amountEn && !amountAr) return null;

  const borderColor = '#e5e7eb';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      marginBottom: '12px',
      fontSize: '10px',
    }}>
      {/* Header */}
      <div style={{
        padding: '4px 10px',
        borderBottom: `1px solid ${borderColor}`,
        backgroundColor: '#f9fafb',
        fontWeight: 600,
        color: '#374151',
      }}>
        Amount In Words
      </div>

      {/* Body */}
      <div style={{ padding: '6px 10px' }}>
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
            color: '#374151',
            marginTop: '2px',
            lineHeight: 1.4,
          }}>
            {amountAr}
          </div>
        )}
      </div>
    </div>
  );
};
