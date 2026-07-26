/**
 * CompanyFooter — Gold accent bar with bilingual "Thank You" message.
 */
import React from 'react';
import { CompanyProfile } from '../types';

export const CompanyFooter: React.FC<{ company: CompanyProfile; color?: string }> = ({ company, color }) => {
  const accent = color || company.accentColor || '#D4AF37';

  return (
    <div style={{
      marginTop: 'auto',
      padding: '8px 16px',
      backgroundColor: accent,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#000',
    }}>
      <span>Thank You For Your Business!</span>
      <span style={{ color: '#00000060' }}>|</span>
      <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>شكراً لتعاملكم معنا</span>
    </div>
  );
};
