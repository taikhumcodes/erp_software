# AL-BUNYAN ERP – ENTERPRISE DOCUMENT ENGINE GUIDE

The Document Engine is a robust, clean-architecture system for generating, previewing, printing, and exporting dynamic business documents (e.g., Purchase Orders, Delivery Orders, Sales Invoices). It avoids redundant fetching by utilizing a centralized `CompanyProfileService` and standardizing outputs across print and PDF formats.

---

## 1. How to Register a New Document

The Document Engine uses a **Registry Pattern**. All documents must be registered via `DocumentRegistry.register()`.

To register a new document:
1. Open `src/modules/documents/register.ts`.
2. Add your new document registration object:

```typescript
DocumentRegistry.register({
  type: 'QUOTATION',                   // Unique identifier
  displayName: 'Quotation',            // Human-readable name
  route: '/documents/quotation',       // The viewer base route
  templateComponent: QuotationTemplate, // The React Component that renders the document
  supportedActions: ['PREVIEW', 'PRINT', 'PDF']
});
```

---

## 2. How to Create a New Template

Templates reside in `src/modules/documents/templates/<document-type>/Template.tsx`.
They consume standard components to guarantee structural consistency.

1. Create your template directory and file.
2. Import the primitives from `../../components`.
3. Wrap your layout in `<DocumentPageLayout>`.

```tsx
import React from 'react';
import { DocumentData } from '../../types';
import { 
  DocumentPageLayout, CompanyHeader, DocumentTitle, 
  DocumentInformation, ItemsTable, TotalsSection, CompanyFooter 
} from '../../components';

export const QuotationTemplate: React.FC<{ data: DocumentData }> = ({ data }) => {
  const { company } = data;

  return (
    <DocumentPageLayout company={company}>
      <CompanyHeader company={company} />
      
      <div className="mb-6">
        <DocumentTitle 
          title={data.title} 
          documentNumber={data.documentNumber} 
          date={data.date} 
          color={company.primaryColor} 
          bilingual={company.bilingual} 
        />
      </div>

      <DocumentInformation fields={data.infoFields} title="Quote To" />
      <ItemsTable columns={data.columns} items={data.items} bilingual={company.bilingual} />
      <TotalsSection summaryLines={data.summaryLines} bilingual={company.bilingual} />
      <CompanyFooter company={company} color={company.primaryColor} />
    </DocumentPageLayout>
  );
};
```

---

## 3. How to Connect a New Data Source (Adapters)

Because the Document Engine uses standard data shapes (`DocumentData`), you must adapt your backend API response to match this shape.

1. Create an adapter in `src/modules/documents/adapters/QuotationAdapter.ts`.
2. Map your API model to `Omit<DocumentData, 'company'>`:

```typescript
import { DocumentData } from '../types';

export function adaptQuotation(apiData: any): Omit<DocumentData, 'company'> {
  return {
    type: 'QUOTATION',
    title: 'Quotation',
    titleAr: 'عرض سعر',
    documentNumber: apiData.quoteNumber,
    date: new Date(apiData.createdAt).toLocaleDateString(),
    infoFields: [
      { label: 'Customer Name', value: apiData.customerName }
    ],
    columns: [
      { key: 'productName', label: 'Item Name', width: '60%' },
      { key: 'price', label: 'Price', format: 'currency', width: '40%' }
    ],
    items: apiData.items.map(item => ({ productName: item.name, price: item.price })),
    summaryLines: [
      { label: 'Grand Total', value: apiData.total, isBold: true, hasBorderTop: true }
    ],
    signatures: [
      { title: 'Authorized Signatory' }
    ]
  };
}
```

3. Update the `DocumentViewer` (`src/pages/document-viewer.tsx`) to handle your new type:

```typescript
// Inside DocumentViewer:
let adaptedPayload;
if (docRegistration.type === 'QUOTATION') {
    adaptedPayload = adaptQuotation(rawData);
}
```

---

## 4. How to Expose a New Document Route

To allow users to print or preview the new document from anywhere in the application, simply call `window.open` linking to the registry route:

```tsx
// Inside your UI (e.g., quotations.tsx):

<DropdownMenuItem onClick={() => {
  // Opens in standard Preview Mode
  window.open(`/documents/quotation/${quote.id}`, '_blank');
}}>
  Preview Quotation
</DropdownMenuItem>

<DropdownMenuItem onClick={() => {
  // Opens and immediately launches the Browser Print dialog
  window.open(`/documents/quotation/${quote.id}?print=true`, '_blank');
}}>
  Print Quotation
</DropdownMenuItem>
```

This bypasses the main application layout (no sidebars/navbars) and directly renders the `DocumentViewer`.
