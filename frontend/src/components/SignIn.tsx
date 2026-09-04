import { useState } from "react";
import { LogIn, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { login, seed, ApiError, type Role, type Session } from "@/lib/api";
import { roleLabel } from "@/lib/format";

const DEMO_PASSWORD = "password123";
const QUICK: { role: Role; email: string }[] = [
  { role: "coordinator", email: "coordinator@clinic.test" },
  { role: "clinician", email: "clinician@clinic.test" },
  { role: "agent_service", email: "agent@clinic.test" },
];

export function SignIn({ onSignIn }: { onSignIn: (s: Session) => void }) {
  const [email, setEmail] = useState("clinician@clinic.test");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reseeded, setReseeded] = useState<string | null>(null);

  async function doLogin(e?: string, p?: string) {
    setError(null);
    setBusy(e ?? email);
    try {
      const res = await login({ email: e ?? email, password: p ?? password });
      onSignIn({ token: String(res.token), user: res.user as Session["user"] });
    } catch (err) {
      // The seed can race the very first login on a cold ephemeral; one retry clears it.
      if (err instanceof ApiError && err.status === 401) {
        try {
          const res = await login({ email: e ?? email, password: p ?? password });
          onSignIn({ token: String(res.token), user: res.user as Session["user"] });
          return;
        } catch (err2) {
          setError(err2 instanceof Error ? err2.message : "Sign in failed.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function reseed() {
    setError(null);
    setReseeded(null);
    setBusy("reset");
    try {
      const r = await seed({ reset: true });
      setReseeded(`Demo data reset: ${String(r.users)} users, ${String(r.patients)} patients, ${String(r.cases)} cases.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Patient Intake Gateway</h1>
          <p className="text-muted-foreground text-sm">
            One governed API for a human and an agent. Same rules, same audit.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Pick a role to see the same endpoints behave differently. The clinician sees PHI in the clear; the
            coordinator and the agent service see it masked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {QUICK.map((q) => (
              <Button
                key={q.role}
                variant="secondary"
                disabled={busy !== null}
                onClick={() => doLogin(q.email, DEMO_PASSWORD)}
              >
                {roleLabel(q.role)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">or sign in by email</span>
            <Separator className="flex-1" />
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy !== null}>
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </form>

          {error && <p className="text-destructive text-sm">{error}</p>}
          {reseeded && <p className="text-sm text-emerald-500">{reseeded}</p>}

          <div className="text-muted-foreground flex items-center justify-between border-t pt-4 text-xs">
            <span>All demo accounts use the password {DEMO_PASSWORD}.</span>
            <Button variant="ghost" size="sm" onClick={() => void reseed()} disabled={busy !== null}>
              <RefreshCw className="h-3.5 w-3.5" /> Reset demo data
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
