import { table, f } from "@xanots/sdk";
import { patients } from "./patients.js";

/**
 * An intake case for a patient. `priority` stays null until the case is
 * triaged; `triaged_by_role` records who ran that triage (a person's role or
 * the agent service role), which is how the audit shows human and agent triage
 * side by side.
 */
export const intakeCases = table({
  name: "intake_cases",
  schema: {
    patient_id: f.tableRef(patients, { required: true }),
    chief_complaint: f.text({ required: true }),
    status: f.enum(["new", "triaged", "in_review", "closed"], { required: true, default: "new" }),
    priority: f.enum(["routine", "urgent", "emergent"], { nullable: true }), // null until triaged
    required_fields_complete: f.bool({ required: true, default: false }),
    triaged_by_role: f.text(),
    triaged_at: f.timestamp({ nullable: true }),
    notes: f.text(),
  },
});
