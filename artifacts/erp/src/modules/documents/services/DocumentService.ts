import { DocumentData } from '../types';
import { CompanyProfileService } from './CompanyProfileService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

class Service {
  async prepareDocument(payload: Omit<DocumentData, 'company'>): Promise<DocumentData> {
    const company = await CompanyProfileService.getProfile();
    const finalDoc: DocumentData = {
      ...payload,
      company,
    };
    if (company.qrCodeUrl) {
      finalDoc.qrData = company.qrCodeUrl;
    }
    return finalDoc;
  }

  triggerPrint() {
    window.print();
  }

  /**
   * Renders the document to a single-page A4 PDF. Always one page, no exceptions.
   */
  async downloadPdf(title: string, elementId = 'document-pdf-root') {
    const original = document.getElementById(elementId);
    if (!original) {
      console.error('PDF root element not found');
      return;
    }

    // Clone off-screen
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.width = `${A4_WIDTH_MM}mm`;
    clone.style.boxSizing = 'border-box';
    clone.style.setProperty('box-shadow', 'none', 'important');

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '-99999px';
    wrapper.style.width = `${A4_WIDTH_MM}mm`;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      // Place the entire captured image on one page, scaled to fit A4 width.
      // If it's taller than 297mm, it gets compressed to fit. Simple.
      const naturalHeightMm = (canvas.height / canvas.width) * A4_WIDTH_MM;
      const fitHeight = Math.min(naturalHeightMm, A4_HEIGHT_MM);
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, fitHeight);

      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  }
}

export const DocumentService = new Service();

