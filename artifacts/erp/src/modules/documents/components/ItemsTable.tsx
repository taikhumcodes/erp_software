/**
 * ItemsTable — Dark header, bilingual columns, alternating rows.
 * Renders description with Arabic subtitle, proper KWD formatting.
 */
import React from 'react';
import { DocumentColumn, DocumentItem } from '../types';

export const ItemsTable: React.FC<{
  columns: DocumentColumn[];
  items: DocumentItem[];
  themeId?: string;
  bilingual?: boolean;
  /** Summary row for delivery orders (Total Items / Total Quantity) */
  itemsSummary?: { totalItems: number; totalQuantity: number };
}> = ({ columns, items, bilingual = true, itemsSummary }) => {
  const headerBg = '#1a1a1a';
  const headerText = '#ffffff';
  const borderColor = '#e5e7eb';
  const altBg = '#f9fafb';

  return (
    <div style={{ marginBottom: '10px', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: `1px solid ${borderColor}` }}>
        <thead>
          <tr style={{ backgroundColor: headerBg, color: headerText }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '6px 8px',
                  textAlign: (col.align || 'left') as any,
                  width: col.width || 'auto',
                  fontWeight: 700,
                  fontSize: '10px',
                  borderRight: `1px solid #333`,
                  verticalAlign: 'middle',
                  lineHeight: 1.3,
                }}
              >
                <div>{col.label}</div>
                {bilingual && col.labelAr && (
                  <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 400, fontSize: '9px', opacity: 0.85, marginTop: '1px' }}>
                    {col.labelAr}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                backgroundColor: rowIndex % 2 === 1 ? altBg : 'transparent',
                borderBottom: `1px solid ${borderColor}`,
                pageBreakInside: 'avoid',
              }}
            >
              {columns.map((col) => {
                const val = row[col.key];
                const isDescription = col.key === 'description';
                const arabicVal = isDescription ? row['descriptionAr'] : null;
                const isUnit = col.key === 'unit';
                const unitAr = isUnit ? row['unitAr'] : null;

                return (
                  <td
                    key={col.key}
                    style={{
                      padding: '5px 8px',
                      textAlign: (col.align || 'left') as any,
                      borderRight: `1px solid ${borderColor}`,
                      verticalAlign: 'middle',
                      fontVariantNumeric: (col.format === 'currency' || col.format === 'number') ? 'tabular-nums' : undefined,
                    }}
                  >
                    <div>{val ?? '—'}</div>
                    {/* Arabic subtitle for description and unit */}
                    {bilingual && arabicVal && (
                      <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: '9px', color: '#6b7280', direction: 'rtl' }}>
                        {arabicVal as string}
                      </div>
                    )}
                    {bilingual && unitAr && (
                      <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: '9px', color: '#6b7280' }}>
                        {unitAr as string}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontStyle: 'italic' }}>
                No items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary row for Delivery Orders */}
      {itemsSummary && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 10px',
          fontSize: '10px',
          fontWeight: 700,
          borderLeft: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: '#f9fafb',
        }}>
          <div>
            <span>Total Items: {itemsSummary.totalItems}</span>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '12px', color: '#6b7280' }}>
              إجمالي الأصناف: {itemsSummary.totalItems}
            </span>
          </div>
          <div>
            <span>Total Quantity: {itemsSummary.totalQuantity}</span>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '12px', color: '#6b7280' }}>
              إجمالي الكمية: {itemsSummary.totalQuantity}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
