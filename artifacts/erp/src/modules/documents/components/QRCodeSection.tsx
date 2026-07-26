/**
 * QRCodeSection — Inline QR code (no absolute positioning).
 * Now rendered inline within TermsConditions, but kept as standalone for reuse.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const QRCodeSection: React.FC<{ qrData?: string; size?: number }> = ({ qrData, size = 80 }) => {
  if (!qrData) return null;

  return (
    <div style={{ display: 'inline-block' }}>
      <QRCodeSVG value={qrData} size={size} level="M" />
    </div>
  );
};
