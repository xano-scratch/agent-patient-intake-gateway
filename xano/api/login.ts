import { query, input, s, c, ref, inp, expr, obj } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";

/**
 * Authenticate a seeded user and mint a role-scoped token. This is how a
 * reviewer switches between the coordinator, clinician, and agent-service roles
 * to see the same endpoints behave differently by role.
 *
 * The submitted password is taken as `input.text` on purpose: `input.password`
 * would hash it again on bind and the comparison would always fail.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: intake,
  auth: false,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"], // password is internal, so name it to read it
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No account for that email."),
    }),
    s.security.check_password({ text_password: inp("password"), hash_password: ref("u.password"), as: "ok" }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Wrong email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    user: obj({ id: ref("u.id"), email: ref("u.email"), name: ref("u.name"), role: ref("u.role") }),
  },
});
