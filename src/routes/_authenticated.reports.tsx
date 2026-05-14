import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/mock-data";
import { getStoredUser } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  beforeLoad: () => {
    const u = typeof window !== "undefined" ? getStoredUser() : null;
    if (u && u.role !== "ADMIN") throw redirect({ to: "/dashboard" });
  },
  component: ReportsPage,
});

function ReportsPage() {
  const productsQ = useQuery({ queryKey: ["products-all"], queryFn: () => db.listProducts() });
  const tasksQ = useQuery({ queryKey: ["tasks-all"], queryFn: () => db.listTasks() });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });

  const products = productsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const categories = catsQ.data ?? [];

  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString(undefined, { weekday: "short" }),
      approved: Math.floor(Math.random() * 5) + 1,
      rejected: Math.floor(Math.random() * 2),
    };
  });

  const byRole = ALL_ROLES.filter((r) => r !== "ADMIN" && r !== "MANUFACTURER").map((r) => ({
    role: r.replace(/_/g, " "),
    pending: tasks.filter((t) => t.assignedRole === r && t.status === "PENDING").length,
  }));

  const byCategory = categories.map((c) => ({
    name: c.categoryName,
    value: products.filter((p) => p.categoryCode === c.categoryCode).length,
  }));
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const completion = (() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status !== "PENDING").length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  })();

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Approval trends, role load, and category breakdown." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Approval Trend</CardTitle><CardDescription>Last 7 days</CardDescription></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending Tasks by Role</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={byRole}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="pending" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Products by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={100}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Task Completion Rate</CardTitle></CardHeader>
          <CardContent className="flex h-72 flex-col items-center justify-center">
            <div className="text-6xl font-bold text-primary">{completion}%</div>
            <div className="mt-2 text-sm text-muted-foreground">{tasks.filter((t) => t.status !== "PENDING").length} of {tasks.length} tasks completed</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
