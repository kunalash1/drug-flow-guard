export type Role =
  | "ADMIN"
  | "MANUFACTURER"
  | "QUALITY_OFFICER"
  | "MEDICAL_OFFICER"
  | "DRUG_CONTROLLER";

export const ALL_ROLES: Role[] = [
  "ADMIN",
  "MANUFACTURER",
  "QUALITY_OFFICER",
  "MEDICAL_OFFICER",
  "DRUG_CONTROLLER",
];

export type ProductStatus =
  | "DRAFT"
  | "PENDING_QUALITY_REVIEW"
  | "QUALITY_APPROVED"
  | "QUALITY_REJECTED"
  | "UNDER_MEDICAL_REVIEW"
  | "MEDICAL_APPROVED"
  | "MEDICAL_REJECTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "IN_PROGRESS";

export interface Product {
  osid: string;
  productCode: string;
  productName: string;
  manufacturer: string;
  categoryCode: string;
  status: ProductStatus;
  ownerUsername: string;
  createdAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ProductCategory {
  categoryCode: string;
  categoryName: string;
  workflowCode: string;
}

export interface WorkflowStep {
  stepNumber: number;
  stepName: string;
  approverRole: Role;
  mandatoryAttachment: boolean;
  nextStatus: ProductStatus;
  rejectionStatus: ProductStatus;
}

export interface WorkflowDefinition {
  workflowCode: string;
  workflowName: string;
  version: string;
  active: boolean;
  steps: WorkflowStep[];
}

export type TaskStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WorkflowTask {
  taskId: string;
  workflowInstanceId: string;
  productOsid: string;
  productName: string;
  productCode: string;
  stepNumber: number;
  stepName: string;
  assignedRole: Role;
  assignedUser?: string;
  status: TaskStatus;
  comments?: string;
  actionDate?: string;
  createdAt: string;
}

export interface ProductWorkflowInstance {
  instanceId: string;
  productOsid: string;
  workflowCode: string;
  currentStep: number;
  status: ProductStatus;
  history: WorkflowTask[];
}

export interface User {
  username: string;
  displayName: string;
  role: Role;
  token: string;
}
