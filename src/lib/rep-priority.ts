export interface RepActivity {
  stage: string | null;
  created_at?: string | null;
  first_contact_at?: string | null;
  meeting_happened_at?: string | null;
  mostruario_received_at?: string | null;
  last_specified_at?: string | null;
  project_added_at?: string | null;
  last_reply_at?: string | null;
  next_reminder_at?: string | null;
}

const day = 86_400_000;
export const REVIEW_AFTER_DAYS = 90;

export function repPriority(row: RepActivity, now: number) {
  const dates = [row.created_at, row.first_contact_at, row.meeting_happened_at,
    row.mostruario_received_at, row.last_specified_at, row.project_added_at, row.last_reply_at]
    .map(value => Date.parse(value ?? "")).filter(value => Number.isFinite(value) && value <= now);
  const age = dates.length ? Math.floor((now - Math.max(...dates)) / day) : null;
  const due = Date.parse(row.next_reminder_at ?? "");
  if (row.stage === "inativo") return { kind: "inactive" as const, age, due };
  if (!row.stage || age === null || age >= REVIEW_AFTER_DAYS) return { kind: "review" as const, age, due };
  if (due <= now) return { kind: "due" as const, age, due };
  if (row.stage === "novo_contato" && !row.next_reminder_at) return { kind: "new" as const, age, due };
  return { kind: "later" as const, age, due };
}
