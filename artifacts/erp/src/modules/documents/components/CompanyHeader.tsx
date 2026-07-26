/**
 * CompanyHeader — 3-column bilingual header matching reference design.
 * Layout: English info (left) | Logo + Company Name (center) | Arabic info (right, RTL)
 * Gold accent line at bottom.
 */
import React from 'react';
import { CompanyProfile } from '../types';
import { Phone, Mail, Globe } from 'lucide-react';

export const CompanyHeader: React.FC<{ company: CompanyProfile; rightContent?: React.ReactNode }> = ({ company }) => {
  const accent = company.accentColor || '#D4AF37';

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Main header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px' }}>
        {/* Left: English company name + contact */}
        <div style={{ flex: '1', textAlign: 'left' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.5px', color: '#000' }}>
            {company.nameEn}
          </h1>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#333' }}>
            {company.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={11} style={{ color: accent, flexShrink: 0 }} />
                <span>{company.phone}</span>
              </div>
            )}
            {company.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={11} style={{ color: accent, flexShrink: 0 }} />
                <span>{company.email}</span>
              </div>
            )}
            {company.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={11} style={{ color: accent, flexShrink: 0 }} />
                <span>{company.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Logo + company name below */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
          {company.logoUrl && (
            <img
              src={company.logoUrl}
              alt="Company Logo"
              style={{ height: '120px', maxWidth: '240px', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Right: Arabic company name + contact (RTL) */}
        <div style={{ flex: '1', textAlign: 'right', direction: 'rtl' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2, color: '#000', fontFamily: '"IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif' }}>
            {company.nameAr}
          </h1>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#333', alignItems: 'flex-end' }}>
            {company.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                <span>{company.phone}</span>
                <Phone size={11} style={{ color: accent, flexShrink: 0 }} />
              </div>
            )}
            {company.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                <span>{company.email}</span>
                <Mail size={11} style={{ color: accent, flexShrink: 0 }} />
              </div>
            )}
            {company.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                <span>{company.website}</span>
                <Globe size={11} style={{ color: accent, flexShrink: 0 }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gold accent line */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}88, ${accent})`, borderRadius: '2px' }} />
    </div>
  );
};
