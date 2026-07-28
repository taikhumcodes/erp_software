/**
 * DocumentInformation — 3-column bilingual info section.
 * Left: English key-value pairs, in a tinted card with a left accent border
 * Center: Counterparty info block (Customer/Supplier), plain background
 * Right: Arabic mirror of left (RTL), tinted card with a right accent border
 */
import React from 'react';
import { DocumentInfo, CounterpartyInfo } from '../types';

export const DocumentInformation: React.FC<{
  leftInfoFields: DocumentInfo[];
  counterpartyInfo: CounterpartyInfo;
  color?: string;
  bilingual?: boolean;
  // Legacy props
  fields?: DocumentInfo[];
  title?: string;
  titleAr?: string;
}> = ({ leftInfoFields, counterpartyInfo, color = '#D4AF37', bilingual = true }) => {
  if (!leftInfoFields || leftInfoFields.length === 0) return null;

  const tint = `${color}12`; // very light tint of the accent color
  const cellPad = '5px 10px';

  const fieldRow = (label: string, value: string, key: number, align: 'left' | 'right' = 'left') => (
    <div key={key} style={{ display: 'flex', padding: cellPad, fontSize: '10px' }}>
      <span style={{ fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color: '#6b7280', margin: '0 6px' }}>:</span>
      <span style={{ color: '#111', fontWeight: 500 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'stretch' }}>
      {/* Left column — English fields, tinted card, accent left border */}
      <div style={{
        flex: '1',
        backgroundColor: tint,
        borderLeft: `3px solid ${color}`,
        borderRadius: '3px',
        padding: '2px 0',
      }}>
        {leftInfoFields.map((field, idx) => fieldRow(field.label, field.value, idx))}
      </div>

      {/* Center column — Counterparty info, no card, dashed underline under name */}
      <div style={{ flex: '1.1', padding: '4px 8px', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '11px', color: '#000', marginBottom: '2px' }}>
          {counterpartyInfo.title}
        </div>
        <div style={{
          fontWeight: 800,
          fontSize: '14px',
          color: '#000',
          display: 'inline-block',
          paddingBottom: '4px',
          borderBottom: '1px dashed #9ca3af',
          marginBottom: '6px',
        }}>
          {counterpartyInfo.name}
        </div>
        {counterpartyInfo.titleAr && (
          <div style={{ fontWeight: 700, fontSize: '11px', color: '#555', fontFamily: '"IBM Plex Sans Arabic", sans-serif', direction: 'rtl', marginTop: '4px' }}>
            {counterpartyInfo.titleAr}
          </div>
        )}
        {counterpartyInfo.nameAr && (
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#000', fontFamily: '"IBM Plex Sans Arabic", sans-serif', direction: 'rtl' }}>
            {counterpartyInfo.nameAr}
          </div>
        )}
        {/* Counterparty detail fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '8px', textAlign: 'left' }}>
          {counterpartyInfo.fields.map((f, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
              <span style={{ fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{f.label}</span>
              <span style={{ color: '#6b7280' }}>:</span>
              <span style={{ color: '#111' }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — Arabic mirror, tinted card, accent right border */}
      {bilingual && (
        <div style={{
          flex: '1',
          backgroundColor: tint,
          borderRight: `3px solid ${color}`,
          borderRadius: '3px',
          padding: '2px 0',
          direction: 'rtl',
        }}>
          {leftInfoFields.map((field, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end', padding: cellPad, fontSize: '10px' }}>
              <span style={{ fontWeight: 700, color: '#111', whiteSpace: 'nowrap', fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>{field.labelAr}</span>
              <span style={{ color: '#6b7280', margin: '0 6px' }}>:</span>
              <span style={{ color: '#111', fontWeight: 500 }}>{field.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
