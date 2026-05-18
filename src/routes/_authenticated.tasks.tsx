import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  type AttachmentRecord,
  approveWorkflowTask,
  getWorkflowTaskApprovalContext,
  listWorkflowTasks,
  uploadAttachment,
  updateWorkflowTaskStatus,
  type WorkflowTaskRecord,
} from "@/lib/api";
import { downloadAttachment, fileToBase64 } from "@/lib/files";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Download, FileText, X } from "lucide-react";
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
  const [approvalTask, setApprovalTask] = useState<WorkflowTaskRecord | null>(null);
  const [comments, setComments] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [downloadedAttachmentIds, setDownloadedAttachmentIds] = useState<Set<string>>(new Set());
  const tasksQ = useQuery({
    queryKey: ["workflow-tasks", user?.token],
    queryFn: () => listWorkflowTasks(user?.token ?? ""),
    enabled: !!user?.token,
  });
  const approvalContextQ = useQuery({
    queryKey: ["workflow-task-approval-context", approvalTask?.osid],
    queryFn: () => getWorkflowTaskApprovalContext(user?.token ?? "", approvalTask!),
    enabled: !!user?.token && !!approvalTask,
  });
  const actionMut = useMutation({
    mutationFn: async ({
      task,
      action,
      approvalComments,
      approvalAttachment,
    }: {
      task: WorkflowTaskRecord;
      action: "APPROVE" | "REJECT";
      approvalComments?: string;
      approvalAttachment?: File;
    }) => {
      if (action === "APPROVE") {
        const context =
          approvalContextQ.data ?? (await getWorkflowTaskApprovalContext(user?.token ?? "", task));
        if (approvalAttachment) {
          const fileData = await fileToBase64(approvalAttachment);
          await uploadAttachment(user?.token ?? "", {
            productCode: context.product.productCode,
            fileName: approvalAttachment.name,
            fileData,
            uploadedBy: user?.username ?? "",
          });
        }
        return approveWorkflowTask(user?.token ?? "", task, approvalComments);
      }
      return updateWorkflowTaskStatus(user?.token ?? "", task.osid, "REJECTED");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks"] });
      toast.success(variables.action === "APPROVE" ? "Task accepted" : "Task rejected");
      closeApprovalDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    setComments("");
    setAttachment(null);
    setDownloadedAttachmentIds(new Set());
  }, [approvalTask?.osid]);

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
            onAction={(task, action) => {
              if (action === "APPROVE") {
                setApprovalTask(task);
                return;
              }
              actionMut.mutate({ task, action });
            }}
          />
        </TabsContent>
        <TabsContent value="completed">
          <TaskGrid
            tasks={completed}
            isLoading={tasksQ.isLoading}
            error={tasksQ.error}
            actingTaskId={actionMut.variables?.task.osid}
            onAction={(task, action) => {
              if (action === "APPROVE") {
                setApprovalTask(task);
                return;
              }
              actionMut.mutate({ task, action });
            }}
          />
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        open={!!approvalTask}
        task={approvalTask}
        comments={comments}
        attachment={attachment}
        attachments={approvalContextQ.data?.attachments ?? []}
        isLoading={approvalContextQ.isLoading}
        isSubmitting={actionMut.isPending}
        downloadedAttachmentIds={downloadedAttachmentIds}
        onOpenChange={(open) => {
          if (!open) closeApprovalDialog();
        }}
        onCommentsChange={setComments}
        onAttachmentChange={setAttachment}
        onDownload={(previousAttachment) => {
          downloadAttachment(previousAttachment);
          setDownloadedAttachmentIds((current) => {
            const next = new Set(current);
            next.add(previousAttachment.attachmentId);
            return next;
          });
        }}
        onApprove={() => {
          if (!approvalTask) return;
          actionMut.mutate({
            task: approvalTask,
            action: "APPROVE",
            approvalComments: comments,
            approvalAttachment: attachment ?? undefined,
          });
        }}
      />
    </div>
  );

  function closeApprovalDialog() {
    setApprovalTask(null);
    setComments("");
    setAttachment(null);
    setDownloadedAttachmentIds(new Set());
  }
}

function isPendingTask(task: WorkflowTaskRecord, role?: Role) {
  const status = normalizeStatus(task.status);
  if (role && role !== "ADMIN") return status === ROLE_PENDING_STATUS[role];
  return status === "PENDING" || status.startsWith("PENDING_");
}

function ApprovalDialog({
  open,
  task,
  comments,
  attachment,
  attachments,
  isLoading,
  isSubmitting,
  downloadedAttachmentIds,
  onOpenChange,
  onCommentsChange,
  onAttachmentChange,
  onDownload,
  onApprove,
}: {
  open: boolean;
  task: WorkflowTaskRecord | null;
  comments: string;
  attachment: File | null;
  attachments: AttachmentRecord[];
  isLoading: boolean;
  isSubmitting: boolean;
  downloadedAttachmentIds: Set<string>;
  onOpenChange: (open: boolean) => void;
  onCommentsChange: (comments: string) => void;
  onAttachmentChange: (attachment: File | null) => void;
  onDownload: (attachment: AttachmentRecord) => void;
  onApprove: () => void;
}) {
  const downloadedAll =
    attachments.length === 0 ||
    attachments.every((attachment) => downloadedAttachmentIds.has(attachment.attachmentId));
  const canApprove = !!task && !!attachment && comments.trim().length > 0 && downloadedAll;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Approve Task</DialogTitle>
          <DialogDescription>
            Review existing attachments, add your PDF and comments, then approve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Previous attachments</Label>
            {isLoading ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Loading attachments...
              </div>
            ) : attachments.length ? (
              <div className="space-y-2 rounded-md border p-2">
                {attachments.map((previousAttachment) => {
                  const downloaded = downloadedAttachmentIds.has(previousAttachment.attachmentId);
                  return (
                    <div
                      key={previousAttachment.attachmentId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{previousAttachment.fileName}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={downloaded ? "secondary" : "outline"}
                        onClick={() => onDownload(previousAttachment)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {downloaded ? "Downloaded" : "Download"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                No previous attachments.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="approvalAttachment">Attachment PDF</Label>
            <Input
              id="approvalAttachment"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.type !== "application/pdf") {
                  toast.error("Only PDF attachments are supported");
                  onAttachmentChange(null);
                  return;
                }
                onAttachmentChange(file);
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="approvalComments">Comments</Label>
            <Textarea
              id="approvalComments"
              value={comments}
              onChange={(event) => onCommentsChange(event.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onApprove} disabled={!canApprove || isSubmitting}>
            {isSubmitting ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
