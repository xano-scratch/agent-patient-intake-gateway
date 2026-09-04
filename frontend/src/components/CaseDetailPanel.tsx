import { useEffect, useState } from "react";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCase, triageCase, type CaseDetail, type Session, type TriageResult } from "@/lib/api";
import { priorityVariant, roleLabel, statusVariant, str } from "@/lib/format";

export function CaseDetailPanel({
  caseId,
  session,
  hasActiveConsent,
  onTriaged,
}: {
  caseId: number;
  session: Session;
  hasActiveConsent: boolean;
  onTriaged: () => void;
}) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDetail(await getCase(caseId, session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the case.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTriageResult(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function runTriage() {
    setTriaging(true);
    setError(null);
    try {
      const r = await triageCase(caseId, session.token);
      setTriageResult(r);
      await load();
      onTriaged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage failed.");
    } finally {
      setTriaging(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading case...
        </CardContent>
      </Card>
    );
  }

  if (error && !detail) {
    return (
      <Card>
        <CardContent className="text-destructive py-10 text-sm">{error}</CardContent>
      </Card>
    );
  }

  if (!detail) return null;

  const p = detail.patient;
  const c = detail.case;
  const masked = Boolean(detail.masked);
  const canTriage = session.user.role === "clinician";
  if (!c) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {str(p.first_name)} {str(p.last_name)}
            </CardTitle>
            <CardDescription>Case #{str(c.id)}</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant={statusVariant(c.status)}>{str(c.status)}</Badge>
            {c.priority ? <Badge variant={priorityVariant(c.priority)}>{str(c.priority)}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Chief complaint</p>
          <p className="text-sm">{str(c.chief_complaint)}</p>
        </div>

        <div className="bg-muted/40 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Protected health fields</p>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              {masked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {masked ? "Masked" : "In the clear"} for {roleLabel(session.user.role)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Field label="Date of birth" value={str(p.dob)} redacted={masked} />
            <Field label="SSN (last 4)" value={str(p.ssn_last4)} redacted={masked} />
            <Field label="MRN" value={str(p.mrn)} />
            <Field label="Phone" value={str(p.phone)} />
          </dl>
          <p className="text-muted-foreground mt-2 text-xs">
            Masking is decided at the endpoint by role, not by a database policy.
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Treatment consent</span>
          <Badge variant={hasActiveConsent ? "default" : "outline"}>{hasActiveConsent ? "Active" : "None on file"}</Badge>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Run triage</span>
            </div>
            <Button size="sm" onClick={() => void runTriage()} disabled={!canTriage || triaging}>
              {triaging ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run as clinician
            </Button>
          </div>
          {!canTriage && (
            <p className="text-muted-foreground text-xs">
              Human triage is limited to the clinician role. Sign in as the clinician to run it, or use the Agent
              triage tab to run the same engine as the agent service.
            </p>
          )}
          {triageResult && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="mb-1 flex items-center gap-2">
                Priority set to <Badge variant={priorityVariant(triageResult.priority)}>{str(triageResult.priority)}</Badge>
              </p>
              <p className="text-muted-foreground text-xs">Rule that fired: {str(triageResult.rule_name)}</p>
            </div>
          )}
          {error && detail && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, redacted }: { label: string; value: string; redacted?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={redacted ? "font-mono text-sm" : "text-sm"}>{value || "not set"}</dd>
    </div>
  );
}
