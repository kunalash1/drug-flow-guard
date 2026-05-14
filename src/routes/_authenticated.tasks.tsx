import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tasksQ = useQuery({ queryKey: ["tasks", user?.role], queryFn: () => db.listTasks(user?.role) });

  const [dialog, setDialog] = useState<{ open: boolean; taskId?: string; action?: "APPROVE" | "REJECT" }>({ open: false });
  const [comments, setComments] = useState("");

  const actMut = useMutation({
    mutationFn: () => {
      const res = db.actOnTask(dialog.taskId!, dialog.action!, comments, user!.username);
      if (!res.ok) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(dialog.action === "APPROVE" ? "Task approved" : "Task rejected");
      setDialog({ open: false });
      setComments("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = tasksQ.data ?? [];
  const pending = tasks.filter((t) => t.status === "PENDING");
  const completed = tasks.filter((t) => t.status !== "PENDING");

  return (
    <div>
      <PageHeader title="Workflow Tasks" description="Review and act on tasks assigned to your role." />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">History ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <TaskGrid
            tasks={pending}
            onAction={(taskId, action) => setDialog({ open: true, taskId, action })}
          />
        </TabsContent>
        <TabsContent value="completed">
          <TaskGrid tasks={completed} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.action === "APPROVE" ? "Approve task" : "Reject task"}</DialogTitle>
            <DialogDescription>Add comments for the audit trail.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Comments…"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancel</Button>
            <Button
              variant={dialog.action === "REJECT" ? "destructive" : "default"}
              onClick={() => actMut.mutate()}
              disabled={actMut.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskGrid({
  tasks,
  onAction,
}: {
  tasks: ReturnType<typeof db.listTasks>;
  onAction?: (taskId: string, action: "APPROVE" | "REJECT") => void;
}) {
  if (tasks.length === 0) {
    return (
      <Card className="mt-4"><CardContent className="p-10 text-center text-sm text-muted-foreground">No tasks here.</CardContent></Card>
    );
  }
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((t) => (
        <Card key={t.taskId}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{t.productName}</div>
                <div className="text-xs text-muted-foreground">{t.productCode} · {t.stepName}</div>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Assigned: <span className="font-medium text-foreground">{t.assignedRole.replace(/_/g, " ")}</span>
              <br />
              Created: {new Date(t.createdAt).toLocaleString()}
              {t.actionDate && (
                <>
                  <br />
                  Actioned: {new Date(t.actionDate).toLocaleString()} by {t.assignedUser}
                </>
              )}
              {t.comments && <div className="mt-2 italic text-foreground">"{t.comments}"</div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/products/$productId" params={{ productId: t.productOsid }}>
                  <Eye className="mr-2 h-4 w-4" /> Open Product
                </Link>
              </Button>
              {onAction && t.status === "PENDING" && (
                <>
                  <Button size="sm" onClick={() => onAction(t.taskId, "APPROVE")}>
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onAction(t.taskId, "REJECT")}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
