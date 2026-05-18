import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  searchProducts,
  searchCategories,
  searchProductCategory,
  searchWorkflowSteps,
  createProductWorkflowInstance,
  createWorkflowTask,
  updateProductStatus,
} from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddProductDialog } from "@/components/AddProductDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { user } = useAuth();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [submittingProductId, setSubmittingProductId] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ["products", user?.token],
    queryFn: () => searchProducts(user?.token ?? ""),
    enabled: !!user?.token,
  });
  const categoriesQ = useQuery({
    queryKey: ["categories", user?.token],
    queryFn: () => searchCategories(user?.token ?? ""),
    enabled: !!user?.token,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const items = productsQ.data?.data ?? [];
    return items.filter((p) => {
      const matchesSearch =
        !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.productCode.toLowerCase().includes(search.toLowerCase()) ||
        (p.manufacturer?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesCat = categoryFilter === "all" || p.categoryCode === categoryFilter;
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [productsQ.data?.data, search, statusFilter, categoryFilter]);

  const canCreate = user?.role === "MANUFACTURER" || user?.role === "ADMIN";

  const handleSubmit = async (productId: string, productCode: string, categoryCode: string) => {
    if (!user?.token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      setSubmittingProductId(productId);
      toast.loading("Initiating workflow...");

      // Step 1: Search ProductCategory
      const categoryResp = await searchProductCategory(user.token, categoryCode);
      if (!categoryResp.data || categoryResp.data.length === 0) {
        toast.error("Category not found");
        return;
      }

      const workflowCode = categoryResp.data[0].workflowCode;

      // Step 2: Search WorkflowSteps
      const stepsResp = await searchWorkflowSteps(user.token, workflowCode);
      if (!stepsResp.data || stepsResp.data.length === 0) {
        toast.error("Workflow steps not found");
        return;
      }

      const firstStep = stepsResp.data[0];

      // Convert step name to status format: "Quality Review" -> "PENDING_QUALITY_REVIEW"
      const statusFromStepName = "PENDING_" + firstStep.stepName.toUpperCase().replace(/\s+/g, "_");

      // Generate workflowInstanceId
      const workflowInstanceId = `WF-${Date.now()}`;

      // Step 3: Create ProductWorkflowInstance
      await createProductWorkflowInstance(user.token, {
        workflowInstanceId,
        productCode,
        workflowCode,
        currentStep: firstStep.stepNumber,
        currentStatus: statusFromStepName,
        overallStatus: "IN_PROGRESS",
      });

      // Generate taskId
      const taskId = `TASK-${Date.now()}`;

      // Step 4: Create WorkflowTask
      await createWorkflowTask(user.token, {
        taskId,
        workflowInstanceId,
        stepNumber: firstStep.stepNumber,
        assignedRole: firstStep.approverRole,
        status: "PENDING",
      });

      toast.success("Workflow initiated successfully!");
      
      // Refresh products list
      productsQ.refetch();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to initiate workflow";
      toast.error(errorMsg);
      console.error("Submit error:", error);
    } finally {
      setSubmittingProductId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Browse, filter, and manage drug product registrations."
        actions={
          canCreate ? (
            <Button onClick={() => setAddProductOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Product
            </Button>
          ) : null
        }
      />

      <AddProductDialog open={addProductOpen} onOpenChange={setAddProductOpen} token={user?.token ?? ""} />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["DRAFT", "PENDING_QUALITY_REVIEW", "UNDER_MEDICAL_REVIEW", "IN_PROGRESS", "APPROVED", "REJECTED"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categoriesQ.data?.data ?? []).map((c) => (
                  <SelectItem key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.osid}>
                    <TableCell className="font-mono text-xs">{p.productCode}</TableCell>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.manufacturer}</TableCell>
                    <TableCell>{p.categoryCode}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSubmit(p.osid, p.productCode, p.categoryCode)}
                        disabled={submittingProductId === p.osid}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {submittingProductId === p.osid ? "Submitting..." : "Submit"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No products match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
