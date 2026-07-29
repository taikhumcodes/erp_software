/**
 * SettingsService — Frontend Singleton
 *
 * Centralized settings manager for the entire ERP frontend.
 * Responsibilities: load, cache, save, reset, subscribe, import/export.
 * All modules should consume settings through this service.
 */
import { api } from '@/lib/api';
import { DEFAULTS_MAP } from '../constants/defaults';

type Listener = () => void;

class SettingsServiceImpl {
  private cache: Map<string, Record<string, unknown>> = new Map();
  private loadPromises: Map<string, Promise<Record<string, unknown>>> = new Map();
  private listeners: Set<Listener> = new Set();

  // ─── Subscribe / Notify ───────────────────────────────────────────────────

  /**
   * Subscribe to settings changes. Returns unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // ─── Cache Helpers ────────────────────────────────────────────────────────

  private cacheKey(namespace: string, key: string): string {
    return `${namespace}.${key}`;
  }

  private getDefaults(namespace: string, key: string): Record<string, unknown> {
    return (DEFAULTS_MAP[this.cacheKey(namespace, key)] ?? {}) as Record<string, unknown>;
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  /**
   * Load a setting by namespace + key. Uses cache if available.
   */
  async load<T extends Record<string, unknown>>(namespace: string, key: string): Promise<T> {
    const ck = this.cacheKey(namespace, key);

    // Return from cache
    if (this.cache.has(ck)) {
      return this.cache.get(ck) as T;
    }

    // Coalesce concurrent requests
    if (this.loadPromises.has(ck)) {
      return this.loadPromises.get(ck) as Promise<T>;
    }

    const promise = this.fetchSetting<T>(namespace, key);
    this.loadPromises.set(ck, promise as Promise<Record<string, unknown>>);

    try {
      const result = await promise;
      this.cache.set(ck, result);
      return result;
    } finally {
      this.loadPromises.delete(ck);
    }
  }

  private async fetchSetting<T>(namespace: string, key: string): Promise<T> {
    try {
      const res = await api.get<any>(`/api/settings/${namespace}/${key}`);
      const value = res?.data?.value ?? res?.data ?? {};
      const defaults = this.getDefaults(namespace, key);
      return { ...defaults, ...value } as T;
    } catch {
      // API unavailable — return defaults
      return this.getDefaults(namespace, key) as T;
    }
  }

  /**
   * Load all settings in a namespace.
   */
  async loadNamespace(namespace: string): Promise<Record<string, unknown>> {
    try {
      const res = await api.get<any>(`/api/settings/${namespace}`);
      const data = res?.data ?? {};

      // Cache each key
      for (const [key, value] of Object.entries(data)) {
        const ck = this.cacheKey(namespace, key);
        const defaults = this.getDefaults(namespace, key);
        const merged = { ...defaults, ...(value as Record<string, unknown>) };
        this.cache.set(ck, merged);
      }

      return data;
    } catch {
      return {};
    }
  }

  // ─── Get (sync, from cache) ───────────────────────────────────────────────

  /**
   * Get a setting synchronously from cache.
   * Returns defaults if not yet loaded.
   */
  get<T extends Record<string, unknown>>(namespace: string, key: string): T {
    const ck = this.cacheKey(namespace, key);
    if (this.cache.has(ck)) {
      return this.cache.get(ck) as T;
    }
    return this.getDefaults(namespace, key) as T;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  /**
   * Save a setting to the backend and update cache.
   */
  async save<T extends Record<string, unknown>>(
    namespace: string,
    key: string,
    value: T,
  ): Promise<T> {
    const res = await api.put<any>(`/api/settings/${namespace}/${key}`, value);
    const ck = this.cacheKey(namespace, key);
    const defaults = this.getDefaults(namespace, key);
    const merged = { ...defaults, ...value } as T;
    this.cache.set(ck, merged);
    this.notify();
    return merged;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  /**
   * Reset a specific setting or entire namespace to defaults.
   */
  async reset(namespace: string, key?: string): Promise<void> {
    await api.post<any>('/api/settings/reset', { namespace, key });

    if (key) {
      const ck = this.cacheKey(namespace, key);
      this.cache.delete(ck);
    } else {
      // Clear all keys for this namespace
      for (const cachedKey of this.cache.keys()) {
        if (cachedKey.startsWith(`${namespace}.`)) {
          this.cache.delete(cachedKey);
        }
      }
    }

    this.notify();
  }

  async resetDatabase(password: string): Promise<void> {
    await api.post<any>('/api/settings/reset-database', { password });
  }

  // ─── Import / Export ──────────────────────────────────────────────────────

  async exportSettings(): Promise<Record<string, unknown>> {
    return api.get<any>('/api/settings/export');
  }

  async importSettings(data: Record<string, Record<string, unknown>>): Promise<{
    imported: number;
    errors: Array<{ namespace: string; key: string; error: string }>;
  }> {
    const res = await api.post<any>('/api/settings/import', { settings: data });
    // Clear entire cache after import
    this.cache.clear();
    this.notify();
    return res?.data ?? { imported: 0, errors: [] };
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getHistory(namespace: string, key: string) {
    try {
      const res = await api.get<any>(`/api/settings/${namespace}/${key}/history`);
      return res?.data ?? [];
    } catch {
      return [];
    }
  }

  // ─── Logo Upload ──────────────────────────────────────────────────────────

  async uploadLogo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await api.postFormData<any>('/api/settings/upload/logo', formData);
    const url = res?.data?.url ?? '';
    // Update company profile cache
    const ck = this.cacheKey('company', 'profile');
    if (this.cache.has(ck)) {
      const current = this.cache.get(ck)!;
      this.cache.set(ck, { ...current, logoUrl: url });
    }
    this.notify();
    return { url };
  }

  // ─── Clear Cache ──────────────────────────────────────────────────────────

  clearCache() {
    this.cache.clear();
  }
}

export const SettingsService = new SettingsServiceImpl();
