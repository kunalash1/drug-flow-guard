import { Badge } from "@/components/ui/badge";
import type { ProductStatus, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_QUALITY_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  QUALITY_APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  QUALITY_REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  UNDER_MEDICAL_REVIEW: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  MEDICAL_APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  MEDICAL_REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  APPROVED: "bg-emerald-600 text-white border-transparent",
  REJECTED: "bg-red-600 text-white border-transparent",
  COMPLETED: "bg-emerald-600 text-white border-transparent",
  IN_PROGRESS: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

export function StatusBadge({ status }: { status: ProductStatus | TaskStatus | string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
