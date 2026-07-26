# Settings Module Guide

The Settings Module is the centralized configuration hub for AL-BUNYAN ERP. It controls company branding, document layouts, sequences, currencies, and system preferences.

## Architecture

The Settings Module follows a robust backend-to-frontend singleton architecture to ensure any setting change is instantly reactive across the entire application without needing page reloads.

### Backend Structure
- **Database**: 
  - `Setting` model (Namespace + Key storage to allow dynamic addition of settings without schema migrations).
  - `SettingHistory` model (Audit trails tracking old and new values with user attribution).
- **Service (`SettingsService`)**: Provides CRUD, cache hydration, Zod validation, and default merging.
- **API**: Exposed via `/api/settings/*`.

### Frontend Structure
- **Global Store (`SettingsService.ts`)**: A singleton that fetches from the API, caches data, and exposes a pub/sub mechanism (`subscribe()`).
- **Hooks (`useSettings.ts`)**: React hooks like `useSettings` and `useAllDocumentSettings` automatically subscribe to the singleton and trigger re-renders when data changes.
- **Defaults (`defaults.ts`)**: Absolute single source of truth for fallback values to ensure zero crashes even if the backend is down.

## Document Engine Integration

The Document Engine (Phase 1) is deeply integrated with the Settings Module (Phase 2).
Document layouts (Purchase Orders, Delivery Orders, Sales Invoices) do NOT contain hardcoded padding, colors, or fonts.

Instead:
1. `DocumentPageLayout` uses `useAllDocumentSettings()`.
2. It maps these settings directly to CSS custom properties (e.g., `--doc-title-size`, `--doc-accent-color`).
3. Individual components (`CompanyHeader`, `ItemsTable`, `DocumentTitle`) inherit these CSS variables.

This provides **instant live previews** on the Settings page because altering a setting updates the CSS variables, which instantly repaints the document mock.

## Adding a New Setting

To add a new setting without modifying the database schema:
1. Add the type to `erp/src/modules/settings/types/index.ts`.
2. Add the default value to `erp/src/modules/settings/constants/defaults.ts`.
3. Add a Zod validation rule to `api-server/src/modules/settings/settings.schema.ts`.
4. Render the UI input in the appropriate Settings page using the `useSettings` hook.
