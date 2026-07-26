/**
 * SignatureSection — Stamp icon, bilingual titles, name/signature/date fields.
 * Supports "For Receiving Use" column with Received By / Signature / Date labels.
 */
import React from 'react';
import { SignatureSlot } from '../types';
import { Stamp } from 'lucide-react';

export const SignatureSection: React.FC<{ signatures: SignatureSlot[]; bilingual?: boolean; color?: string }> = ({ signatures, bilingual = true, color = '#D4AF37' }) => {
  if (!signatures || signatures.length === 0) return null;

  const borderColor = '#d1d5db';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${signatures.length}, 1fr)`,
      gap: '12px',
      marginBottom: '14px',
      fontSize: '10px',
    }}>
      {signatures.map((sig, idx) => (
        <div key={idx} style={{
          border: `1px solid ${borderColor}`,
          borderRadius: '4px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Stamp icon */}
          {!sig.isReceiver && (
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: `2px solid ${color}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '6px',
            }}>
              <Stamp size={16} style={{ color: color }} />
            </div>
          )}

          {/* Title */}
          <div style={{ fontWeight: 700, color: '#111', textAlign: 'center' }}>
            {sig.title}
          </div>
          {bilingual && sig.titleAr && (
            <div style={{
              fontWeight: 600, color: '#555', textAlign: 'center',
              fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: '9px', marginTop: '1px',
            }}>
              {sig.titleAr}
            </div>
          )}

          {sig.isReceiver ? (
            /* "For Receiving Use" layout */
            <div style={{ width: '100%', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Received By :</span>
                {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>استلم بواسطة</span>}
                <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: '10px' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Signature :</span>
                {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>التوقيع</span>}
                <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: '10px' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Date :</span>
                {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>التاريخ</span>}
                <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: '10px' }} />
              </div>
            </div>
          ) : (
            /* Standard signature slot */
            <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sig.name && (
                <div style={{ textAlign: 'center', fontWeight: 500, color: '#111' }}>
                  {sig.name}
                </div>
              )}
              <div>
                <span style={{ fontWeight: 600 }}>Signature /</span>
                {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '4px', color: '#555' }}>التوقيع</span>}
                <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: '10px' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Date /</span>
                {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '4px', color: '#555' }}>التاريخ</span>}
                <span style={{ marginLeft: '8px' }}>{sig.date || ''}</span>
                <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: '10px' }} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
