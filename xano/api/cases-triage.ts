import { query, input, s, c, ref, inp, auth, expr } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { runTriage } from "../functions/run-triage.js";

/**
 * Human triage. A clinician runs it, and it calls the shared `run_triage`
 * function with `actor_type = human`. The agent endpoint calls the SAME
 * function, so the two paths cannot drift apart.
 */
export const triageCaseQuery = query({
  name: "cases/triage",
  verb: "POST",
  apiGroup: intake,
  auth: users,
  input: { case_id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("clinician")),
      error_type: "accessdenied",
      error: c.text("Only a clinician can run human triage."),
    }),
    s.function.run({
      fn: runTriage,
      input: { case_id: inp("case_id"), actor_type: c.text("human"), actor_role: ref("me.role"), actor_id: auth("id") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
