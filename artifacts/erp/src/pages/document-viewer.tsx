import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Printer, Download } from 'lucide-react';
import { DocumentRegistry, DocumentData, DocumentService, DocumentType } from '@/modules/documents';
import { adaptPurchaseOrder, adaptDeliveryOrder, adaptSalesInvoice } from '@/modules/documents/adapters';
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

        if (!apiEndpoint) {
          throw new Error(`No API endpoint configured for ${docRegistration!.type}`);
        }

        const res = await api.get<any>(apiEndpoint);
        const rawData = res.data.data || res.data;
        
        // Map raw data using the appropriate adapter
        let adaptedPayload: Omit<DocumentData, 'company'>;
        if (docRegistration!.type === 'PURCHASE_ORDER') adaptedPayload = adaptPurchaseOrder(rawData);
        else if (docRegistration!.type === 'DELIVERY_ORDER') adaptedPayload = adaptDeliveryOrder(rawData);
        else if (docRegistration!.type === 'SALES_INVOICE') adaptedPayload = adaptSalesInvoice(rawData);
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
    <div className="print:m-0 print:p-0 min-h-screen bg-gray-100 flex flex-col items-center py-8 print:bg-white print:py-0">
      <div className="print:hidden mb-6 flex gap-4 w-full max-w-[210mm] justify-end">
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm text-sm font-medium rounded hover:bg-gray-50 text-gray-700"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button 
          onClick={() => DocumentService.downloadPdf(data.title)} 
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
