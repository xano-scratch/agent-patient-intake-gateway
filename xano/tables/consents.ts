import { table, f } from "@xanots/sdk";
import { patients } from "./patients.js";

/**
 * A consent a patient has granted. The case create and update endpoints refuse
 * to run unless the patient has an active, unexpired `treatment` consent, so
 * this table is the gate in front of every write.
 */
export const consents = table({
  name: "consents",
  schema: {
    patient_id: f.tableRef(patients, { required: true }),
    type: f.enum(["treatment", "data_sharing", "telehealth"], { required: true }),
    granted: f.bool({ required: true, default: false }),
    granted_at: f.timestamp(),
    expires_at: f.timestamp({ nullable: true }), // an active consent has this in the future
  },
});
