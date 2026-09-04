import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Loader2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  agentTriage,
  listCases,
  login,
  triageCase,
  type CaseSummary,
  type Session,
  type TriageResult,
} from "@/lib/api";
import { priorityVariant, str } from "@/lib/format";

const DEMO_PASSWORD = "password123";

export function AgentTriagePanel({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [clinicianToken, setClinicianToken] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<TriageResult | null>(null);
  const [humanResult, setHumanResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [a, c, list] = await Promise.all([
          login({ email: "agent@clinic.test", password: DEMO_PASSWORD }),
          login({ email: "clinician@clinic.test", password: DEMO_PASSWORD }),
          listCases(session.token),
        ]);
        setAgentToken(String(a.token));
        setClinicianToken(String(c.token));
        setCases(list);
        if (list.length) setSelected(String(Number(list[0].id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not prepare the panel.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caseId = selected ? Number(selected) : null;

  async function runAgent() {
    if (caseId == null || !agentToken) return;
    setBusy("agent");
    setError(null);
    try {
      setAgentResult(await agentTriage(caseId, agentToken));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent triage failed.");
    } finally {
      setBusy(null);
    }
  }

  async function runHuman() {
    if (caseId == null || !clinicianToken) return;
    setBusy("human");
    setError(null);
    try {
      setHumanResult(await triageCase(caseId, clinicianToken));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Human triage failed.");
    } finally {
      setBusy(null);
    }
  }

  const identical = useMemo(() => {
    if (!agentResult || !humanResult) return false;
    return (
      str(agentResult.priority) === str(humanResult.priority) &&
      str(agentResult.rule_id) === str(humanResult.rule_id)
    );
  }, [agentResult, humanResult]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Human and agent triage, one engine</CardTitle>
          <CardDescription>
            The agent service and a clinician both call the same triage endpoint family, which runs the same shared
            function. Run both on one case and compare. The priority and the rule match every time; only the logged
            actor type differs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Case</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => {
                  const id = Number(c.id);
                  return (
                    <SelectItem key={id} value={String(id)}>
                      #{id} · {str(c.patient_first)} {str(c.patient_last)} · {str(c.chief_complaint)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCard
              icon={<Bot className="h-4 w-4" />}
              title="Agent service"
              actorType="agent"
              result={agentResult}
              onRun={() => void runAgent()}
              running={busy === "agent"}
              disabled={caseId == null || !agentToken}
            />
            <ResultCard
              icon={<User className="h-4 w-4" />}
              title="Clinician"
              actorType="human"
              result={humanResult}
              onRun={() => void runHuman()}
              running={busy === "human"}
              disabled={caseId == null || !clinicianToken}
            />
          </div>

          {identical && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Identical governance. Same priority, same rule. The audit trail records both, differing only in the actor
              type.
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({
  icon,
  title,
  actorType,
  result,
  onRun,
  running,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  actorType: "human" | "agent";
  result: TriageResult | null;
  onRun: () => void;
  running: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          {icon} {title}
        </span>
        <Badge variant="outline">actor: {actorType}</Badge>
      </div>
      <Button size="sm" variant="secondary" onClick={onRun} disabled={disabled || running}>
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Run triage
      </Button>
      {result ? (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            Priority <Badge variant={priorityVariant(result.priority)}>{str(result.priority)}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Rule: {str(result.rule_name)}</p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Not run yet.</p>
      )}
    </div>
  );
}
