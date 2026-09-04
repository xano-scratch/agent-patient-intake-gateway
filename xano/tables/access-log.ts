import { table, f } from "@xanots/sdk";
import { intakeCases } from "./intake-cases.js";

/**
 * The one shared audit trail. Every read, create, update, and triage writes a
 * row here, whether a person or the agent service did it. `actor_type` is the
 * only field that differs between a human action and the same action taken by
 * the agent, which is the whole point: the rules and the record are identical.
 */
export const accessLog = table({
  name: "access_log",
  schema: {
    actor_type: f.enum(["human", "agent"], { required: true }),
    actor_role: f.enum(["coordinator", "clinician", "agent_service"], { required: true }),
    actor_id: f.int({ required: true }),
    action: f.enum(["read", "create", "update", "triage"], { required: true }),
    // Optional FK uses a 0 sentinel, not nullable (see the SDK fields guide).
    case_id: f.tableRef(intakeCases, { required: true, default: 0 }),
    fields_returned: f.json(),
    masked: f.bool({ required: true, default: false }),
    detail: f.text(),
  },
});
