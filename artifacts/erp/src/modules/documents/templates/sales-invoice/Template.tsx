import React from 'react';
import { DocumentData } from '../../types';
import {
  DocumentPageLayout,
  CompanyHeader,
  DocumentTitle,
  DocumentInformation,
  ItemsTable,
  TotalsSection,
  AmountInWords,
  SignatureSection,
  TermsConditions,
  CompanyFooter,
} from '../../components';

export const SalesInvoiceTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  const color = company.accentColor || '#F2A93B';

  const termsEn = data.terms || 'Goods Sold Can Be Exchanges Or Returned Within 15 Days From The Date Of Purchase If The Goods Are In The Same Condition As The Time Of Purchase';
  const termsAr = data.termsAr || 'يمكن استبدال أو إرجاع السلع المباعة خلال 15 يوماً من تاريخ الشراء، شريطة أن تكون السلع بحالتها الأصلية وقت الشراء.';

  return (
    <DocumentPageLayout company={company}>
      {/* Header: EN info | Logo | AR info */}
      <CompanyHeader company={company} />

      {/* Document Title Bar */}
      <DocumentTitle
        title={data.title}
        titleAr={data.titleAr}
        color={color}
        bilingual={company.bilingual}
      />

      {/* Document Info: EN fields | Customer | AR fields */}
      <DocumentInformation
        leftInfoFields={data.leftInfoFields}
        counterpartyInfo={data.counterpartyInfo}
        color={color}
        bilingual={company.bilingual}
      />

      {/* Items Table */}
      <ItemsTable
        columns={data.columns}
        items={data.items}
        bilingual={company.bilingual}
      />

      {/* Amount in Words + Totals + Authorized Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginTop: '16px' }}>
        <div style={{ flex: 1 }}>
          <AmountInWords
            amountEn={data.amountInWords}
            amountAr={data.amountInWordsAr}
            color={color}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <TotalsSection
            summaryLines={data.summaryLines}
            bilingual={company.bilingual}
            color={color}
          />
          <div style={{ marginTop: '64px', textAlign: 'center', minWidth: '200px' }}>
            <div style={{ fontWeight: 600, color: '#333' }}>Authorized Signature</div>
          </div>
        </div>
      </div>

      <div className="avoid-break">
        {/* Terms & Conditions + QR */}
        <TermsConditions
          termsEn={termsEn}
          termsAr={termsAr}
          qrData={data.qrData}
          color={color}
        />

        {/* Footer */}
        <CompanyFooter company={company} color={color} />
      </div>
    </DocumentPageLayout>
  );
};
