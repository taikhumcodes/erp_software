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

export const QuotationTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  const color = company.accentColor || '#6B46C1'; // Distinct purple/indigo for Quotations

  const termsEn = data.terms || 'Quotation is valid for 30 days unless otherwise specified.\nPrices are subject to change without notice.';
  const termsAr = data.termsAr || 'عرض السعر صالح لمدة 30 يوماً ما لم يذكر خلاف ذلك.\nالأسعار عرضة للتغيير دون إشعار مسبق.';

  const enrichedIssuerInfo = data.issuerInfo ? {
    ...data.issuerInfo,
    fields: [
      { 
        label: 'Address', 
        labelAr: 'العنوان', 
        value: data.issuerInfo.fields.find(f => f.label === 'Our Address')?.value || company.addressEn || '—' 
      },
      { 
        label: 'Mobile No.', 
        labelAr: 'رقم الجوال', 
        value: company.mobile || company.phone || '—' 
      }
    ]
  } : undefined;

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

      {/* Document Info: Issuer (if any) | EN/AR Fields | Counterparty */}
      <DocumentInformation
        leftInfoFields={data.leftInfoFields}
        counterpartyInfo={data.counterpartyInfo}
        issuerInfo={enrichedIssuerInfo}
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

      {/* Notes Section (if any) */}
      {data.notes && (
        <div style={{ marginTop: '12px', fontSize: '10px' }}>
          <strong style={{ color }}>Notes / Remarks:</strong>
          <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{data.notes}</p>
        </div>
      )}

      {/* Small Authorized Signature on the right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: '8px' }}>
        <div style={{ width: '180px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '10px', color: color, textTransform: 'uppercase' }}>
            Authorized Signature
          </div>
          <div style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 700, fontSize: '10px', color: '#555', direction: 'rtl' }}>
            التوقيع المعتمد
          </div>
          <div style={{ borderBottom: '1px dashed #9ca3af', marginTop: '35px' }}></div>
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
