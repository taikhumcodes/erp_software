/**
 * Settings React Hooks
 *
 * Typed hooks for consuming settings in React components.
 * Automatically subscribe to SettingsService changes for reactive updates.
 */
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { SettingsService } from '../services/SettingsService';
import type {
  CompanyProfileSettings,
  BrandingSettings,
  DocumentLayoutSettings,
  DocumentTypographySettings,
  DocumentHeaderSettings,
  DocumentFooterSettings,
  DocumentTableSettings,
  DocumentTotalsSettings,
  DocumentSignatureSettings,
  DocumentColorSettings,
  NumberingSettings,
  CurrencySettings,
  LanguageSettings,
  SystemPreferencesSettings,
  AllDocumentSettings,
  SettingHistoryEntry,
} from '../types';
import {
  DEFAULT_COMPANY_PROFILE,
  DEFAULT_BRANDING,
  DEFAULT_DOCUMENT_LAYOUT,
  DEFAULT_DOCUMENT_TYPOGRAPHY,
  DEFAULT_DOCUMENT_HEADER,
  DEFAULT_DOCUMENT_FOOTER,
  DEFAULT_DOCUMENT_TABLE,
  DEFAULT_DOCUMENT_TOTALS,
  DEFAULT_DOCUMENT_SIGNATURES,
  DEFAULT_DOCUMENT_COLORS,
} from '../constants/defaults';

// ─── Generic Settings Hook ───────────────────────────────────────────────────

/**
 * Hook to load and subscribe to a specific setting.
 * Returns { data, isLoading, error, refetch }.
 */
export function useSettings<T extends Record<string, any>>(
  namespace: string,
  key: string,
  defaultValue: T,
): {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T>(
    () => SettingsService.get<T>(namespace, key) ?? defaultValue,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await SettingsService.load<T>(namespace, key);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
      setData(defaultValue);
    } finally {
      setIsLoading(false);
    }
  }, [namespace, key]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to changes
  useEffect(() => {
    return SettingsService.subscribe(() => {
      const cached = SettingsService.get<T>(namespace, key);
      if (cached) setData(cached);
    });
  }, [namespace, key]);

  return { data, isLoading, error, refetch: loadData };
}

// ─── Mutation Hook ────────────────────────────────────────────────────────────

/**
 * Hook for saving settings with loading/error state.
 */
export function useSettingsMutation<T extends Record<string, any>>(
  namespace: string,
  key: string,
): {
  save: (value: T) => Promise<T>;
  reset: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (value: T): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      return await SettingsService.save<T>(namespace, key, value);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save settings';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [namespace, key]);

  const reset = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await SettingsService.reset(namespace, key);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [namespace, key]);

  return { save, reset, isLoading, error };
}

// ─── History Hook ─────────────────────────────────────────────────────────────

export function useSettingsHistory(namespace: string, key: string) {
  const [history, setHistory] = useState<SettingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await SettingsService.getHistory(namespace, key);
      setHistory(data);
    } finally {
      setIsLoading(false);
    }
  }, [namespace, key]);

  useEffect(() => { load(); }, [load]);

  return { history, isLoading, refetch: load };
}

// ─── Typed Shorthand Hooks ────────────────────────────────────────────────────

export function useCompanyProfile() {
  return useSettings<CompanyProfileSettings>('company', 'profile', DEFAULT_COMPANY_PROFILE);
}

export function useBrandingSettings() {
  return useSettings<BrandingSettings>('branding', 'colors', DEFAULT_BRANDING);
}

export function useDocumentLayout() {
  return useSettings<DocumentLayoutSettings>('document', 'layout', DEFAULT_DOCUMENT_LAYOUT);
}

export function useDocumentTypography() {
  return useSettings<DocumentTypographySettings>('document', 'typography', DEFAULT_DOCUMENT_TYPOGRAPHY);
}

export function useDocumentHeader() {
  return useSettings<DocumentHeaderSettings>('document', 'header', DEFAULT_DOCUMENT_HEADER);
}

export function useDocumentFooter() {
  return useSettings<DocumentFooterSettings>('document', 'footer', DEFAULT_DOCUMENT_FOOTER);
}

export function useDocumentTable() {
  return useSettings<DocumentTableSettings>('document', 'table', DEFAULT_DOCUMENT_TABLE);
}

export function useDocumentTotals() {
  return useSettings<DocumentTotalsSettings>('document', 'totals', DEFAULT_DOCUMENT_TOTALS);
}

export function useDocumentSignatures() {
  return useSettings<DocumentSignatureSettings>('document', 'signatures', DEFAULT_DOCUMENT_SIGNATURES);
}

export function useDocumentColors() {
  return useSettings<DocumentColorSettings>('document', 'colors', DEFAULT_DOCUMENT_COLORS);
}

/**
 * Aggregate hook that loads all document settings at once.
 * Useful for the Document Engine and live preview.
 */
export function useAllDocumentSettings(): {
  settings: AllDocumentSettings;
  isLoading: boolean;
} {
  const layout = useDocumentLayout();
  const typography = useDocumentTypography();
  const header = useDocumentHeader();
  const footer = useDocumentFooter();
  const table = useDocumentTable();
  const totals = useDocumentTotals();
  const signatures = useDocumentSignatures();
  const colors = useDocumentColors();

  const isLoading = layout.isLoading || typography.isLoading || header.isLoading ||
    footer.isLoading || table.isLoading || totals.isLoading ||
    signatures.isLoading || colors.isLoading;

  return {
    settings: {
      layout: layout.data,
      typography: typography.data,
      header: header.data,
      footer: footer.data,
      table: table.data,
      totals: totals.data,
      signatures: signatures.data,
      colors: colors.data,
    },
    isLoading,
  };
}
