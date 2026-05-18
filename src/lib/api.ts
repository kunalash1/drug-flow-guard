import type { Product, ProductCategory } from "./types";
import { getValidAccessToken, logoutStoredUser, refreshStoredUserToken } from "./auth";

const API_BASE_URL = "/api";

interface SearchFilters {
  [key: string]: unknown;
}

interface SearchResponse<T> {
  totalCount: number;
  data: T[];
}

export interface WorkflowTaskRecord {
  assignedRole: string;
  stepNumber: number;
  osid: string;
  workflowInstanceId: string;
  osOwner?: string[];
  taskId: string;
  status: string;
}

interface WorkflowStepRecord {
  workflowCode: string;
  rejectionStatus: string;
  nextStatus: string;
  stepName: string;
  mandatoryAttachment: boolean;
  approverRole: string;
  osid: string;
  stepNumber: number;
  osOwner?: string[];
}

interface ProductWorkflowInstanceRecord {
  osid: string;
  workflowInstanceId: string;
  productCode: string;
  workflowCode: string;
  currentStep?: number;
  currentStatus?: string;
  overallStatus?: string;
}

async function apiCall<T>(
  endpoint: string,
  token: string,
  method: "POST" | "GET" = "POST",
  filters?: SearchFilters,
): Promise<T> {
  return authenticatedRequest<T>(endpoint, token, {
    method,
    body: method === "POST" ? JSON.stringify({ filters: filters ?? {} }) : undefined,
  });
}

async function authenticatedRequest<T>(
  endpoint: string,
  fallbackToken: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getValidAccessToken(fallbackToken);
  if (!token) {
    logoutStoredUser();
    throw new Error("Session expired. Please sign in again.");
  }

  let response = await fetchWithToken(url, init, token);

  if (response.status === 401) {
    const refreshed = await refreshStoredUserToken();
    if (refreshed?.token) {
      response = await fetchWithToken(url, init, refreshed.token);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      logoutStoredUser();
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

function fetchWithToken(url: string, init: RequestInit, token: string) {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function searchProducts(
  token: string,
  filters?: SearchFilters,
): Promise<SearchResponse<Product>> {
  return apiCall("/v1/Product/search", token, "POST", filters);
}

export async function searchCategories(token: string): Promise<SearchResponse<ProductCategory>> {
  return apiCall("/v1/Category/search", token, "POST");
}

export async function listWorkflowTasks(
  token: string,
): Promise<SearchResponse<WorkflowTaskRecord>> {
  return authenticatedRequest("/v1/WorkflowTask", token, {
    method: "GET",
  });
}

export async function listWorkflowSteps(
  token: string,
): Promise<SearchResponse<WorkflowStepRecord>> {
  return authenticatedRequest("/v1/WorkflowStep", token, {
    method: "GET",
  });
}

export async function getProductCategories(token: string): Promise<ProductCategory[]> {
  const result = await authenticatedRequest<{ data?: ProductCategory[] }>(
    "/v1/ProductCategory",
    token,
    {
      method: "GET",
    },
  );
  return result.data || [];
}

export interface CreateProductRequest {
  productName: string;
  manufacturer: string;
  categoryCode: string;
  status?: string;
}

export async function createProduct(
  token: string,
  product: CreateProductRequest,
): Promise<{ osid: string; productCode: string }> {
  const productCode = `DRUG${Date.now()}`;
  return authenticatedRequest("/v1/Product", token, {
    method: "POST",
    body: JSON.stringify({
      productCode,
      productName: product.productName,
      manufacturer: product.manufacturer,
      categoryCode: product.categoryCode,
      status: "DRAFT",
    }),
  });
}

interface ProductCategorySearchResponse {
  totalCount: number;
  data: Array<{
    workflowCode: string;
    osid: string;
    categoryCode: string;
    categoryName: string;
    osOwner: string[];
  }>;
}

export async function searchProductCategory(
  token: string,
  categoryCode: string,
): Promise<ProductCategorySearchResponse> {
  return apiCall("/v1/ProductCategory/search", token, "POST", {
    categoryCode: {
      eq: categoryCode,
    },
  });
}

interface WorkflowStepSearchResponse {
  totalCount: number;
  data: WorkflowStepRecord[];
}

export async function searchWorkflowSteps(
  token: string,
  workflowCode: string,
): Promise<WorkflowStepSearchResponse> {
  return apiCall("/v1/WorkflowStep/search", token, "POST", {
    workflowCode: {
      eq: workflowCode,
    },
  });
}

interface ProductWorkflowInstanceRequest {
  workflowInstanceId: string;
  productCode: string;
  workflowCode: string;
  currentStep: number;
  currentStatus: string;
  overallStatus: string;
}

export async function createProductWorkflowInstance(
  token: string,
  data: ProductWorkflowInstanceRequest,
): Promise<{ osid: string; workflowInstanceId: string }> {
  return authenticatedRequest("/v1/ProductWorkflowInstance", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function searchProductWorkflowInstance(
  token: string,
  workflowInstanceId: string,
): Promise<SearchResponse<ProductWorkflowInstanceRecord>> {
  return apiCall("/v1/ProductWorkflowInstance/search", token, "POST", {
    workflowInstanceId: {
      eq: workflowInstanceId,
    },
  });
}

export async function updateProductWorkflowInstance(
  token: string,
  osid: string,
  data: Partial<
    Pick<ProductWorkflowInstanceRecord, "currentStep" | "currentStatus" | "overallStatus">
  >,
): Promise<{ osid: string }> {
  return authenticatedRequest(`/v1/ProductWorkflowInstance/${osid}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

interface WorkflowTaskRequest {
  taskId: string;
  workflowInstanceId: string;
  stepNumber: number;
  assignedRole: string;
  status: string;
}

export async function createWorkflowTask(
  token: string,
  data: WorkflowTaskRequest,
): Promise<{ osid: string; taskId: string }> {
  return authenticatedRequest("/v1/WorkflowTask", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkflowTaskStatus(
  token: string,
  osid: string,
  status: string,
): Promise<{ osid: string }> {
  return authenticatedRequest(`/v1/WorkflowTask/${osid}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function approveWorkflowTask(token: string, task: WorkflowTaskRecord): Promise<void> {
  const instanceResp = await searchProductWorkflowInstance(token, task.workflowInstanceId);
  const instance = instanceResp.data[0];
  if (!instance) throw new Error("Workflow instance not found for task");

  const stepsResp = await listWorkflowSteps(token);
  const steps = stepsResp.data
    .filter((step) => step.workflowCode === instance.workflowCode)
    .sort((a, b) => a.stepNumber - b.stepNumber);
  const currentStep = steps.find((step) => step.stepNumber === task.stepNumber);
  const nextStep = steps.find((step) => step.stepNumber === task.stepNumber + 1);
  if (!currentStep) throw new Error("Current workflow step not found");

  const taskApprovedStatus = currentStep.nextStatus || "APPROVED";
  await updateWorkflowTaskStatus(token, task.osid, taskApprovedStatus);

  const productResp = await searchProducts(token, {
    productCode: {
      eq: instance.productCode,
    },
  });
  const product = productResp.data[0];
  if (!product) throw new Error("Product not found for workflow instance");

  if (!nextStep) {
    await updateProductStatus(token, product.osid, "APPROVED");
    await updateProductWorkflowInstance(token, instance.osid, {
      currentStatus: "APPROVED",
      overallStatus: "APPROVED",
    });
    return;
  }

  const nextPendingStatus = getPendingStatus(nextStep.stepName, nextStep.approverRole);
  await updateProductStatus(token, product.osid, nextPendingStatus);
  await updateProductWorkflowInstance(token, instance.osid, {
    currentStep: nextStep.stepNumber,
    currentStatus: nextPendingStatus,
  });
  await createWorkflowTask(token, {
    taskId: `TASK-${Date.now()}`,
    workflowInstanceId: task.workflowInstanceId,
    stepNumber: nextStep.stepNumber,
    assignedRole: nextStep.approverRole,
    status: nextPendingStatus,
  });
}

function getPendingStatus(stepName: string, approverRole?: string) {
  if (approverRole === "DRUG_CONTROLLER") return "PENDING_FINAL_APPROVAL";
  return `PENDING_${stepName.toUpperCase().replace(/\s+/g, "_")}`;
}

export async function updateProductStatus(
  token: string,
  osid: string,
  status: string,
): Promise<{ osid: string }> {
  return authenticatedRequest(`/v1/Product/${osid}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
