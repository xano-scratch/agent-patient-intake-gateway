import { query, input, s, c, ref, inp, expr, or } from "@xanots/sdk";
import { intake } from "./intake.js";
import { users } from "../tables/users.js";
import { patients } from "../tables/patients.js";
import { consents } from "../tables/consents.js";
import { intakeCases } from "../tables/intake-cases.js";
import { triageRules } from "../tables/triage-rules.js";
import { accessLog } from "../tables/access-log.js";

// Fixed epoch-ms markers so the seed is deterministic (no clock reads at build).
const FUTURE = 4102444800000; // 2100-01-01: an unexpired consent
const PAST = 1577836800000; //   2020-01-01: an expired consent
const GRANTED = 1704067200000; // 2024-01-01: when a consent was granted

/**
 * Idempotent demo seed, so the ephemeral is browsable right away.
 *
 * Called with no body it seeds only when the workspace is empty, so the app can
 * call it on load without wiping a reviewer's own edits. Called with
 * `{ reset: true }` it re-seeds, which is the "reset demo data" button.
 *
 * When it does seed it first truncates every table with `reset: true`, so the
 * id sequences restart and the ids are clean. The foreign keys below are taken
 * from the ids the patient inserts actually return (`ref("p1.id")`), never
 * hardcoded, so the links are correct no matter where the sequence starts. This
 * endpoint is public so the frontend can load data before anyone signs in.
 */
export const seedQuery = query({
  name: "seed",
  verb: "POST",
  apiGroup: intake,
  auth: false,
  input: { reset: input.bool({ default: false }) },
  stack: [
    s.db.query({ table: users, returnType: "count", as: "existing" }),
    s.set_var("did_seed", c.bool(false)),
    s.conditional({
      when: or(expr(ref("existing"), "=", c.int(0)), expr(inp("reset"), "=", c.bool(true))),
      then: [
        s.update_var("did_seed", c.bool(true)),
        // Wipe every table and restart its id sequence, so a re-seed is clean.
        s.db.truncate({ table: accessLog, reset: true }),
        s.db.truncate({ table: intakeCases, reset: true }),
        s.db.truncate({ table: consents, reset: true }),
        s.db.truncate({ table: triageRules, reset: true }),
        s.db.truncate({ table: patients, reset: true }),
        s.db.truncate({ table: users, reset: true }),
        // Users, one per role. Demo passwords; this is a scratch app.
        s.db.add({ table: users, row: { email: "coordinator@clinic.test", password: "password123", name: "Casey Rivera", role: "coordinator" } }),
        s.db.add({ table: users, row: { email: "clinician@clinic.test", password: "password123", name: "Dr. Dana Okafor", role: "clinician" } }),
        s.db.add({ table: users, row: { email: "agent@clinic.test", password: "password123", name: "Intake Agent Service", role: "agent_service" } }),
        // Patients. dob and ssn_last4 are the PHI the read endpoint masks.
        // Capture each id so the foreign keys below point at the real rows.
        s.db.add({ table: patients, row: { first_name: "Maria", last_name: "Gonzalez", dob: "1985-03-12", mrn: "MRN-1001", ssn_last4: "4821", phone: "555-0101", email: "maria.gonzalez@example.test" }, as: "p1" }),
        s.db.add({ table: patients, row: { first_name: "James", last_name: "Lee", dob: "1972-11-30", mrn: "MRN-1002", ssn_last4: "7734", phone: "555-0102", email: "james.lee@example.test" }, as: "p2" }),
        s.db.add({ table: patients, row: { first_name: "Aisha", last_name: "Khan", dob: "1990-07-08", mrn: "MRN-1003", ssn_last4: "2299", phone: "555-0103", email: "aisha.khan@example.test" }, as: "p3" }),
        s.db.add({ table: patients, row: { first_name: "Robert", last_name: "Smith", dob: "1965-01-22", mrn: "MRN-1004", ssn_last4: "5510", phone: "555-0104", email: "robert.smith@example.test" }, as: "p4" }),
        // Consents. Patients 1 and 4 have an active treatment consent; patient 2's
        // is expired and patient 3 has only telehealth, so both are refused a case.
        s.db.add({ table: consents, row: { patient_id: ref("p1.id"), type: "treatment", granted: true, granted_at: GRANTED, expires_at: FUTURE } }),
        s.db.add({ table: consents, row: { patient_id: ref("p1.id"), type: "data_sharing", granted: true, granted_at: GRANTED, expires_at: FUTURE } }),
        s.db.add({ table: consents, row: { patient_id: ref("p2.id"), type: "treatment", granted: true, granted_at: GRANTED, expires_at: PAST } }),
        s.db.add({ table: consents, row: { patient_id: ref("p3.id"), type: "telehealth", granted: true, granted_at: GRANTED, expires_at: FUTURE } }),
        s.db.add({ table: consents, row: { patient_id: ref("p4.id"), type: "treatment", granted: true, granted_at: GRANTED, expires_at: FUTURE } }),
        // Triage rules: keyword -> priority. The most severe match wins.
        s.db.add({ table: triageRules, row: { name: "Chest pain", match_keyword: "chest pain", priority: "emergent", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Shortness of breath", match_keyword: "shortness of breath", priority: "emergent", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Severe bleeding", match_keyword: "bleeding", priority: "emergent", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "High fever", match_keyword: "fever", priority: "urgent", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Persistent cough", match_keyword: "cough", priority: "urgent", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Medication refill", match_keyword: "refill", priority: "routine", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Routine follow up", match_keyword: "follow up", priority: "routine", active: true, version: 1 } }),
        s.db.add({ table: triageRules, row: { name: "Skin rash", match_keyword: "rash", priority: "routine", active: true, version: 1 } }),
        // Open cases for the two patients with active consent, untriaged so a
        // reviewer can run triage and watch the priority get set.
        s.db.add({ table: intakeCases, row: { patient_id: ref("p1.id"), chief_complaint: "Chest pain and shortness of breath since this morning", status: "new", required_fields_complete: true, triaged_by_role: "", notes: "Walked in, appears short of breath." } }),
        s.db.add({ table: intakeCases, row: { patient_id: ref("p1.id"), chief_complaint: "Medication refill request for a blood pressure prescription", status: "new", required_fields_complete: true, triaged_by_role: "", notes: "" } }),
        s.db.add({ table: intakeCases, row: { patient_id: ref("p4.id"), chief_complaint: "Persistent cough for two weeks with a mild fever", status: "new", required_fields_complete: true, triaged_by_role: "", notes: "" } }),
        s.db.add({ table: intakeCases, row: { patient_id: ref("p4.id"), chief_complaint: "Skin rash on the left arm, no pain", status: "new", required_fields_complete: true, triaged_by_role: "", notes: "" } }),
      ],
    }),
    s.db.query({ table: users, returnType: "count", as: "users_now" }),
    s.db.query({ table: patients, returnType: "count", as: "patients_now" }),
    s.db.query({ table: intakeCases, returnType: "count", as: "cases_now" }),
    s.db.query({ table: triageRules, returnType: "count", as: "rules_now" }),
  ],
  response: {
    seeded: ref("did_seed"),
    users: ref("users_now"),
    patients: ref("patients_now"),
    cases: ref("cases_now"),
    rules: ref("rules_now"),
  },
});
