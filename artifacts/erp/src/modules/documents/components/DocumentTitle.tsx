/**
 * DocumentTitle — Full-width bilingual title bar.
 * English title left-aligned, Arabic title right-aligned.
 * Thin accent line below.
 */
import React from 'react';

export const DocumentTitle: React.FC<{
  title: string;
  titleAr: string;
  documentNumber?: string;
  date?: string;
  color: string;
  bilingual: boolean;
}> = ({ title, titleAr, color, bilingual }) => {
  const accent = color || '#D4AF37';

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Thin line above */}
      <div style={{ height: '2px', backgroundColor: accent, marginBottom: '10px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: '#000', textTransform: 'uppercase' }}>
          {title}
        </h2>
        {bilingual && (
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#000', fontFamily: '"IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif' }}>
            {titleAr}
          </h2>
        )}
      </div>

      {/* Thin line below */}
      <div style={{ height: '2px', backgroundColor: accent, marginTop: '10px' }} />
    </div>
  );
};
