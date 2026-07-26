import { DocumentData } from '../types';
import { CompanyProfileService } from './CompanyProfileService';
import html2pdf from 'html2pdf.js';

class Service {
  async prepareDocument(payload: Omit<DocumentData, 'company'>): Promise<DocumentData> {
    const company = await CompanyProfileService.getProfile();
    return {
      ...payload,
      company,
    };
  }

  triggerPrint() {
    window.print();
  }

  async downloadPdf(title: string, elementId = 'document-pdf-root') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('PDF root element not found');
      return;
    }

    const opt = {
      margin: 0,
      filename: `${title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  }
}

export const DocumentService = new Service();
