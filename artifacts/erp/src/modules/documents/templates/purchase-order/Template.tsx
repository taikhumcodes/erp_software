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
  CompanyFooter,
  CustomFooter,
} from '../../components';

export const PurchaseOrderTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;
  const color = '#eba225ff'; // Orange for Purchase Order

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

      {/* Totals */}
      <TotalsSection
        summaryLines={data.summaryLines}
        bilingual={company.bilingual}
        color={color}
      />

      {/* Amount in Words */}
      <AmountInWords
        amountEn={data.amountInWords}
        amountAr={data.amountInWordsAr}
        color={color}
      />

      {/* Custom Terms & Signatures + QR Code */}
      <CustomFooter qrData={data.qrData} />

      {/* Footer */}
      <CompanyFooter company={company} color={color} />
    </DocumentPageLayout>
  );
};
