import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const DEFAULT_TERMS_EN = 'Goods sold can be exchanged or returned within 15 days from the date of purchase if the goods are in same condition as the time of purchase';
const DEFAULT_TERMS_AR = 'يمكن استبدال أو إرجاع السلع المباعة خلال 15 يوما من تاريخ الشراء، شريطة أن تكون السلع بحالتها الأصلية وقت الشراء';

export const CustomFooter: React.FC<{ qrData?: string; termsEn?: string; termsAr?: string }> = ({ qrData, termsEn, termsAr }) => {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '20px', pageBreakInside: 'avoid' }}>
      {/* Terms and Signatures Box */}
      <div style={{ 
        flex: 1, 
        border: '1px solid #9ca3af', 
        borderRadius: '6px', 
        padding: '12px 16px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Arabic Terms */}
        <div style={{ 
          fontFamily: '"IBM Plex Sans Arabic", sans-serif', 
          fontWeight: 700, 
          fontSize: '11px', 
          color: '#111', 
          direction: 'rtl',
          textAlign: 'center' 
        }}>
          {termsAr || DEFAULT_TERMS_AR}
        </div>
        
        {/* English Terms */}
        <div style={{ 
          fontWeight: 600, 
          fontSize: '10px', 
          color: '#111',
          textAlign: 'center'
        }}>
          {termsEn || DEFAULT_TERMS_EN}
        </div>

        {/* Signatures */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          width: '100%', 
          marginTop: '24px',
          fontWeight: 700, 
          fontSize: '11px', 
          color: '#111' 
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Receiver Sign.</span>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>توقيع المستلم</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Signature</span>
            <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>التوقيع</span>
          </div>
        </div>
      </div>

      {/* QR Code */}
      {qrData && (
        <div style={{ flexShrink: 0, padding: '4px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fff' }}>
          <QRCodeSVG value={qrData} size={84} level="M" />
        </div>
      )}
    </div>
  );
};
