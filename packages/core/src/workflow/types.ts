// ── Shared workflow types ────────────────────────────────────

export interface TransitionContext {
  actorId: string | null; // null for system-triggered transitions
  note?: string;
}

export interface TransitionResult {
  valid: boolean;
  reason?: string;
}

export interface TransitionLogEntry {
  entityType: string;
  entityId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  actorId: string | null;
  note?: string;
}
