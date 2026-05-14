import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, CheckCircle2, Circle, Send, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const productQ = useQuery({ queryKey: ["product", productId], queryFn: () => db.getProduct(productId) });
  const instanceQ = useQuery({ queryKey: ["instance", productId], queryFn: () => db.getInstanceForProduct(productId) });
  const tasksQ = useQuery({ queryKey: ["product-tasks", productId], queryFn: () => db.getTasksForProduct(productId) });
  const wfQ = useQuery({ queryKey: ["workflows"], queryFn: () => db.listWorkflows() });
  const catQ = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });

  const submitMut = useMutation({
    mutationFn: async () => {
      const res = db.submitProduct(productId);
      if (!res.ok) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Submitted for approval");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const product = productQ.data;
  if (!product) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate({ to: "/products" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card className="mt-4"><CardContent className="p-10 text-center text-muted-foreground">Product not found.</CardContent></Card>
      </div>
    );
  }

  const category = (catQ.data ?? []).find((c) => c.categoryCode === product.categoryCode);
  const wf = (wfQ.data ?? []).find((w) => w.workflowCode === category?.workflowCode);
  const instance = instanceQ.data;
  const tasks = tasksQ.data ?? [];

  return (
    <div>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/dashboard">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/products">Products</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{product.productCode}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={product.productName}
        description={`${product.productCode} · ${product.manufacturer}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            {product.status === "DRAFT" && user?.role === "MANUFACTURER" && (
              <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
                <Send className="mr-2 h-4 w-4" /> Submit for Approval
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Workflow Progress</CardTitle></CardHeader>
          <CardContent>
            {wf ? (
              <ol className="relative space-y-4 border-l border-border pl-6">
                {wf.steps.map((step) => {
                  const taskRecord = tasks.find((t) => t.stepNumber === step.stepNumber && t.status !== "PENDING");
                  const pendingTask = tasks.find((t) => t.stepNumber === step.stepNumber && t.status === "PENDING");
                  const isDone = !!taskRecord;
                  const isCurrent = !!pendingTask;
                  const isRejected = taskRecord?.status === "REJECTED";
                  return (
                    <li key={step.stepNumber} className="relative">
                      <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        isRejected ? "border-red-500 bg-red-500 text-white"
                          : isDone ? "border-emerald-500 bg-emerald-500 text-white"
                          : isCurrent ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}>
                        {isDone || isRejected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                      </span>
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Step {step.stepNumber}: {step.stepName}</div>
                          <span className="text-xs text-muted-foreground">{step.approverRole.replace(/_/g, " ")}</span>
                        </div>
                        {taskRecord && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <StatusBadge status={taskRecord.status} /> on {new Date(taskRecord.actionDate!).toLocaleString()} by {taskRecord.assignedUser}
                            {taskRecord.comments && <div className="mt-1 italic">"{taskRecord.comments}"</div>}
                          </div>
                        )}
                        {isCurrent && <div className="mt-2 text-xs text-primary">Awaiting action…</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No workflow associated with this product yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Code" value={product.productCode} />
              <Row label="Manufacturer" value={product.manufacturer} />
              <Row label="Category" value={category?.categoryName ?? product.categoryCode} />
              <Row label="Owner" value={product.ownerUsername} />
              <Row label="Created" value={new Date(product.createdAt).toLocaleString()} />
              {instance && <Row label="Instance" value={instance.instanceId} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
            <CardContent>
              {product.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {product.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{a.fileName}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toast.info("Download stub — connect to Sunbird RC")}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
