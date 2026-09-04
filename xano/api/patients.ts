import { query, s, c, ref, col, expr, and } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { consents } from "../tables/consents.js";

/**
 * A non-PHI patient picker for the create-case form, plus the ids of patients
 * who currently hold an active treatment consent. The form uses that to show
 * which patients can take a new case and which will be refused by the consent
 * gate. No PHI (`dob`, `ssn_last4`) is returned here.
 */
export const patientsQuery = query({
  name: "patients",
  verb: "GET",
  apiGroup: intake,
  auth: users,
  stack: [
    s.db.query({
      table: patients,
      output: ["id", "first_name", "last_name", "mrn"],
      sort: [{ sortBy: "last_name", dir: "asc" }],
      as: "patients",
    }),
    s.db.query({
      table: consents,
      where: and(
        expr(col("type"), "=", c.text("treatment")),
        expr(col("granted"), "=", c.bool(true)),
        expr(col("expires_at"), ">", c.now()),
      ),
      output: ["patient_id"],
      as: "active",
    }),
  ],
  response: { patients: ref("patients"), active_consents: ref("active") },
});
