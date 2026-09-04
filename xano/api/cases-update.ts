import { query, input, s, c, ref, inp, auth, col, expr, and, or } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { consents } from "../tables/consents.js";
import { intakeCases } from "../tables/intake-cases.js";
import { accessLog } from "../tables/access-log.js";

/**
 * Update an intake case. It runs the same role guard and the same consent gate
 * as create (a distinct path name from create, so the two do not collide on the
 * export lock), re-checks required-field completeness, and writes an `update`
 * row to the shared audit trail.
 */
export const updateCaseQuery = query({
  name: "cases/update",
  verb: "POST",
  apiGroup: intake,
  auth: users,
  input: {
    case_id: input.int({ required: true }),
    chief_complaint: input.text({ required: true }),
    notes: input.text(),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({
      expr: or(expr(ref("me.role"), "=", c.text("coordinator")), expr(ref("me.role"), "=", c.text("clinician"))),
      error_type: "accessdenied",
      error: c.text("Only a coordinator or clinician can update a case."),
    }),
    s.db.get_by_id({ table: intakeCases, id: inp("case_id"), as: "case" }),
    s.precondition({
      expr: expr(ref("case", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Case not found."),
    }),
    s.db.get_by_id({ table: patients, id: ref("case.patient_id"), as: "patient" }),
    s.precondition({
      expr: expr(ref("patient", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Patient not found for this case."),
    }),
    s.db.query({
      table: consents,
      where: and(
        expr(col("patient_id"), "=", ref("case.patient_id")),
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
      error: c.text("An active treatment consent is required to update this case."),
    }),
    s.set_var("rfc", c.bool(true)),
    s.conditional({
      when: or(expr(inp("chief_complaint"), "=", c.text("")), expr(ref("patient.mrn"), "=", c.text(""))),
      then: [s.update_var("rfc", c.bool(false))],
    }),
    s.db.edit({
      table: intakeCases,
      fieldName: "id",
      fieldValue: inp("case_id"),
      row: {
        chief_complaint: inp("chief_complaint"),
        notes: inp("notes"),
        required_fields_complete: ref("rfc"),
      },
      as: "updated",
    }),
    s.db.add({
      table: accessLog,
      row: {
        actor_type: "human",
        actor_role: ref("me.role"),
        actor_id: auth("id"),
        action: "update",
        case_id: inp("case_id"),
        fields_returned: c.array(["chief_complaint", "notes", "required_fields_complete"]),
        masked: false,
        detail: c.text("Updated an intake case."),
      },
      as: "log",
    }),
  ],
  response: ref("updated"),
});
