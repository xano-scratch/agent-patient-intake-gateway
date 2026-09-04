import { query, input, s, c, ref, inp, auth, expr, obj } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { intakeCases } from "../tables/intake-cases.js";
import { accessLog } from "../tables/access-log.js";

/**
 * Fetch one case with its patient. The PHI fields (`dob`, `ssn_last4`) come
 * back MASKED unless the caller is a clinician. The decision is made here, at
 * the API layer, from the caller's role, and every read writes a row to the
 * shared audit trail carrying the `masked` flag and the fields it returned.
 *
 * The default is masked, so a role the code does not recognize sees masked PHI,
 * never the clear values.
 */
export const getCaseQuery = query({
  name: "cases/{case_id}",
  verb: "GET",
  apiGroup: intake,
  auth: users,
  input: { case_id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
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
    // Safe defaults: masked, and treated as a human actor.
    s.set_var("masked", c.bool(true)),
    s.set_var("actor_type", c.text("human")),
    s.set_var("dob_out", c.text("****-**-**")),
    s.set_var("ssn_out", c.text("****")),
    s.conditional({
      when: expr(ref("me.role"), "=", c.text("clinician")),
      then: [
        s.update_var("masked", c.bool(false)),
        s.update_var("dob_out", ref("patient.dob")),
        s.update_var("ssn_out", ref("patient.ssn_last4")),
      ],
    }),
    s.conditional({
      when: expr(ref("me.role"), "=", c.text("agent_service")),
      then: [s.update_var("actor_type", c.text("agent"))],
    }),
    s.db.add({
      table: accessLog,
      row: {
        actor_type: ref("actor_type"),
        actor_role: ref("me.role"),
        actor_id: auth("id"),
        action: "read",
        case_id: inp("case_id"),
        fields_returned: c.array(["first_name", "last_name", "dob", "mrn", "ssn_last4", "phone", "email"]),
        masked: ref("masked"),
        detail: c.text("Read a case; PHI masking applied by role."),
      },
      as: "log",
    }),
  ],
  response: {
    case: ref("case"),
    patient: obj({
      id: ref("patient.id"),
      first_name: ref("patient.first_name"),
      last_name: ref("patient.last_name"),
      mrn: ref("patient.mrn"),
      phone: ref("patient.phone"),
      email: ref("patient.email"),
      dob: ref("dob_out"),
      ssn_last4: ref("ssn_out"),
    }),
    masked: ref("masked"),
    viewer_role: ref("me.role"),
  },
});
