import type { SignatureSlot } from '../types/document';

interface SignatureSectionProps {
  slots: SignatureSlot[];
}

export function SignatureSection({ slots }: SignatureSectionProps) {
  if (slots.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slots.length, 3)}, 1fr)`, gap: '32px', marginTop: '48px', marginBottom: '16px' }}>
      {slots.map((slot, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: '8px', marginTop: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>{slot.title}</div>
            <div style={{ fontSize: '11px', color: '#888', direction: 'rtl' }}>{slot.titleAr}</div>
            {slot.name && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{slot.name}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
