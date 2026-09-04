import { table, f } from "@xanots/sdk";

/**
 * The auth table. One row per person or service that calls the gateway.
 *
 * `role` drives every access decision: which endpoints a caller may hit
 * (API-layer RBAC via `s.precondition`) and whether a read returns PHI masked
 * or in the clear. There is no row-level security anywhere; the role is checked
 * at the endpoint, the same for a person and for the agent service account.
 */
export const users = table({
  name: "users",
  auth: true, // backs authentication; `s.security.create_auth_token` mints a token against it
  // `id` (int PK) + `created_at` are auto-injected.
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }), // hashed on write, read only via an explicit `output`
    name: f.text({ required: true }),
    role: f.enum(["coordinator", "clinician", "agent_service"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
