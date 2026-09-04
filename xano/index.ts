import { workspace } from "@xanots/sdk";

// Tables
import { users } from "./tables/users.js";
import { patients } from "./tables/patients.js";
import { intakeCases } from "./tables/intake-cases.js";
import { consents } from "./tables/consents.js";
import { triageRules } from "./tables/triage-rules.js";
import { accessLog } from "./tables/access-log.js";

// API group
import { intake } from "./api/intake.js";

// Shared function (the one triage engine both triage endpoints call)
import { runTriage } from "./functions/run-triage.js";

// Endpoints
import { loginQuery } from "./api/login.js";
import { seedQuery } from "./api/seed.js";
import { listCasesQuery } from "./api/cases-list.js";
import { getCaseQuery } from "./api/cases-get.js";
import { createCaseQuery } from "./api/cases-create.js";
import { updateCaseQuery } from "./api/cases-update.js";
import { triageCaseQuery } from "./api/cases-triage.js";
import { agentTriageQuery } from "./api/agent-triage.js";
import { accessLogQuery } from "./api/access-log.js";
import { patientsQuery } from "./api/patients.js";

/**
 * The agent-patient-intake-gateway backend.
 *
 * A governed patient-intake API. A human coordinator, a clinician, and an agent
 * service account all call the same permissioned, logged endpoints, so consent
 * checks, PHI masking, and triage rules hold identically for a person and an
 * agent, and every access lands in one shared audit trail. Auth is API-layer
 * RBAC (an auth table + create_auth_token + per-endpoint role guards); PHI
 * masking is decided per request at the endpoint. There is no row-level
 * security anywhere.
 */
export default workspace("agent-patient-intake-gateway")
  .registerTables([users, patients, intakeCases, consents, triageRules, accessLog])
  .registerApiGroups([intake])
  .registerFunctions([runTriage])
  .registerQueries([
    loginQuery,
    seedQuery,
    listCasesQuery,
    getCaseQuery,
    createCaseQuery,
    updateCaseQuery,
    triageCaseQuery,
    agentTriageQuery,
    accessLogQuery,
    patientsQuery,
  ]);
