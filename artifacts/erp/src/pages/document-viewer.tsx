import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Printer, Download } from 'lucide-react';
import { DocumentRegistry, DocumentData, DocumentService, DocumentType } from '@/modules/documents';
import { adaptPurchaseOrder, adaptDeliveryOrder, adaptSalesInvoice } from '@/modules/documents/adapters';
import { QuotationAdapter } from '@/modules/documents/adapters/QuotationAdapter';
import { api } from '@/lib/api';

/**
 * Universal viewer for any registered document type.
 * Route expected format: /documents/:typeSlug/:id
 * E.g., /documents/sales-invoice/123
 */
export default function DocumentViewer() {
  const [location] = useLocation();
  const { id } = useParams<{ id: string }>();
  
  // Find which document type matches the current route
  const docRegistration = DocumentRegistry.getAll().find(doc => location.startsWith(doc.route));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [paymentStatusOverride, setPaymentStatusOverride] = useState<string>('');
  
  const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setPaymentStatusOverride(status);
    if (data) {
       const newData = { ...data };
       if (newData.leftInfoFields) {
         const leftInfo = [...newData.leftInfoFields];
         const idx = leftInfo.findIndex(f => f.label === 'Payment Status');
         if (idx !== -1) {
           leftInfo[idx] = { ...leftInfo[idx], value: status || '—' };
           newData.leftInfoFields = leftInfo;
           setData(newData);
         }
       }
    }
  };

  useEffect(() => {
    if (!docRegistration || !id) {
      setError('Invalid document route or ID');
      setLoading(false);
      return;
    }

    async function loadDocument() {
      try {
        setLoading(true);
        // Map document type to the corresponding API endpoint to fetch snapshot/data
        let apiEndpoint = '';
        if (docRegistration!.type === 'PURCHASE_ORDER') apiEndpoint = `/api/purchases/${id}`;
        if (docRegistration!.type === 'DELIVERY_ORDER') apiEndpoint = `/api/delivery-orders/${id}`;
        if (docRegistration!.type === 'SALES_INVOICE') apiEndpoint = `/api/sales/${id}`;
        if (docRegistration!.type === 'QUOTATION') apiEndpoint = `/api/quotations/${id}`;

        if (!apiEndpoint) {
          throw new Error(`No API endpoint configured for ${docRegistration!.type}`);
        }

        const res = await api.get<any>(apiEndpoint);
        const rawData = res?.data?.data || res?.data || res;
        
        // Map raw data using the appropriate adapter
        let adaptedPayload: Omit<DocumentData, 'company'>;
        if (docRegistration!.type === 'PURCHASE_ORDER') adaptedPayload = adaptPurchaseOrder(rawData);
        else if (docRegistration!.type === 'DELIVERY_ORDER') adaptedPayload = adaptDeliveryOrder(rawData);
        else if (docRegistration!.type === 'SALES_INVOICE') adaptedPayload = adaptSalesInvoice(rawData);
        else if (docRegistration!.type === 'QUOTATION') adaptedPayload = new QuotationAdapter().adapt(rawData);
        else throw new Error('Adapter not found');

        // Pass the adapted payload to the DocumentService to attach company profile and prepare it
        const finalDocument = await DocumentService.prepareDocument(adaptedPayload);
        
        setData(finalDocument);
      } catch (err: any) {
        console.error('Failed to load document:', err);
        setError(err.message || 'Failed to load document data.');
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [docRegistration, id]);

  useEffect(() => {
    // Automatically trigger print dialog once data is loaded and rendered,
    // if the URL contains ?print=true (which we will use for the "Print" buttons in the app)
    if (data && !loading && window.location.search.includes('print=true')) {
      // Small timeout to ensure fonts and layout are fully applied
      setTimeout(() => window.print(), 500);
    }
  }, [data, loading]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Document...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!data || !docRegistration) return <div className="p-8 text-center">Document not found</div>;

  const TemplateComponent = docRegistration.templateComponent;

  return (
    <div id="document-viewer-container" className="print:m-0 print:p-0 min-h-screen bg-gray-100 flex flex-col items-center py-8 print:bg-white print:py-0">
      <div className="print:hidden mb-6 flex flex-wrap gap-4 w-full max-w-[210mm] justify-end items-center">
        {data?.leftInfoFields?.some(f => f.label === 'Payment Status') && (
          <div className="flex items-center gap-2 mr-auto bg-white px-3 py-2 border shadow-sm rounded">
            <label className="text-sm font-medium text-gray-700">Payment Status:</label>
            <select 
              value={paymentStatusOverride}
              onChange={handlePaymentStatusChange}
              className="text-sm border-gray-300 rounded focus:ring-primary/50"
            >
              <option value="">Default / Blank</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        )}
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm text-sm font-medium rounded hover:bg-gray-50 text-gray-700"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button 
          onClick={() => {
            let filename = data.title || 'Document';
            const docNum = data.documentNumber || id || '';
            const match = docNum.match(/\d+$/);
            const shortNum = match ? match[0].slice(-3).padStart(3, '0') : docNum;
            if (data.type === 'SALES_INVOICE') filename = `INV-${shortNum}`;
            else if (data.type === 'PURCHASE_ORDER') filename = `PO-${shortNum}`;
            else if (data.type === 'DELIVERY_ORDER') filename = `DO-${shortNum}`;
            else if (data.type === 'QUOTATION') filename = `Quotation-${shortNum}`;
            DocumentService.downloadPdf(filename);
          }} 
          className="flex items-center gap-2 px-4 py-2 bg-black text-white shadow-sm text-sm font-medium rounded hover:bg-gray-900"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>
      <div id="document-pdf-root" className="print:shadow-none shadow-lg print:w-full bg-white relative">
        <TemplateComponent data={data} />
      </div>
    </div>
  );
}
