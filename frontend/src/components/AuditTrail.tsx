import { useEffect, useState } from "react";
import { Bot, Loader2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccessLog, type AuditRow, type Session } from "@/lib/api";
import { actionLabel, formatTs, roleLabel, str } from "@/lib/format";

type Filter = "all" | "human" | "agent";

export function AuditTrail({ session, dataVersion }: { session: Session; dataVersion: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    setLoading(true);
    try {
      const r = await getAccessLog(filter === "all" ? {} : { actor_type: filter }, session.token);
      setRows(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dataVersion]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Shared audit trail</CardTitle>
              <CardDescription>
                One log for every read, create, update, and triage. Human and agent actions land in the same place.
              </CardDescription>
            </div>
            <div className="flex gap-1.5">
              {(["all", "human", "agent"] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "human" ? "Human" : "Agent"}
                </Button>
              ))}
            </div>
          </div>
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
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>PHI</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={str(r.id)}>
                    <TableCell className="whitespace-nowrap text-xs">{formatTs(r.created_at)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {str(r.actor_type) === "agent" ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                        <Badge variant={str(r.actor_type) === "agent" ? "default" : "secondary"}>
                          {str(r.actor_type)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{roleLabel(str(r.actor_role))}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{actionLabel(str(r.action))}</TableCell>
                    <TableCell className="text-sm">{Number(r.case_id) > 0 ? `#${str(r.case_id)}` : "-"}</TableCell>
                    <TableCell className="text-xs">
                      {str(r.action) === "read" ? (r.masked ? "masked" : "in the clear") : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] truncate text-xs">
                      {str(r.detail)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-6 text-center text-sm">
                      No audit rows yet. Read or triage a case to populate the log.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
