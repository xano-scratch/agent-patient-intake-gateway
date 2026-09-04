// The one contract: paths and request/response *types* are derived from the
// xanots query defs, never hand-typed. Change a def and this file follows. The
// def imports are the lean query modules (never xano/index.ts, which would pull
// the whole workspace into the browser bundle).

import type { InferInput, InferResponse } from "@xanots/sdk";

import { loginQuery } from "../../../xano/api/login.js";
import { seedQuery } from "../../../xano/api/seed.js";
import { listCasesQuery } from "../../../xano/api/cases-list.js";
import { getCaseQuery } from "../../../xano/api/cases-get.js";
import { createCaseQuery } from "../../../xano/api/cases-create.js";
import { updateCaseQuery } from "../../../xano/api/cases-update.js";
import { triageCaseQuery } from "../../../xano/api/cases-triage.js";
import { agentTriageQuery } from "../../../xano/api/agent-triage.js";
import { accessLogQuery } from "../../../xano/api/access-log.js";
import { patientsQuery } from "../../../xano/api/patients.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, verb: string, opts: { body?: unknown; token?: string | null } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : typeof data === "string" && data
          ? data
          : `Request failed (${res.status})`);
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// Derived request/response types — the whole point of the contract.
export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
export type SeedBody = InferInput<typeof seedQuery>;
export type SeedResponse = InferResponse<typeof seedQuery>;
export type CaseSummary = InferResponse<typeof listCasesQuery>[number];
export type CaseDetail = InferResponse<typeof getCaseQuery>;
export type CaseRow = InferResponse<typeof createCaseQuery>;
export type CreateCaseBody = InferInput<typeof createCaseQuery>;
export type UpdateCaseBody = InferInput<typeof updateCaseQuery>;
export type TriageResult = InferResponse<typeof triageCaseQuery>;
export type AuditRow = InferResponse<typeof accessLogQuery>[number];
export type PatientsResponse = InferResponse<typeof patientsQuery>;

export type Role = "coordinator" | "clinician" | "agent_service";

/** The signed-in session the UI carries: a role token plus the resolved user. */
export type Session = {
  token: string;
  user: { id: number; name: string; email: string; role: Role };
};

// Auth (public)
export const login = (body: LoginBody) => call<LoginResponse>(loginQuery.getPath(), loginQuery.verb, { body });
export const seed = (body: SeedBody = { reset: false }) => call<SeedResponse>(seedQuery.getPath(), seedQuery.verb, { body });

// Cases
export const listCases = (token: string) => call<CaseSummary[]>(listCasesQuery.getPath(), listCasesQuery.verb, { token });
export const getCase = (caseId: number, token: string) =>
  call<CaseDetail>(getCaseQuery.getPath({ params: { case_id: caseId } }), getCaseQuery.verb, { token });
export const createCase = (body: CreateCaseBody, token: string) =>
  call<CaseRow>(createCaseQuery.getPath(), createCaseQuery.verb, { body, token });
export const updateCase = (body: UpdateCaseBody, token: string) =>
  call<CaseRow>(updateCaseQuery.getPath(), updateCaseQuery.verb, { body, token });

// Triage — both paths hit the same shared function; only the role token differs.
export const triageCase = (caseId: number, token: string) =>
  call<TriageResult>(triageCaseQuery.getPath(), triageCaseQuery.verb, { body: { case_id: caseId }, token });
export const agentTriage = (caseId: number, token: string) =>
  call<TriageResult>(agentTriageQuery.getPath(), agentTriageQuery.verb, { body: { case_id: caseId }, token });

// Audit trail
export const getAccessLog = (filter: { case_id?: number; actor_type?: "human" | "agent" }, token: string) => {
  const qs = new URLSearchParams();
  if (filter.case_id != null) qs.set("case_id", String(filter.case_id));
  if (filter.actor_type) qs.set("actor_type", filter.actor_type);
  const q = qs.toString();
  return call<AuditRow[]>(accessLogQuery.getPath() + (q ? `?${q}` : ""), accessLogQuery.verb, { token });
};

// Patients (non-PHI picker)
export const getPatients = (token: string) => call<PatientsResponse>(patientsQuery.getPath(), patientsQuery.verb, { token });
