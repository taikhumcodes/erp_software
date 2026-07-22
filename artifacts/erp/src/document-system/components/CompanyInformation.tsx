import type { CompanyProfile } from '../types/document';

interface CompanyInformationProps {
  company: CompanyProfile;
}

export function CompanyInformation({ company }: CompanyInformationProps) {
  const items = [
    company.commercialRegistration && { label: 'CR', value: company.commercialRegistration },
    company.vatTrn && { label: 'VAT/TRN', value: company.vatTrn },
    company.email && { label: 'Email', value: company.email },
    company.website && { label: 'Web', value: company.website },
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', fontSize: '11px', color: '#666', marginBottom: '12px' }}>
      {items.map((item) => (
        <div key={item.label}>
          <span style={{ fontWeight: 600 }}>{item.label}:</span> {item.value}
        </div>
      ))}
    </div>
  );
}
