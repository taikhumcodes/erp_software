import React, { useState } from 'react';
import type { AllDocumentSettings } from '../types';

interface DocumentPreviewProps {
  settings: AllDocumentSettings;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ settings }) => {
  const [docType, setDocType] = useState<'PO' | 'DO' | 'SI'>('PO');

  // The scaling trick: we render a real A4 page (210mm x 297mm) inside a container,
  // and use CSS transform: scale() to fit it into the preview window.
  // In a real implementation, we would use a ResizeObserver to calculate the exact scale,
  // or a wrapper component that handles the scaling automatically.

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="mb-4 bg-background border rounded-lg p-1 flex gap-1 shadow-sm">
        <button 
          className={`px-3 py-1.5 text-xs font-medium rounded ${docType === 'PO' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          onClick={() => setDocType('PO')}
        >
          Purchase Order
        </button>
        <button 
          className={`px-3 py-1.5 text-xs font-medium rounded ${docType === 'DO' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          onClick={() => setDocType('DO')}
        >
          Delivery Order
        </button>
        <button 
          className={`px-3 py-1.5 text-xs font-medium rounded ${docType === 'SI' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          onClick={() => setDocType('SI')}
        >
          Sales Invoice
        </button>
      </div>

      <div className="relative flex-1 w-full flex justify-center overflow-hidden">
        {/* We use a fixed aspect ratio container to simulate A4 paper (1 : 1.414) */}
        <div 
          className="bg-white shadow-xl origin-top"
          style={{
            width: '400px', // Scaled down width
            height: '565px', // Scaled down A4 height
            // We pass the settings CSS variables down to this container so the real components pick them up
            '--doc-font-family': settings.typography.fontFamily,
            '--doc-title-size': settings.typography.titleSize,
            '--doc-body-size': settings.typography.bodySize,
            '--doc-header-height': settings.layout.headerHeight,
            '--doc-footer-height': settings.layout.footerHeight,
            '--doc-primary-color': settings.colors.documentBackground,
            padding: settings.layout.bodyPadding,
          } as React.CSSProperties}
        >
          {/* 
            In the final step (Phase 4), we will mount the real DocumentPageLayout here.
            For now, during UI build, we show a mock representation of the layout.
          */}
          <div className="flex flex-col h-full border border-dashed border-gray-300 p-4">
            <div className="h-20 border-b-2 border-black flex justify-between items-center mb-4">
              <div className="text-xl font-bold">LOGO</div>
              <div className="text-right">
                <div className="font-bold">COMPANY NAME</div>
                <div className="text-sm">address / phone</div>
              </div>
            </div>
            
            <div className="text-center font-bold text-lg mb-4">
              {docType === 'PO' ? 'PURCHASE ORDER' : docType === 'DO' ? 'DELIVERY ORDER' : 'SALES INVOICE'}
            </div>
            
            <div className="flex-1 border bg-gray-50 flex items-center justify-center text-gray-400">
              [ Items Table Area ]
            </div>
            
            <div className="h-16 mt-4 flex justify-between border-t pt-2">
              <div>Signature 1</div>
              <div>Signature 2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
