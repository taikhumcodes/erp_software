import type { CompanyProfile } from '../types/document';

interface DocumentHeaderProps {
  company: CompanyProfile;
  title: string;
  titleAr: string;
  documentNumber: string;
  date: string;
}

export function DocumentHeader({ company, title, titleAr, documentNumber, date }: DocumentHeaderProps) {
  return (
    <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5540e', paddingBottom: '16px', marginBottom: '16px' }}>
      {/* Company info (left) */}
      <div style={{ flex: 1 }}>
        {company.logoUrl && (
          <img src={company.logoUrl} alt="Logo" style={{ height: '48px', marginBottom: '8px' }} />
        )}
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>{company.nameEn}</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#555', direction: 'rtl' }}>{company.nameAr}</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          {company.address} | {company.phone}
        </div>
      </div>

      {/* Document title + number (right) */}
      <div style={{ textAlign: 'right', minWidth: '200px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#e5540e' }}>{title}</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#e5540e', direction: 'rtl' }}>{titleAr}</div>
        <div style={{ fontSize: '13px', color: '#555', marginTop: '8px' }}>
          <div><strong>No:</strong> {documentNumber}</div>
          <div><strong>Date:</strong> {date}</div>
        </div>
      </div>
    </div>
  );
}
