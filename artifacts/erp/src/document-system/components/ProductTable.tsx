import type { DocumentColumn, DocumentItem } from '../types/document';

interface ProductTableProps {
  columns: DocumentColumn[];
  items: DocumentItem[];
  currency: string;
}

function formatCell(value: string | number, format?: 'number' | 'currency' | 'text'): string {
  if (value === undefined || value === null) return '';
  if (format === 'currency') {
    return Number(value).toFixed(3);
  }
  if (format === 'number') {
    return Number(value).toFixed(3);
  }
  return String(value);
}

export function ProductTable({ columns, items, currency }: ProductTableProps) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
      <thead>
        <tr style={{ backgroundColor: '#e5540e', color: '#fff' }}>
          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.2)' }}>#</th>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                padding: '8px 10px',
                textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                fontWeight: 600,
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
            <td style={{ padding: '7px 10px', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: '7px 10px',
                  textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                  fontFamily: col.format === 'currency' || col.format === 'number' ? 'monospace' : 'inherit',
                }}
              >
                {formatCell(item[col.key], col.format)}
                {col.format === 'currency' ? ` ${currency}` : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
