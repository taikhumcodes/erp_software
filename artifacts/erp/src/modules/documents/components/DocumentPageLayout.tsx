/**
 * Purpose: Provides the core A4 paper container for all documents.
 * Props: { children: React.ReactNode, company: CompanyProfile }
 * Data Source: Wrapped Document Template
 * Dependencies: DocumentConfig, CSS styles for print
 * Used By: All Document Templates
 * Safe Customization Points: Padding, margins, adding a full-page watermark background.
 */
import React from 'react';
import { CompanyProfile } from '../types';
import { useAllDocumentSettings } from '../../settings/hooks/useSettings';
import { defaultTheme, shieldMaxTheme } from '../themes';

export const DocumentPageLayout: React.FC<{ company: CompanyProfile, children: React.ReactNode, themeId?: string }> = ({ company, children, themeId = 'shieldmax' }) => {
  const { settings, isLoading } = useAllDocumentSettings();
  
  if (isLoading) return null; // Or a skeleton

  const { layout, typography, colors } = settings;

  return (
    <div className="document-page min-h-[297mm] print:min-h-0 print:m-0 print:p-0 print:w-full" style={{ 
      width: layout.documentWidth,
      padding: `${layout.marginTop} ${layout.marginRight} ${layout.marginBottom} ${layout.marginLeft}`,
      margin: '0 auto', 
      backgroundColor: colors.documentBackground, 
      color: colors.titleColor,
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      position: 'relative',
      fontFamily: typography.fontFamily,
      direction: 'ltr', // Force LTR as base, but allows bilingual inner content
      '--doc-title-size': typography.titleSize,
      '--doc-heading-size': typography.headingSize,
      '--doc-body-size': typography.bodySize,
      '--doc-arabic-size': typography.arabicSize,
      '--doc-line-height': typography.lineHeight,
      '--doc-accent-color': colors.accentColor,
      '--doc-border-color': colors.borderColor,
      '--doc-header-height': layout.headerHeight,
      '--doc-footer-height': layout.footerHeight,
      '--doc-section-gap': layout.sectionGap,
    } as React.CSSProperties}>
      {company.watermarkUrl && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: colors.watermarkOpacity,
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          <img src={company.watermarkUrl} alt="" style={{ width: '600px', height: 'auto' }} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {children}
      </div>
    </div>
  );
};
