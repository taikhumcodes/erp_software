interface TermsSectionProps {
  terms: string;
  termsAr: string;
}

export function TermsSection({ terms, termsAr }: TermsSectionProps) {
  if (!terms && !termsAr) return null;

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '16px', marginBottom: '16px', fontSize: '11px', color: '#666' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px', color: '#333' }}>Terms & Conditions</div>
      {terms && <div style={{ whiteSpace: 'pre-wrap' }}>{terms}</div>}
      {termsAr && <div style={{ whiteSpace: 'pre-wrap', direction: 'rtl', marginTop: '4px' }}>{termsAr}</div>}
    </div>
  );
}
