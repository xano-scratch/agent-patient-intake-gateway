import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login, seed, type Role, type Session } from "@/lib/api";
import { roleLabel } from "@/lib/format";
import { SignIn } from "@/components/SignIn";
import { CasesScreen } from "@/components/CasesScreen";
import { AgentTriagePanel } from "@/components/AgentTriagePanel";
import { AuditTrail } from "@/components/AuditTrail";

// Optional quick-tour deep link: ?demo=<role>&tab=<tab>&case=<id> auto-signs-in
// with the matching seeded account and opens straight to a screen. Handy for a
// reviewer, and it is how the marketing screenshot is captured.
function readParams() {
  if (typeof window === "undefined") return { demo: null as string | null, tab: "cases", caseId: null as number | null };
  const p = new URLSearchParams(window.location.search);
  const caseRaw = p.get("case");
  return { demo: p.get("demo"), tab: p.get("tab") || "cases", caseId: caseRaw ? Number(caseRaw) : null };
}

const DEMO_EMAIL: Record<string, string> = {
  coordinator: "coordinator@clinic.test",
  clinician: "clinician@clinic.test",
  agent: "agent@clinic.test",
  agent_service: "agent@clinic.test",
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const params = readParams();

  // Seed the ephemeral if empty (idempotent), then honor a ?demo= deep link.
  useEffect(() => {
    void (async () => {
      await seed().catch(() => undefined);
      const email = params.demo ? DEMO_EMAIL[params.demo] : undefined;
      if (email && !session) {
        try {
          const r = await login({ email, password: "password123" });
          setSession({ token: String(r.token), user: r.user as { id: number; name: string; email: string; role: Role } });
        } catch {
          /* fall through to the sign-in screen */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = () => setDataVersion((v) => v + 1);

  if (!session) return <SignIn onSignIn={setSession} />;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Agent Patient Intake Gateway</p>
              <p className="text-muted-foreground text-xs leading-tight">Governed intake, one shared audit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm leading-tight">{session.user.name}</p>
              <p className="text-muted-foreground text-xs leading-tight">{session.user.email}</p>
            </div>
            <Badge variant="secondary">{roleLabel(session.user.role)}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setSession(null)}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs defaultValue={params.tab}>
          <TabsList className="mb-6">
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="agent">Agent triage</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>
          <TabsContent value="cases">
            <CasesScreen session={session} dataVersion={dataVersion} onChanged={bump} initialCaseId={params.caseId} />
          </TabsContent>
          <TabsContent value="agent">
            <AgentTriagePanel session={session} onChanged={bump} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTrail session={session} dataVersion={dataVersion} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
