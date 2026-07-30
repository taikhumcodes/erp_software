import React from 'react';
import { DocumentData } from '../../types';
import {
  DocumentPageLayout,
  CompanyHeader,
  DocumentTitle,
  DocumentInformation,
  DeliveryDetailsGrid,
  ItemsTable,
  SignatureSection,
  TermsConditions,
  CompanyFooter,
} from '../../components';

export const DeliveryOrderTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  const color = company.accentColor || '#F2A93B';

  const termsEn = data.terms || "Customer's signature confirms receipt of the goods in good condition and correct quantity.";
  const termsAr = data.termsAr || 'يؤكد توقيع العميل استلام البضائع بحالة جيدة وبالكمية الصحيحة.';

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

      {/* Delivery Details Grid (Address, Site, Date, Driver, Vehicle, etc.) */}
      {data.deliveryDetails && data.deliveryDetails.length > 0 && (
        <DeliveryDetailsGrid details={data.deliveryDetails} color={color} />
      )}

      {/* Items Table with summary row */}
      <ItemsTable
        columns={data.columns}
        items={data.items}
        bilingual={company.bilingual}
        itemsSummary={data.itemsSummary}
      />

      {/* Notes section */}
      {data.notes && (
        <div style={{
          borderLeft: `3px solid ${color}`,
          backgroundColor: `${color}12`,
          borderRadius: '3px',
          marginTop: '10px',
          marginBottom: '14px',
          fontSize: '10px',
          padding: '8px 12px',
        }}>
          <div style={{ fontWeight: 700, color: '#111', marginBottom: '2px' }}>
            Notes / ملاحظات
          </div>
          <div style={{ lineHeight: 1.5, color: '#374151' }}>
            {data.notes}
          </div>
        </div>
      )}

      {/* Prepared By / Checked By / For Receiving Use */}
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
