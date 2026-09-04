import { query, s, ref, col, expr } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { intakeCases } from "../tables/intake-cases.js";

/**
 * List case summaries for the case-list screen. It joins the patient's name for
 * display but returns no PHI and writes no audit row: this is a navigation aid,
 * not a record read. The PHI and the audit live on `cases/{case_id}`.
 */
export const listCasesQuery = query({
  name: "cases",
  verb: "GET",
  apiGroup: intake,
  auth: users,
  stack: [
    s.db.query({
      table: intakeCases,
      bind: [{ table: patients, as: "p", join: "left", where: expr(col("patient_id"), "=", col("p.id")) }],
      eval: [
        { name: "p.first_name", as: "patient_first" },
        { name: "p.last_name", as: "patient_last" },
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
