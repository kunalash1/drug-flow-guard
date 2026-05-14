import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/mock-data";
import { getStoredUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/workflows")({
  beforeLoad: () => {
    const u = typeof window !== "undefined" ? getStoredUser() : null;
    if (u && u.role !== "ADMIN") throw redirect({ to: "/dashboard" });
  },
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const wfs = useQuery({ queryKey: ["workflows"], queryFn: () => db.listWorkflows() });

  return (
    <div>
      <PageHeader title="Workflow Definitions" description="Configurable multi-step approval workflows." />

      <div className="grid gap-4 lg:grid-cols-2">
        {(wfs.data ?? []).map((w) => (
          <Card key={w.workflowCode}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{w.workflowName}</CardTitle>
                  <CardDescription>{w.workflowCode} · v{w.version}</CardDescription>
                </div>
                <Badge variant={w.active ? "default" : "secondary"}>{w.active ? "Active" : "Inactive"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {w.steps.map((s) => (
                  <li key={s.stepNumber} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div>
                      <div className="font-medium">Step {s.stepNumber}: {s.stepName}</div>
                      <div className="text-xs text-muted-foreground">
                        Approver: {s.approverRole.replace(/_/g, " ")}
                        {s.mandatoryAttachment && " · Attachment required"}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-emerald-600">→ {s.nextStatus.replace(/_/g, " ")}</div>
                      <div className="text-red-600">✕ {s.rejectionStatus.replace(/_/g, " ")}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
