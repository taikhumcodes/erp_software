interface AmountInWordsProps {
  amountInWords: string;
  amountInWordsAr: string;
}

export function AmountInWords({ amountInWords, amountInWordsAr }: AmountInWordsProps) {
  if (!amountInWords && !amountInWordsAr) return null;

  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px' }}>
      <div style={{ fontWeight: 600, color: '#15803d' }}>Amount in Words:</div>
      <div style={{ color: '#166534' }}>{amountInWords}</div>
      {amountInWordsAr && (
        <div style={{ color: '#166534', direction: 'rtl', marginTop: '4px' }}>{amountInWordsAr}</div>
      )}
    </div>
  );
}
