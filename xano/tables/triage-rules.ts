import { table, f } from "@xanots/sdk";

/**
 * The rule set that decides a case's priority. A rule matches when its
 * `match_keyword` appears in the case's chief complaint; the most severe
 * matching rule wins. One rule set, one engine, called by both the human and
 * the agent triage paths, so the outcome is identical for both.
 */
export const triageRules = table({
  name: "triage_rules",
  schema: {
    name: f.text({ required: true }),
    match_keyword: f.text({ required: true }),
    priority: f.enum(["routine", "urgent", "emergent"], { required: true }),
    active: f.bool({ required: true, default: true }),
    version: f.int({ required: true, default: 1 }),
  },
});
