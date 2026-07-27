/**
 * Settings Service
 *
 * Centralized service for managing all ERP configuration.
 * Handles CRUD, validation, versioning, audit history, and defaults.
 */
import { prisma } from '../../lib/prisma.js';
import { getSchemaFor } from './settings.schema.js';
import { ValidationError, NotFoundError } from '../../errors/AppError.js';

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULTS: Record<string, Record<string, Record<string, unknown>>> = {
  company: {
    profile: {
      nameEn: 'Shield Max',
      nameAr: 'شركة البنيان للتجارة',
      tagline: '',
      commercialRegistration: '',
      companyRegistration: '',
      vatNumber: '',
      licenseNumber: '',
      phone: '',
      mobile: '',
      whatsapp: '',
      email: '',
      website: '',
      addressEn: 'Kuwait City, Kuwait',
      addressAr: 'مدينة الكويت، الكويت',
      city: 'Kuwait',
      country: 'Kuwait',
      postalCode: '',
      timezone: 'Asia/Kuwait',
      defaultCurrency: 'KWD',
      defaultLanguage: 'en',
      bilingual: true,
    },
  },
  branding: {
    colors: {
      primaryColor: '#000000',
      secondaryColor: '#555555',
      accentColor: '#D4AF37',
      borderColor: '#e2e8f0',
      textColor: '#111827',
      headerBackground: '#ffffff',
      footerBackground: '#ffffff',
      tableHeaderColor: '#000000',
      watermarkOpacity: 0.05,
      logoPosition: 'left',
      logoWidth: 'auto',
      logoHeight: '60px',
      qrPosition: 'top-right',
      qrSize: 100,
      themeId: 'shieldmax',
    },
  },
  document: {
    layout: {
      paperSize: 'A4',
      orientation: 'portrait',
      marginTop: '20mm',
      marginBottom: '20mm',
      marginLeft: '15mm',
      marginRight: '15mm',
      documentWidth: '210mm',
      contentWidth: '100%',
      bodyPadding: '0',
      headerHeight: '120px',
      footerHeight: '80px',
      maxTableWidth: '100%',
      sectionGap: '24px',
      lineGap: '8px',
      paragraphGap: '16px',
    },
    typography: {
      fontFamily: '"Inter", sans-serif',
      arabicFontFamily: '"IBM Plex Sans Arabic", sans-serif',
      titleSize: '24px',
      headingSize: '18px',
      bodySize: '12px',
      arabicSize: '12px',
      footerSize: '10px',
      tableSize: '12px',
      lineHeight: '1.5',
      letterSpacing: '0',
      boldWeight: '700',
      normalWeight: '400',
    },
    header: {
      alignment: 'space-between',
      logoWidth: 'auto',
      logoHeight: '60px',
      logoPosition: 'left',
      companyNamePosition: 'beside-logo',
      arabicNamePosition: 'below-english',
      showDivider: true,
      dividerColor: '#000000',
      dividerWidth: '2px',
      spacing: '24px',
      qrPosition: 'top-right',
      qrAlignment: 'right',
      qrSize: 100,
    },
    footer: {
      alignment: 'space-between',
      showDivider: true,
      dividerColor: '#000000',
      dividerWidth: '2px',
      showAddress: true,
      showPhone: true,
      showWebsite: true,
      showEmail: true,
      pageNumberPosition: 'center',
      footerHeight: '80px',
      footerPadding: '16px',
      customText: '',
    },
    table: {
      headerBackground: '#000000',
      headerTextColor: '#ffffff',
      borderWidth: '1px',
      borderColor: '#e2e8f0',
      cellPadding: '8px',
      rowHeight: 'auto',
      headerHeight: 'auto',
      alternateRowColor: '#fafafa',
      columnGap: '0',
      headerFont: '"Inter", sans-serif',
      bodyFont: '"Inter", sans-serif',
    },
    totals: {
      alignment: 'right',
      width: '50%',
      currencyAlignment: 'right',
      decimalPrecision: 3,
      showSubtotal: true,
      showDiscount: true,
      showVAT: true,
      grandTotalStyle: 'bold',
      amountInWordsPosition: 'below-totals',
      amountInWordsBackground: '#f8f9fa',
      amountInWordsPadding: '12px',
      amountInWordsBorder: '4px',
      amountInWordsFont: '14px',
    },
    signatures: {
      signatureCount: 4,
      preparedByLabel: 'Prepared By',
      preparedByLabelAr: 'أعد بواسطة',
      checkedByLabel: 'Checked By',
      checkedByLabelAr: 'فحص بواسطة',
      approvedByLabel: 'Approved By',
      approvedByLabelAr: 'اعتمد بواسطة',
      receivedByLabel: 'Received By',
      receivedByLabelAr: 'استلم بواسطة',
      deliveredByLabel: 'Delivered By',
      deliveredByLabelAr: 'سلّم بواسطة',
      signatureWidth: 'auto',
      signatureLineLength: '100%',
      spacing: '32px',
      alignment: 'space-between',
    },
    colors: {
      documentBackground: '#ffffff',
      titleColor: '#000000',
      borderColor: '#e2e8f0',
      tableHeaderBackground: '#000000',
      tableHeaderText: '#ffffff',
      tableBorderColor: '#e2e8f0',
      accentColor: '#D4AF37',
      watermarkOpacity: 0.05,
    },
  },
  numbering: {
    sequences: {
      purchaseOrderPrefix: 'PO',
      deliveryOrderPrefix: 'DO',
      salesInvoicePrefix: 'INV',
      paymentPrefix: 'PAY',
      separator: '-',
      includeYear: true,
      yearFormat: 'YYYY',
      zeroPadding: 6,
    },
  },
  currency: {
    format: {
      code: 'KWD',
      symbol: 'KD',
      position: 'before',
      decimalPrecision: 3,
      thousandsSeparator: ',',
      decimalSeparator: '.',
    },
  },
  language: {
    region: {
      defaultLanguage: 'en',
      bilingual: true,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      numberFormat: '#,###.###',
      timezone: 'Asia/Kuwait',
    },
  },
  system: {
    preferences: {
      autoSave: false,
      autoSaveInterval: 30,
      notifications: true,
    },
  },
};

function getDefault(namespace: string, key: string): Record<string, unknown> {
  return (DEFAULTS[namespace]?.[key] ?? {}) as Record<string, unknown>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class SettingsServiceImpl {

  /**
   * Get a specific setting by namespace + key.
   * Returns stored value merged with defaults.
   */
  async getSetting(namespace: string, key: string, companyId?: string | null) {
    const setting = await prisma.setting.findFirst({
      where: {
        namespace,
        key,
        companyId: companyId ?? null,
      },
    });

    const defaults = getDefault(namespace, key);
    const value = setting ? { ...defaults, ...(setting.value as Record<string, unknown>) } : defaults;

    return {
      namespace,
      key,
      value,
      version: setting?.version ?? 0,
      updatedAt: setting?.updatedAt ?? null,
      updatedBy: setting?.updatedBy ?? null,
    };
  }

  /**
   * Get all settings in a namespace.
   */
  async getByNamespace(namespace: string, companyId?: string | null) {
    const settings = await prisma.setting.findMany({
      where: {
        namespace,
        companyId: companyId ?? null,
      },
    });

    // Merge with defaults for all known keys in this namespace
    const knownKeys = Object.keys(DEFAULTS[namespace] ?? {});
    const result: Record<string, unknown> = {};

    for (const key of knownKeys) {
      const stored = settings.find(s => s.key === key);
      const defaults = getDefault(namespace, key);
      result[key] = stored
        ? { ...defaults, ...(stored.value as Record<string, unknown>) }
        : defaults;
    }

    // Also include any stored keys not in defaults (custom extensions)
    for (const setting of settings) {
      if (!knownKeys.includes(setting.key)) {
        result[setting.key] = setting.value;
      }
    }

    return result;
  }

  /**
   * Upsert a setting with validation, versioning, and audit trail.
   */
  async upsertSetting(
    namespace: string,
    key: string,
    value: unknown,
    userId: string,
    companyId?: string | null,
  ) {
    // Validate against schema
    const schema = getSchemaFor(namespace, key);
    const parseResult = schema.safeParse(value);
    if (!parseResult.success) {
      throw new ValidationError('Invalid settings value', {
        errors: parseResult.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const validated = parseResult.data;
    const cid = companyId ?? null;

    // Check for existing setting
    const existing = await prisma.setting.findFirst({
      where: {
        namespace,
        key,
        companyId: cid,
      },
    });

    if (existing) {
      // Update with history
      const newVersion = existing.version + 1;

      const [updated] = await prisma.$transaction([
        prisma.setting.update({
          where: { id: existing.id },
          data: {
            value: validated as any,
            version: newVersion,
            updatedBy: userId,
          },
        }),
        prisma.settingHistory.create({
          data: {
            settingId: existing.id,
            version: newVersion,
            oldValue: existing.value as any,
            newValue: validated as any,
            changedBy: userId,
          },
        }),
      ]);

      return updated;
    } else {
      // Create new
      const created = await prisma.setting.create({
        data: {
          namespace,
          key,
          value: validated as any,
          version: 1,
          companyId: cid,
          updatedBy: userId,
        },
      });

      return created;
    }
  }

  /**
   * Get version history for a setting.
   */
  async getHistory(namespace: string, key: string, companyId?: string | null) {
    const setting = await prisma.setting.findFirst({
      where: {
        namespace,
        key,
        companyId: companyId ?? null,
      },
      include: {
        history: {
          orderBy: { changedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!setting) return [];
    return setting.history;
  }

  /**
   * Reset settings to defaults.
   */
  async resetSettings(namespace: string, key?: string, userId?: string) {
    if (key) {
      // Reset specific key
      const existing = await prisma.setting.findFirst({
        where: {
          namespace,
          key,
          companyId: null,
        },
      });

      if (existing && userId) {
        const defaults = getDefault(namespace, key);
        await prisma.$transaction([
          prisma.settingHistory.create({
            data: {
              settingId: existing.id,
              version: existing.version + 1,
              oldValue: existing.value as any,
              newValue: defaults as any,
              changedBy: userId,
            },
          }),
          prisma.setting.delete({ where: { id: existing.id } }),
        ]);
      } else if (existing) {
        await prisma.setting.delete({ where: { id: existing.id } });
      }
    } else {
      // Reset entire namespace
      await prisma.setting.deleteMany({ where: { namespace } });
    }

    return { success: true };
  }

  /**
   * Export all settings as a single JSON object.
   */
  async exportAll() {
    const all = await prisma.setting.findMany({
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });

    const result: Record<string, Record<string, unknown>> = {};
    for (const setting of all) {
      if (!result[setting.namespace]) result[setting.namespace] = {};
      result[setting.namespace][setting.key] = setting.value;
    }

    return {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      settings: result,
    };
  }

  /**
   * Import settings from a JSON blob.
   * Validates each setting before saving.
   */
  async importAll(data: Record<string, Record<string, unknown>>, userId: string) {
    const errors: Array<{ namespace: string; key: string; error: string }> = [];
    const operations: Array<{ namespace: string; key: string; value: unknown }> = [];

    for (const [namespace, keys] of Object.entries(data)) {
      if (typeof keys !== 'object' || keys === null) continue;
      for (const [key, value] of Object.entries(keys)) {
        const schema = getSchemaFor(namespace, key);
        const result = schema.safeParse(value);
        if (result.success) {
          operations.push({ namespace, key, value: result.data });
        } else {
          errors.push({
            namespace,
            key,
            error: result.error.issues.map(i => i.message).join(', '),
          });
        }
      }
    }

    // Apply valid operations
    for (const op of operations) {
      await this.upsertSetting(op.namespace, op.key, op.value, userId);
    }

    return {
      imported: operations.length,
      errors,
    };
  }
}

export const settingsService = new SettingsServiceImpl();
