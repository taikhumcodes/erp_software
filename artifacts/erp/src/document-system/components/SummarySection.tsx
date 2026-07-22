import type { DocumentSummaryLine } from '../types/document';

interface SummarySectionProps {
  lines: DocumentSummaryLine[];
  currency: string;
}

export function SummarySection({ lines, currency }: SummarySectionProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <div style={{ width: '320px' }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              fontWeight: line.isBold ? 700 : 400,
              fontSize: line.isBold ? '14px' : '12px',
              borderTop: line.hasBorderTop ? '2px solid #e5540e' : 'none',
              color: line.isNegative ? '#dc2626' : '#1a1a1a',
            }}
          >
            <span>{line.label}</span>
            <span style={{ fontFamily: 'monospace' }}>
              {line.isNegative ? '-' : ''}{line.value} {currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
