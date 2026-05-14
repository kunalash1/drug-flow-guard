import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: () => db.listCategories() });

  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState(user?.displayName ?? "");
  const [categoryCode, setCategoryCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const createMut = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!productCode || !productName || !manufacturer || !categoryCode) {
        throw new Error("All fields are required");
      }
      const product = db.createProduct({
        productCode,
        productName,
        manufacturer,
        categoryCode,
        ownerUsername: user!.username,
      });
      for (const f of files) db.addAttachment(product.osid, f);
      if (submit) {
        const res = db.submitProduct(product.osid);
        if (!res.ok) throw new Error(res.message);
      }
      return product;
    },
    onSuccess: (product, submit) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(submit ? "Product submitted for approval" : "Product saved as draft");
      navigate({ to: "/products/$productId", params: { productId: product.osid } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const addFiles = (incoming: File[]) => {
    const allowed = incoming.filter((f) => /pdf|image|msword|officedocument|text/.test(f.type) || f.type === "");
    const tooBig = allowed.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      toast.error(`${tooBig.name} exceeds 10MB`);
      return;
    }
    setFiles((prev) => [...prev, ...allowed]);
  };

  return (
    <div>
      <PageHeader title="Create Product" description="Register a new drug product and upload supporting documents." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Product Code</Label>
                <Input id="code" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="DRG-1234" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Paracetamol 500mg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfg">Manufacturer</Label>
                <Input id="mfg" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryCode} onValueChange={setCategoryCode}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {(categoriesQ.data ?? []).map((c) => (
                      <SelectItem key={c.categoryCode} value={c.categoryCode}>{c.categoryName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
          <CardContent>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Drag & drop files</div>
              <div className="text-xs text-muted-foreground">PDF, DOC, images — up to 10MB</div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => createMut.mutate(false)} disabled={createMut.isPending}>
          Save as Draft
        </Button>
        <Button onClick={() => createMut.mutate(true)} disabled={createMut.isPending}>
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}
