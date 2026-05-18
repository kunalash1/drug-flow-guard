import type { Product, ProductCategory } from "./types";

const API_BASE_URL = "/api";

interface SearchFilters {
  [key: string]: unknown;
}

interface SearchResponse<T> {
  totalCount: number;
  data: T[];
}

async function apiCall<T>(
  endpoint: string,
  token: string,
  method: "POST" | "GET" = "POST",
  filters?: SearchFilters
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: method === "POST" ? JSON.stringify({ filters: filters ?? {} }) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function searchProducts(
  token: string,
  filters?: SearchFilters
): Promise<SearchResponse<Product>> {
  return apiCall("/v1/Product/search", token, "POST", filters);
}

export async function searchCategories(
  token: string
): Promise<SearchResponse<ProductCategory>> {
  return apiCall("/v1/Category/search", token, "POST");
}

export async function getProductCategories(token: string): Promise<ProductCategory[]> {
  const url = `${API_BASE_URL}/v1/ProductCategory`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
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
  product: CreateProductRequest
): Promise<{ osid: string; productCode: string }> {
  const productCode = `DRUG${Date.now()}`;
  const url = `${API_BASE_URL}/v1/Product`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      productCode,
      productName: product.productName,
      manufacturer: product.manufacturer,
      categoryCode: product.categoryCode,
      status: "DRAFT",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
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
  categoryCode: string
): Promise<ProductCategorySearchResponse> {
  return apiCall(
    "/v1/ProductCategory/search",
    token,
    "POST",
    {
      categoryCode: {
        eq: categoryCode,
      },
    }
  );
}

interface WorkflowStep {
  workflowCode: string;
  rejectionStatus: string;
  nextStatus: string;
  stepName: string;
  mandatoryAttachment: boolean;
  approverRole: string;
  osid: string;
  stepNumber: number;
  osOwner: string[];
}

interface WorkflowStepSearchResponse {
  totalCount: number;
  data: WorkflowStep[];
}

export async function searchWorkflowSteps(
  token: string,
  workflowCode: string
): Promise<WorkflowStepSearchResponse> {
  return apiCall(
    "/v1/WorkflowStep/search",
    token,
    "POST",
    {
      workflowCode: {
        eq: workflowCode,
      },
    }
  );
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
  data: ProductWorkflowInstanceRequest
): Promise<{ osid: string; workflowInstanceId: string }> {
  const url = `${API_BASE_URL}/v1/ProductWorkflowInstance`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
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
  data: WorkflowTaskRequest
): Promise<{ osid: string; taskId: string }> {
  const url = `${API_BASE_URL}/v1/WorkflowTask`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function updateProductStatus(
  token: string,
  osid: string,
  status: string
): Promise<{ osid: string }> {
  const url = `${API_BASE_URL}/v1/Product/${osid}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
