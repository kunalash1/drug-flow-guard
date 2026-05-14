import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { db } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
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
import { Plus, Search, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { user } = useAuth();
  const productsQ = useQuery({
    queryKey: ["products", user?.role, user?.username],
    queryFn: () => db.listProducts(user?.role, user?.username),
  });
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const items = productsQ.data ?? [];
    return items.filter((p) => {
      const matchesSearch =
        !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.productCode.toLowerCase().includes(search.toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesCat = categoryFilter === "all" || p.categoryCode === categoryFilter;
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [productsQ.data, search, statusFilter, categoryFilter]);

  const canCreate = user?.role === "MANUFACTURER" || user?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Products"
        description="Browse, filter, and manage drug product registrations."
        actions={
          canCreate ? (
            <Button asChild>
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" /> New Product
              </Link>
            </Button>
          ) : null
        }
      />

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
                {(categoriesQ.data ?? []).map((c) => (
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/products/$productId" params={{ productId: p.osid }}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
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
