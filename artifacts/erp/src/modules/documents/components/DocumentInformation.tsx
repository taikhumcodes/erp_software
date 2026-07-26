/**
 * DocumentInformation — 3-column bilingual info section.
 * Left: English key-value pairs with colons
 * Center: Counterparty info block (Customer/Supplier)
 * Right: Arabic mirror of left (RTL)
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

  const borderColor = '#e5e7eb';
  const cellPad = '4px 8px';

  return (
    <div style={{ display: 'flex', gap: '0', border: `1px solid ${borderColor}`, marginBottom: '14px', fontSize: '10px' }}>
      {/* Left column — English fields */}
      <div style={{ flex: '1', borderRight: `1px solid ${borderColor}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {leftInfoFields.map((field, idx) => (
              <tr key={idx} style={{ borderBottom: idx < leftInfoFields.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                <td style={{ padding: cellPad, fontWeight: 600, whiteSpace: 'nowrap', color: '#374151', width: '45%' }}>
                  {field.label}
                </td>
                <td style={{ padding: cellPad, color: '#6b7280', width: '5%' }}>:</td>
                <td style={{ padding: cellPad, fontWeight: 500, color: '#111' }}>{field.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Center column — Counterparty info */}
      <div style={{ flex: '1', borderRight: bilingual ? `1px solid ${borderColor}` : 'none', padding: '8px 12px' }}>
        <div style={{ fontWeight: 700, fontSize: '11px', color: '#000', marginBottom: '2px' }}>
          {counterpartyInfo.title}
        </div>
        <div style={{ fontWeight: 800, fontSize: '13px', color: '#000', marginBottom: '2px' }}>
          {counterpartyInfo.name}
        </div>
        {counterpartyInfo.titleAr && (
          <div style={{ fontWeight: 700, fontSize: '11px', color: '#555', fontFamily: '"IBM Plex Sans Arabic", sans-serif', direction: 'rtl', marginBottom: '2px' }}>
            {counterpartyInfo.titleAr}
          </div>
        )}
        {counterpartyInfo.nameAr && (
          <div style={{ fontWeight: 700, fontSize: '12px', color: '#000', fontFamily: '"IBM Plex Sans Arabic", sans-serif', direction: 'rtl', marginBottom: '6px' }}>
            {counterpartyInfo.nameAr}
          </div>
        )}
        {/* Counterparty detail fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
          {counterpartyInfo.fields.map((f, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
              <span style={{ fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{f.label}</span>
              <span style={{ color: '#6b7280' }}>:</span>
              <span style={{ color: '#111' }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — Arabic mirror */}
      {bilingual && (
        <div style={{ flex: '1' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
            <tbody>
              {leftInfoFields.map((field, idx) => (
                <tr key={idx} style={{ borderBottom: idx < leftInfoFields.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                  <td style={{ padding: cellPad, fontWeight: 500, color: '#111', textAlign: 'left' }}>{field.value}</td>
                  <td style={{ padding: cellPad, color: '#6b7280', width: '5%' }}>:</td>
                  <td style={{ padding: cellPad, fontWeight: 600, whiteSpace: 'nowrap', color: '#374151', fontFamily: '"IBM Plex Sans Arabic", sans-serif', textAlign: 'right', width: '45%' }}>
                    {field.labelAr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
