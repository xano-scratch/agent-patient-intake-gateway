import { defineFunction, input, s, c, ref, inp, col, expr } from "@xanots/sdk";
import { intakeCases } from "../tables/intake-cases.js";
import { triageRules } from "../tables/triage-rules.js";
import { accessLog } from "../tables/access-log.js";

/**
 * The shared triage engine.
 *
 * This is the load-bearing piece of the whole app. Both triage endpoints, the
 * human one (`cases/triage`) and the agent one (`agent/triage`), call THIS
 * function. They differ only in the `actor_type` they pass in. The rule
 * evaluation, the case update, and the audit row are identical, so a case
 * triaged by the agent gets the same priority and the same record as one
 * triaged by a clinician.
 *
 * It evaluates the active `triage_rules` against the case's chief complaint and
 * picks the most severe matching rule. The match runs in a small JavaScript
 * lambda because substring matching plus severity ranking is clearer there than
 * in three ordered database queries.
 */
export const runTriage = defineFunction({
  name: "run_triage",
  description:
    "Shared triage engine called by both the human and agent triage endpoints. Evaluates the active rules against a case, sets its priority and status, and writes one audit row.",
  input: {
    case_id: input.int({ required: true }),
    actor_type: input.enum(["human", "agent"], { required: true }),
    actor_role: input.text({ required: true }),
    actor_id: input.int({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: intakeCases, id: inp("case_id"), as: "case" }),
    s.precondition({
      expr: expr(ref("case", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Case not found."),
    }),
    s.db.query({
      table: triageRules,
      where: expr(col("active"), "=", c.bool(true)),
      sort: [{ sortBy: "version", dir: "desc" }],
      as: "rules",
    }),
    s.lambda({
      as: "match",
      code: ({ $var }) => {
        const complaint = String(($var.case && $var.case.chief_complaint) || "").toLowerCase();
        const rank: Record<string, number> = { routine: 1, urgent: 2, emergent: 3 };
        let best: any = null;
        for (const r of ($var.rules as any[]) || []) {
          const kw = String((r && r.match_keyword) || "").toLowerCase().trim();
          if (kw && complaint.indexOf(kw) !== -1) {
            if (!best || (rank[r.priority] || 0) > (rank[best.priority] || 0)) best = r;
          }
        }
        if (!best) return { priority: "routine", rule_name: "No rule matched (default routine)", rule_id: 0, matched: false };
        return { priority: best.priority, rule_name: best.name, rule_id: best.id, matched: true };
      },
    }),
    s.db.edit({
      table: intakeCases,
      fieldName: "id",
      fieldValue: inp("case_id"),
      row: {
        status: "triaged",
        priority: ref("match.priority"),
        triaged_by_role: inp("actor_role"),
        triaged_at: c.now(),
      },
      as: "updated",
    }),
    s.db.add({
      table: accessLog,
      row: {
        actor_type: inp("actor_type"),
        actor_role: inp("actor_role"),
        actor_id: inp("actor_id"),
        action: "triage",
        case_id: inp("case_id"),
        fields_returned: c.array(["priority", "status", "triaged_by_role", "triaged_at"]),
        masked: false,
        detail: c.text("Ran triage through the shared rule engine."),
      },
      as: "log",
    }),
  ],
  response: {
    priority: ref("match.priority"),
    rule_name: ref("match.rule_name"),
    rule_id: ref("match.rule_id"),
    matched: ref("match.matched"),
    case: ref("updated"),
  },
});
