import { query, input, s, c, ref, inp, auth, col, expr, and, or } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { consents } from "../tables/consents.js";
import { intakeCases } from "../tables/intake-cases.js";
import { accessLog } from "../tables/access-log.js";

/**
 * Create an intake case. Two governed rules run before the write:
 *   1. role guard: only a coordinator or a clinician may create a case;
 *   2. consent gate: the patient must have an active, unexpired `treatment`
 *      consent, or the request is refused.
 * Every create writes one `create` row to the shared audit trail.
 */
export const createCaseQuery = query({
  name: "cases",
  verb: "POST",
  apiGroup: intake,
  auth: users,
  input: {
    patient_id: input.int({ required: true }),
    chief_complaint: input.text({ required: true }),
    notes: input.text(),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({
      expr: or(expr(ref("me.role"), "=", c.text("coordinator")), expr(ref("me.role"), "=", c.text("clinician"))),
      error_type: "accessdenied",
      error: c.text("Only a coordinator or clinician can create a case."),
    }),
    s.db.get_by_id({ table: patients, id: inp("patient_id"), as: "patient" }),
    s.precondition({
      expr: expr(ref("patient", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Patient not found."),
    }),
    s.db.query({
      table: consents,
      where: and(
        expr(col("patient_id"), "=", inp("patient_id")),
        expr(col("type"), "=", c.text("treatment")),
        expr(col("granted"), "=", c.bool(true)),
        expr(col("expires_at"), ">", c.now()),
      ),
      returnType: "exists",
      as: "has_consent",
    }),
    s.precondition({
      expr: expr(ref("has_consent"), "=", c.bool(true)),
      error_type: "accessdenied",
      error: c.text("An active treatment consent is required before opening a case."),
    }),
    // required-field completeness: a chief complaint and the patient's MRN
    s.set_var("rfc", c.bool(true)),
    s.conditional({
      when: or(expr(inp("chief_complaint"), "=", c.text("")), expr(ref("patient.mrn"), "=", c.text(""))),
      then: [s.update_var("rfc", c.bool(false))],
    }),
    s.db.add({
      table: intakeCases,
      row: {
        patient_id: inp("patient_id"),
        chief_complaint: inp("chief_complaint"),
        status: "new",
        required_fields_complete: ref("rfc"),
        triaged_by_role: "",
        notes: inp("notes"),
      },
      as: "case",
    }),
    s.db.add({
      table: accessLog,
      row: {
        actor_type: "human",
        actor_role: ref("me.role"),
        actor_id: auth("id"),
        action: "create",
        case_id: ref("case.id"),
        fields_returned: c.array(["chief_complaint", "status", "required_fields_complete"]),
        masked: false,
        detail: c.text("Created an intake case."),
      },
      as: "log",
    }),
  ],
  response: ref("case"),
});
