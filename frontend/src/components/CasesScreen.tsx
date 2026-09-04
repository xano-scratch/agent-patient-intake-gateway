import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createCase,
  getPatients,
  listCases,
  type CaseSummary,
  type PatientsResponse,
  type Session,
} from "@/lib/api";
import { priorityVariant, statusVariant, str } from "@/lib/format";
import { CaseDetailPanel } from "@/components/CaseDetailPanel";

const PRESETS = [
  "Chest pain and shortness of breath",
  "Persistent cough for two weeks",
  "Medication refill request",
];

type PatientRow = { id?: unknown; first_name?: unknown; last_name?: unknown; mrn?: unknown };

export function CasesScreen({
  session,
  dataVersion,
  onChanged,
  initialCaseId = null,
}: {
  session: Session;
  dataVersion: number;
  onChanged: () => void;
  initialCaseId?: number | null;
}) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [patients, setPatients] = useState<PatientsResponse | null>(null);
  const [selected, setSelected] = useState<number | null>(initialCaseId);
  const [loading, setLoading] = useState(true);

  const [patientId, setPatientId] = useState<string>("");
  const [complaint, setComplaint] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState<string | null>(null);

  const canCreate = session.user.role === "coordinator" || session.user.role === "clinician";

  const activeConsent = useMemo(() => {
    const set = new Set<number>();
    for (const row of (patients?.active_consents as { patient_id?: unknown }[]) ?? []) {
      const pid = Number(row.patient_id);
      if (pid) set.add(pid);
    }
    return set;
  }, [patients]);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([listCases(session.token), getPatients(session.token)]);
      setCases(c);
      setPatients(p);
      setSelected((cur) => cur ?? (c.length ? Number(c[0].id) : null));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateOk(null);
    setCreating(true);
    try {
      const created = await createCase(
        { patient_id: Number(patientId), chief_complaint: complaint, notes },
        session.token,
      );
      setCreateOk(`Opened case #${str(created.id)}.`);
      setComplaint("");
      setNotes("");
      const c = await listCases(session.token);
      setCases(c);
      setSelected(Number(created.id));
      onChanged();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create the case.");
    } finally {
      setCreating(false);
    }
  }

  const patientRows = (patients?.patients as PatientRow[]) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Intake cases</CardTitle>
            <CardDescription>Every case in the workspace. Select one to read it with role-based masking.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Complaint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => {
                    const id = Number(c.id);
                    return (
                      <TableRow
                        key={id}
                        data-state={selected === id ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelected(id)}
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          {str(c.patient_first)} {str(c.patient_last)}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-sm">{str(c.chief_complaint)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.status)}>{str(c.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.priority ? (
                            <Badge variant={priorityVariant(c.priority)}>{str(c.priority)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">untriaged</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New case</CardTitle>
            <CardDescription>
              The consent gate refuses a patient with no active treatment consent. Try one of the patients marked
              "no consent" to see the governed rejection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitCreate}>
              <div className="space-y-1.5">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId} disabled={!canCreate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientRows.map((p) => {
                      const id = Number(p.id);
                      const ok = activeConsent.has(id);
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {str(p.first_name)} {str(p.last_name)} · {ok ? "consent active" : "no consent"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complaint">Chief complaint</Label>
                <Input
                  id="complaint"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Describe the reason for the visit"
                  disabled={!canCreate}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canCreate}
                      onClick={() => setComplaint(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  disabled={!canCreate}
                />
              </div>
              <Button type="submit" disabled={!canCreate || creating || !patientId || !complaint}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                Open case
              </Button>
              {!canCreate && (
                <p className="text-muted-foreground text-xs">
                  The agent service role cannot open cases. Sign in as the coordinator or clinician to create one.
                </p>
              )}
              {createError && <p className="text-destructive text-sm">{createError}</p>}
              {createOk && <p className="text-sm text-emerald-500">{createOk}</p>}
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        {selected != null ? (
          <CaseDetailPanel
            caseId={selected}
            session={session}
            hasActiveConsent={activeConsent.has(
              Number(cases.find((c) => Number(c.id) === selected)?.patient_id ?? 0),
            )}
            onTriaged={onChanged}
          />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Select a case to read it.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
