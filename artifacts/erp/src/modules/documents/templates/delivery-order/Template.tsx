import React from 'react';
import { DocumentData } from '../../types';
import {
  DocumentPageLayout,
  CompanyHeader,
  DocumentTitle,
  DocumentInformation,
  DeliveryDetailsGrid,
  ItemsTable,
  CompanyFooter,
  CustomFooter,
} from '../../components';

export const DeliveryOrderTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  const color = '#dc2626'; // Red for Delivery Order

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
          border: '1px solid #e5e7eb',
          marginBottom: '12px',
          fontSize: '10px',
        }}>
          <div style={{
            padding: '4px 10px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Notes / ملاحظات</span>
          </div>
          <div style={{ padding: '6px 10px', lineHeight: 1.5 }}>
            {data.notes}
          </div>
        </div>
      )}

      {/* Custom Terms & Signatures + QR Code */}
      <CustomFooter qrData={data.qrData} termsEn={company.termsEn} termsAr={company.termsAr} />

      {/* Footer */}
      <CompanyFooter company={company} color={color} />
    </DocumentPageLayout>
  );
};
