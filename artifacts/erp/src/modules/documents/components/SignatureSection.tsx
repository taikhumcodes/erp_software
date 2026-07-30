/**
 * SignatureSection — Icon per role, bilingual titles, name/signature/date fields.
 * "Prepared By" gets a person icon, "Checked By" a clipboard-check icon,
 * and the "For Receiving Use" slot gets its own layout (no icon).
 */
import React from 'react';
import { SignatureSlot } from '../types';
import { UserRound, ClipboardCheck, Stamp } from 'lucide-react';

const iconForTitle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('prepared')) return UserRound;
  if (t.includes('checked') || t.includes('approved')) return ClipboardCheck;
  return Stamp;
};

export const SignatureSection: React.FC<{ signatures: SignatureSlot[]; bilingual?: boolean; color?: string; isCompact?: boolean }> = ({ signatures, bilingual = true, color = '#D4AF37', isCompact = false }) => {
  if (!signatures || signatures.length === 0) return null;

  const borderColor = '#d1d5db';
  const boxPadding = isCompact ? '4px 6px' : '10px';
  const iconSize = isCompact ? 14 : 16;
  const iconBoxSize = isCompact ? '24px' : '30px';
  const lineMarginTop = isCompact ? '4px' : '10px';
  const slotMarginTop = isCompact ? '2px' : '6px';
  const slotGap = isCompact ? '2px' : '6px';
  const sectionMarginBottom = isCompact ? '6px' : '14px';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${signatures.length}, 1fr)`,
      gap: '12px',
      marginBottom: sectionMarginBottom,
      fontSize: '10px',
    }}>
      {signatures.map((sig, idx) => {
        const Icon = iconForTitle(sig.title);
        return (
          <div key={idx} style={{
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            padding: boxPadding,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Role icon */}
            {!sig.isReceiver && (
              <div style={{
                width: iconBoxSize, height: iconBoxSize, borderRadius: '50%',
                backgroundColor: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: isCompact ? '2px' : '6px',
              }}>
                <Icon size={iconSize} style={{ color }} />
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
              <div style={{ width: '100%', marginTop: isCompact ? '4px' : '8px', display: 'flex', flexDirection: 'column', gap: isCompact ? '4px' : '8px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Received By :</span>
                  {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>استلم بواسطة</span>}
                  <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: lineMarginTop }} />
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Signature :</span>
                  {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>التوقيع</span>}
                  <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: lineMarginTop }} />
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Date :</span>
                  {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginRight: '8px', float: 'right', color: '#555' }}>التاريخ</span>}
                  <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: lineMarginTop }} />
                </div>
              </div>
            ) : (
              /* Standard signature slot */
              <div style={{ width: '100%', marginTop: slotMarginTop, display: 'flex', flexDirection: 'column', gap: slotGap }}>
                {sig.name && (
                  <div style={{ textAlign: 'center', fontWeight: 500, color: '#111' }}>
                    {sig.name}
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: 600 }}>Signature /</span>
                  {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '4px', color: '#555' }}>التوقيع</span>}
                  <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: lineMarginTop }} />
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Date /</span>
                  {bilingual && <span style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif', marginLeft: '4px', color: '#555' }}>التاريخ</span>}
                  <span style={{ marginLeft: '8px' }}>{sig.date || ''}</span>
                  <div style={{ borderBottom: `1px dashed ${borderColor}`, marginTop: lineMarginTop }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
