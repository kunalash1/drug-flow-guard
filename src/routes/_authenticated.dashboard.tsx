import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Package,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  title: string;
  value: string | number;
  icon: typeof Package;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const productsQ = useQuery({
    queryKey: ["products", user.role, user.username],
    queryFn: () => db.listProducts(user.role, user.username),
  });
  const tasksQ = useQuery({ queryKey: ["tasks", user.role], queryFn: () => db.listTasks(user.role) });
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });

  const products = productsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const categories = categoriesQ.data ?? [];

  const pending = tasks.filter((t) => t.status === "PENDING");
  const approved = tasks.filter((t) => t.status === "APPROVED");
  const rejected = tasks.filter((t) => t.status === "REJECTED");

  const byCategory = categories.map((c) => ({
    name: c.categoryName,
    count: products.filter((p) => p.categoryCode === c.categoryCode).length,
  }));

  const statusGroups = [
    { name: "Draft", value: products.filter((p) => p.status === "DRAFT").length, color: "#94a3b8" },
    { name: "In Review", value: products.filter((p) => ["PENDING_QUALITY_REVIEW", "UNDER_MEDICAL_REVIEW", "IN_PROGRESS"].includes(p.status)).length, color: "#0ea5e9" },
    { name: "Approved", value: products.filter((p) => p.status === "APPROVED").length, color: "#10b981" },
    { name: "Rejected", value: products.filter((p) => ["REJECTED", "QUALITY_REJECTED", "MEDICAL_REJECTED"].includes(p.status)).length, color: "#ef4444" },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.displayName}`}
        description={`Signed in as ${user.role.replace(/_/g, " ")} — here's what's happening today.`}
        actions={
          user.role === "MANUFACTURER" ? (
            <Button asChild>
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" /> Create Product
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Products" value={products.length} icon={Package} hint={user.role === "MANUFACTURER" ? "Your products" : "All products"} />
        <StatCard title="Pending Tasks" value={pending.length} icon={Clock} tone="warning" />
        <StatCard title="Approved" value={approved.length} icon={CheckCircle2} tone="success" />
        <StatCard title="Rejected" value={rejected.length} icon={XCircle} tone="danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
            <CardDescription>Distribution across registered product categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approval Mix</CardTitle>
            <CardDescription>Lifecycle status share.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusGroups} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {statusGroups.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>Latest items in the registry.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.slice(0, 5).map((p) => (
              <div key={p.osid} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{p.productName}</div>
                  <div className="text-xs text-muted-foreground">{p.productCode} · {p.manufacturer}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {products.length === 0 && <div className="text-sm text-muted-foreground">No products yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Pending Tasks</CardTitle>
              <CardDescription>Items awaiting your action.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tasks">
                <ClipboardList className="mr-2 h-4 w-4" /> Open tasks
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map((t) => (
              <div key={t.taskId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{t.productName}</div>
                  <div className="text-xs text-muted-foreground">{t.stepName} · {t.assignedRole.replace(/_/g, " ")}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {pending.length === 0 && <div className="text-sm text-muted-foreground">All caught up.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
