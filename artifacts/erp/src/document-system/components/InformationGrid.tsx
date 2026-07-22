import type { DocumentInfo } from '../types/document';

interface InformationGridProps {
  fields: DocumentInfo[];
}

export function InformationGrid({ fields }: InformationGridProps) {
  if (fields.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
      {fields.map((field, i) => (
        <div key={i}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{field.value}</div>
        </div>
      ))}
    </div>
  );
}
