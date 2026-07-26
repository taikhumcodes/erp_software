/**
 * TermsConditions — Two-column bilingual bullets with QR code bottom-right.
 * English bullets on the left, Arabic bullets on the right.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const TermsConditions: React.FC<{
  termsEn?: string;
  termsAr?: string;
  color?: string;
  qrData?: string;
}> = ({ termsEn, termsAr, color = '#D4AF37', qrData }) => {
  if (!termsEn && !termsAr && !qrData) return null;

  // Parse terms into bullet arrays
  const enBullets = termsEn
    ? termsEn.split('\n').filter(l => l.trim())
    : [];
  const arBullets = termsAr
    ? termsAr.split('\n').filter(l => l.trim())
    : [];

  return (
    <div style={{ marginBottom: '0', fontSize: '9px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 800,
        fontSize: '10px',
        borderBottom: `1px solid ${color}60`,
        paddingBottom: '4px',
        marginBottom: '6px',
      }}>
        <span style={{ textTransform: 'uppercase' }}>Terms & Conditions</span>
        <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>الشروط والأحكام</span>
      </div>

      {/* Body: bullets + QR */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Left: English bullets */}
        <div style={{ flex: 1 }}>
          <ul style={{ margin: 0, paddingLeft: '14px', lineHeight: 1.6 }}>
            {enBullets.map((bullet, idx) => (
              <li key={idx} style={{ color: '#374151' }}>
                {bullet.replace(/^[•\-\*]\s*/, '')}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Arabic bullets */}
        <div style={{ flex: 1, direction: 'rtl', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>
          <ul style={{ margin: 0, paddingRight: '14px', lineHeight: 1.6 }}>
            {arBullets.map((bullet, idx) => (
              <li key={idx} style={{ color: '#374151' }}>
                {bullet.replace(/^[•\-\*]\s*/, '')}
              </li>
            ))}
          </ul>
        </div>

        {/* QR Code */}
        {qrData && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
            <QRCodeSVG value={qrData} size={72} level="M" />
          </div>
        )}
      </div>
    </div>
  );
};
