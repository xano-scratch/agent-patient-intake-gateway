import { table, f } from "@xanots/sdk";

/**
 * A patient. `dob` and `ssn_last4` are the protected health fields (PHI): the
 * read endpoint returns them masked unless the caller is a clinician. The
 * masking is decided at the API layer, per request, not by a database policy.
 */
export const patients = table({
  name: "patients",
  schema: {
    first_name: f.text({ required: true }),
    last_name: f.text({ required: true }),
    dob: f.date({ required: true }), // PHI
    mrn: f.text({ required: true }),
    ssn_last4: f.text({ required: true }), // PHI
    phone: f.text(),
    email: f.email(),
  },
  index: [{ type: "unique", fields: [{ name: "mrn" }] }],
});
