/** Catalog of append-only activity events. The Actividad type filter reads this list. */

export const AUDIT_TONES = ["neutral", "success", "warning", "danger"] as const;

export type AuditTone = (typeof AUDIT_TONES)[number];

export interface AuditEventDefinition {
  readonly i18nKey: string;
  readonly tone: AuditTone;
}

export const AUDIT_CATALOG = {
  "auth.login": { i18nKey: "activity.events.auth.login", tone: "success" },
  "auth.refresh": { i18nKey: "activity.events.auth.refresh", tone: "neutral" },
  "auth.logout": { i18nKey: "activity.events.auth.logout", tone: "neutral" },
} as const satisfies Record<string, AuditEventDefinition>;

export type AuditEventKey = keyof typeof AUDIT_CATALOG;

export interface ActivityTypeOption {
  readonly key: AuditEventKey;
  readonly i18nKey: string;
  readonly tone: AuditTone;
}

/** Options for the Actividad type filter. One entry per declared catalog key. */
export function activityTypeFilter(): readonly ActivityTypeOption[] {
  return (Object.keys(AUDIT_CATALOG) as AuditEventKey[]).map((key) => {
    const definition = AUDIT_CATALOG[key];
    return { key, i18nKey: definition.i18nKey, tone: definition.tone };
  });
}

export function isAuditEventKey(value: string): value is AuditEventKey {
  return Object.prototype.hasOwnProperty.call(AUDIT_CATALOG, value);
}

/** Recording an event key that is not in the catalog fails. */
export function requireAuditEventKey(value: string): AuditEventKey {
  if (!isAuditEventKey(value)) {
    throw new Error(`undeclared audit event: ${value}`);
  }
  return value;
}
