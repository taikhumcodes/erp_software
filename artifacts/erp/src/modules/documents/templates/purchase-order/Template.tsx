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

export const PurchaseOrderTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  // Single brand accent color across all document types, matching the
  // approved reference designs (previously hardcoded per-type colors).
  const color = company.accentColor || '#F2A93B';

  const termsEn = data.terms || 'Please supply the goods as per the specifications and agreed delivery schedule mentioned in this Purchase Order.';
  const termsAr = data.termsAr || 'يرجى توريد البضائع وفقاً للمواصفات وجدول التسليم المتفق عليه والمذكور في أمر الشراء هذا.';

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

      {/* Document Info: EN fields | Supplier | AR fields */}
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

      {/* Amount in Words + Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <AmountInWords
            amountEn={data.amountInWords}
            amountAr={data.amountInWordsAr}
            color={color}
          />
        </div>
        <TotalsSection
          summaryLines={data.summaryLines}
          bilingual={company.bilingual}
          color={color}
        />
      </div>

      {/* Prepared By / Checked By */}
      <SignatureSection signatures={data.signatures} bilingual={company.bilingual} color={color} isCompact={data.items && data.items.length >= 4} />

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
