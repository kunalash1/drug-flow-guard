import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProductCategories, createProduct, uploadAttachment } from "@/lib/api";
import { fileToBase64 } from "@/lib/files";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  username: string;
}

export function AddProductDialog({ open, onOpenChange, token, username }: AddProductDialogProps) {
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const categoriesQ = useQuery({
    queryKey: ["productCategories", token],
    queryFn: () => getProductCategories(token),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (attachments.length === 0) {
        throw new Error("Upload at least one PDF attachment");
      }

      const product = await createProduct(token, {
        productName,
        manufacturer,
        categoryCode,
        status: "DRAFT",
      });

      await Promise.all(
        attachments.map(async (file) => {
          const fileData = await fileToBase64(file);
          if (!product.productCode) {
            throw new Error("Product code missing for attachment upload");
          }
          return uploadAttachment(token, {
            productCode: product.productCode,
            fileName: file.name,
            fileData,
            uploadedBy: username,
          });
        }),
      );

      return product;
    },
    onSuccess: () => {
      toast.success("Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    },
  });

  const handleClose = () => {
    setProductName("");
    setManufacturer("");
    setCategoryCode("");
    setAttachments([]);
    onOpenChange(false);
  };

  const addAttachments = (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === "application/pdf");
    if (pdfFiles.length !== files.length) {
      toast.error("Only PDF attachments are supported");
    }
    setAttachments((current) => [...current, ...pdfFiles]);
  };

  const isValid =
    productName.trim() &&
    manufacturer.trim() &&
    categoryCode &&
    attachments.length > 0 &&
    productName.length <= 50 &&
    manufacturer.length <= 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product registration. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="productName">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-1">
              <Input
                id="productName"
                placeholder="Enter product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value.slice(0, 50))}
                maxLength={50}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">{productName.length}/50 characters</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">
              Manufacturer <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-1">
              <Input
                id="manufacturer"
                placeholder="Enter manufacturer name"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value.slice(0, 50))}
                maxLength={50}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">{manufacturer.length}/50 characters</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryCode">
              Category <span className="text-red-500">*</span>
            </Label>
            {categoriesQ.isLoading && (
              <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Loading categories...
              </div>
            )}
            {categoriesQ.isError && (
              <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-600">
                Error loading categories
              </div>
            )}
            {!categoriesQ.isLoading && !categoriesQ.isError && (
              <Select
                value={categoryCode}
                onValueChange={setCategoryCode}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="categoryCode">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categoriesQ.data) &&
                    categoriesQ.data.map((category) => (
                      <SelectItem key={category.categoryCode} value={category.categoryCode}>
                        {category.categoryName || category.categoryCode}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">
              Attachments <span className="text-red-500">*</span>
            </Label>
            <Input
              id="attachments"
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => addAttachments(Array.from(event.target.files ?? []))}
              disabled={createMutation.isPending}
            />
            {attachments.length ? (
              <div className="space-y-2 rounded-md border p-2">
                {attachments.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setAttachments((current) => current.filter((_, i) => i !== index))
                      }
                      disabled={createMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Upload at least one PDF attachment.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
          >
            {createMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
