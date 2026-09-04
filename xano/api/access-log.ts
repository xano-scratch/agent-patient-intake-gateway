import { query, input, s, ref, col, inp, cmp } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { accessLog } from "../tables/access-log.js";

/**
 * Query the one shared audit trail. Optional filters narrow it to a single case
 * or to one actor type, so a reviewer can see a case's human and agent access
 * side by side. Both filters use `ignoreEmpty`, so an omitted filter drops out
 * rather than matching nothing.
 */
export const accessLogQuery = query({
  name: "access-log",
  verb: "GET",
  apiGroup: intake,
  auth: users,
  input: {
    case_id: input.int(),
    actor_type: input.enum(["human", "agent"]),
  },
  stack: [
    s.db.query({
      table: accessLog,
      where: [
        cmp(col("case_id"), "=", inp("case_id"), { ignoreEmpty: true }),
        cmp(col("actor_type"), "=", inp("actor_type"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
