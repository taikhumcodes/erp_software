/**
 * TotalsSection — Right-aligned bordered totals table with bilingual labels.
 * Grand Total row highlighted with gold/accent background.
 */
import React from 'react';
import { DocumentSummaryLine } from '../types';

export const TotalsSection: React.FC<{ summaryLines: DocumentSummaryLine[]; bilingual?: boolean; color?: string }> = ({ summaryLines, bilingual = true, color = '#D4AF37' }) => {
  if (!summaryLines || summaryLines.length === 0) return null;

  const borderColor = '#e5e7eb';

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '10px', minWidth: '320px', border: `1px solid ${borderColor}` }}>
        <tbody>
          {summaryLines.map((line, idx) => (
            <tr
              key={idx}
              style={{
                backgroundColor: line.isHighlighted ? color : 'transparent',
                color: line.isHighlighted ? '#000' : '#111',
                fontWeight: line.isBold ? 700 : 400,
                fontSize: line.isBold ? '12px' : '10px',
              }}
            >
              <td style={{
                padding: '5px 10px',
                borderBottom: `1px solid ${line.isHighlighted ? color : borderColor}`,
                borderRight: `1px solid ${line.isHighlighted ? color : borderColor}`,
                whiteSpace: 'nowrap',
              }}>
                {line.label}
              </td>
              <td style={{
                padding: '5px 14px',
                textAlign: 'right',
                borderBottom: `1px solid ${line.isHighlighted ? color : borderColor}`,
                borderRight: bilingual ? `1px solid ${line.isHighlighted ? color : borderColor}` : 'none',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: line.isBold ? 800 : 400,
              }}>
                {line.value}
              </td>
              {bilingual && (
                <td style={{
                  padding: '5px 10px',
                  borderBottom: `1px solid ${line.isHighlighted ? color : borderColor}`,
                  fontFamily: '"IBM Plex Sans Arabic", sans-serif',
                  textAlign: 'right',
                  direction: 'rtl',
                  whiteSpace: 'nowrap',
                }}>
                  {line.labelAr}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
