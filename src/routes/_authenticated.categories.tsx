import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/mock-data";
import { getStoredUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  beforeLoad: () => {
    const u = typeof window !== "undefined" ? getStoredUser() : null;
    if (u && u.role !== "ADMIN") throw redirect({ to: "/dashboard" });
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });
  const wfs = useQuery({ queryKey: ["workflows"], queryFn: () => db.listWorkflows() });
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [wfCode, setWfCode] = useState("");

  const upsert = useMutation({
    mutationFn: async () => {
      if (!code || !name || !wfCode) throw new Error("All fields required");
      db.upsertCategory({ categoryCode: code, categoryName: name, workflowCode: wfCode });
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category saved");
      setOpen(false);
      setCode(""); setName(""); setWfCode("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (c: string) => { db.deleteCategory(c); return true; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Deleted"); },
  });

  return (
    <div>
      <PageHeader
        title="Product Categories"
        description="Map categories to approval workflows."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
                <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Workflow</Label>
                  <Select value={wfCode} onValueChange={setWfCode}>
                    <SelectTrigger><SelectValue placeholder="Select workflow" /></SelectTrigger>
                    <SelectContent>
                      {(wfs.data ?? []).map((w) => (
                        <SelectItem key={w.workflowCode} value={w.workflowCode}>{w.workflowName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={() => upsert.mutate()}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(cats.data ?? []).map((c) => (
                <TableRow key={c.categoryCode}>
                  <TableCell className="font-mono text-xs">{c.categoryCode}</TableCell>
                  <TableCell className="font-medium">{c.categoryName}</TableCell>
                  <TableCell>{c.workflowCode}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(c.categoryCode)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
