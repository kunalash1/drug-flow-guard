import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  approveWorkflowTask,
  listWorkflowTasks,
  updateWorkflowTaskStatus,
  type WorkflowTaskRecord,
} from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const ROLE_PENDING_STATUS: Partial<Record<Role, string>> = {
  QUALITY_OFFICER: "PENDING_QUALITY_REVIEW",
  MEDICAL_OFFICER: "PENDING_MEDICAL_REVIEW",
  DRUG_CONTROLLER: "PENDING_FINAL_APPROVAL",
};

function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tasksQ = useQuery({
    queryKey: ["workflow-tasks", user?.token],
    queryFn: () => listWorkflowTasks(user?.token ?? ""),
    enabled: !!user?.token,
  });
  const actionMut = useMutation({
    mutationFn: ({ task, action }: { task: WorkflowTaskRecord; action: "APPROVE" | "REJECT" }) => {
      if (action === "APPROVE") {
        return approveWorkflowTask(user?.token ?? "", task);
      }
      return updateWorkflowTaskStatus(user?.token ?? "", task.osid, "REJECTED");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks"] });
      toast.success(variables.action === "APPROVE" ? "Task accepted" : "Task rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tasks = (tasksQ.data?.data ?? []).filter((task) => {
    if (!user || user.role === "ADMIN") return true;
    return task.assignedRole === user.role;
  });
  const pending = tasks.filter((task) => isPendingTask(task, user?.role));
  const completed = tasks.filter((task) => !isPendingTask(task, user?.role));

  return (
    <div>
      <PageHeader title="Workflow Tasks" description="Review tasks assigned to your role." />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">History ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <TaskGrid
            tasks={pending}
            isLoading={tasksQ.isLoading}
            error={tasksQ.error}
            actingTaskId={actionMut.variables?.task.osid}
            onAction={(task, action) => actionMut.mutate({ task, action })}
          />
        </TabsContent>
        <TabsContent value="completed">
          <TaskGrid
            tasks={completed}
            isLoading={tasksQ.isLoading}
            error={tasksQ.error}
            actingTaskId={actionMut.variables?.task.osid}
            onAction={(task, action) => actionMut.mutate({ task, action })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function isPendingTask(task: WorkflowTaskRecord, role?: Role) {
  const status = normalizeStatus(task.status);
  if (role && role !== "ADMIN") return status === ROLE_PENDING_STATUS[role];
  return status === "PENDING" || status.startsWith("PENDING_");
}

function normalizeStatus(status: string) {
  return status.toUpperCase().replace(/\s+/g, "_");
}

function TaskGrid({
  tasks,
  isLoading,
  error,
  actingTaskId,
  onAction,
}: {
  tasks: WorkflowTaskRecord[];
  isLoading: boolean;
  error: Error | null;
  actingTaskId?: string;
  onAction: (task: WorkflowTaskRecord, action: "APPROVE" | "REJECT") => void;
}) {
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Loading tasks...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4">
        <CardContent className="p-10 text-center text-sm text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No tasks here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.osid}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{task.taskId}</div>
                <div className="text-xs text-muted-foreground">
                  Workflow: {task.workflowInstanceId}
                </div>
              </div>
              <StatusBadge status={task.status} />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Assigned:{" "}
              <span className="font-medium text-foreground">
                {task.assignedRole.replace(/_/g, " ")}
              </span>
              <br />
              Step: <span className="font-medium text-foreground">{task.stepNumber}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => onAction(task, "APPROVE")}
                disabled={actingTaskId === task.osid}
              >
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction(task, "REJECT")}
                disabled={actingTaskId === task.osid}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
