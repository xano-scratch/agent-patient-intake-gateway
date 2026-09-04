import { query, input, s, c, ref, inp, auth, expr } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { runTriage } from "../functions/run-triage.js";

/**
 * Agent triage. The agent service account runs it, and it calls the SAME
 * `run_triage` function the human path calls, with `actor_type = agent`. Same
 * rule engine, same role and consent guards upstream, same audit. The only
 * difference on the wire is the logged `actor_type`. This is the Play-4 proof:
 * an agent is held to the exact rules a person is.
 *
 * The spec allows an optional `s.ai.agent.run` showcase here. It is left out on
 * purpose: the governance proof is that the agent path is identical to the
 * human path, and a deterministic engine keeps that proof exact and independent
 * of any model's behavior.
 */
export const agentTriageQuery = query({
  name: "agent/triage",
  verb: "POST",
  apiGroup: intake,
  auth: users,
  input: { case_id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("agent_service")),
      error_type: "accessdenied",
      error: c.text("Only the agent service role can call agent triage."),
    }),
    s.function.run({
      fn: runTriage,
      input: { case_id: inp("case_id"), actor_type: c.text("agent"), actor_role: ref("me.role"), actor_id: auth("id") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
