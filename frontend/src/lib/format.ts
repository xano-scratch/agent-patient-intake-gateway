// Small display helpers shared across the screens.

export function roleLabel(role: string): string {
  switch (role) {
    case "coordinator":
      return "Coordinator";
    case "clinician":
      return "Clinician";
    case "agent_service":
      return "Agent service";
    default:
      return role;
  }
}

export function actionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function formatTs(ts: unknown): string {
  const n = typeof ts === "number" ? ts : Number(ts);
  if (!n || Number.isNaN(n)) return "not set";
  return new Date(n).toLocaleString();
}

// Badge variant per priority (uses shadcn's token-based variants).
export function priorityVariant(priority: unknown): "destructive" | "default" | "secondary" | "outline" {
  switch (priority) {
    case "emergent":
      return "destructive";
    case "urgent":
      return "default";
    case "routine":
      return "secondary";
    default:
      return "outline";
  }
}

export function statusVariant(status: unknown): "default" | "secondary" | "outline" {
  switch (status) {
    case "triaged":
      return "default";
    case "new":
      return "secondary";
    default:
      return "outline";
  }
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
