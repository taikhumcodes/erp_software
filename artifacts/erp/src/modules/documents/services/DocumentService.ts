import { DocumentData } from '../types';
import { CompanyProfileService } from './CompanyProfileService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

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

  /**
   * Renders the document node to a PDF.
   *
   * Previously this used html2pdf.js's automatic "legacy" page-slicing,
   * which measured the *live* DOM node — complete with its on-screen drop
   * shadow, `min-height: 297mm` floor, and content-box sizing. Any of those
   * could push the captured canvas a few pixels past one A4 page, and
   * html2pdf would then dutifully add a second (and sometimes a near-empty
   * third) page for that overflow. The fix is to capture a print-safe clone
   * at an exact, known pixel size and slice it ourselves, so the page count
   * always matches the real content height.
   */
  async downloadPdf(title: string, elementId = 'document-pdf-root') {
    const original = document.getElementById(elementId);
    if (!original) {
      console.error('PDF root element not found');
      return;
    }

    // Work on an off-screen clone so we never flash style changes on the
    // real page, and so we have full control over exactly what gets
    // captured — no shadow, no centering margin, no min-height floor.
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    clone.style.minHeight = '0';
    clone.style.height = 'auto';
    clone.style.width = `${A4_WIDTH_MM}mm`;
    clone.style.boxSizing = 'border-box';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '-99999px'; // off-screen, but still laid out/rendered
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
      const pageHeightPx = (canvas.width / A4_WIDTH_MM) * A4_HEIGHT_MM;
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

      for (let page = 0; page < totalPages; page++) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);
        // Skip a trailing slice that's only a rounding sliver (< 2px) —
        // this is exactly the kind of near-empty leftover page that used
        // to show up as a blank page 2 or 3.
        if (sliceHeightPx < 2) continue;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(
          canvas,
          0, page * pageHeightPx, canvas.width, sliceHeightPx,
          0, 0, canvas.width, sliceHeightPx
        );

        const imgData = sliceCanvas.toDataURL('image/jpeg', 0.98);
        const sliceHeightMm = (sliceHeightPx / canvas.width) * A4_WIDTH_MM;

        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, sliceHeightMm);
      }

      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  }
}

export const DocumentService = new Service();
