# Feature flags — a worked example

The registry, the one evaluation function, and the provider fed from a route group's layout.

```ts
// the shared constants — every flag code reads, with its kind and default
export type FlagKind = "release" | "ops" | "experiment";

export const FEATURE_FLAGS = {
  NEW_DASHBOARD: { kind: "release", default: false },
  SEARCH_ENABLED: { kind: "ops", default: true },
} as const satisfies Record<string, { kind: FlagKind; default: boolean }>;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;
export const FEATURE_FLAG_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
```

```ts
// the flag service — the ladder lives here and nowhere else
export async function evaluateFlag(name: FeatureFlagName, countryCode?: string): Promise<boolean> {
  const catalogue = await readCatalogue(); // in-process → shared → store; last read on failure; null if never read
  const record = catalogue?.[name];
  if (!record || record.archivedAt || record.status !== "published") return FEATURE_FLAGS[name].default;
  if (!record.enabled) return false;
  if (record.enabledCountries.length === 0) return true;
  return countryCode ? record.enabledCountries.includes(countryCode) : false;
}
```

```tsx
// a route group's layout — flags resolve behind their own Suspense; the provider never fetches
export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <FlaggedShell>{children}</FlaggedShell>
    </Suspense>
  );
}

async function FlaggedShell({ children }: { children: React.ReactNode }) {
  const flags = await getFeatureFlags(await getViewerCountry()); // deduplicated per request
  return <FeatureFlagProvider flags={flags}>{children}</FeatureFlagProvider>;
}

// any Client Component below the provider
function DashboardSwitch({ children }: { children: React.ReactNode }) {
  const { isEnabled } = useFeatureFlag("NEW_DASHBOARD"); // a typo is a compile error
  return isEnabled ? children : <LegacyDashboard />;
}
```
