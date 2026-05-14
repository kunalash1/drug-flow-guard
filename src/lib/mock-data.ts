import type {
  Product,
  ProductCategory,
  WorkflowDefinition,
  WorkflowTask,
  ProductWorkflowInstance,
  ProductStatus,
  Role,
} from "./types";

// In-memory mock store. Replace with real API calls later.

const STORAGE_KEY = "drugreg_mockstore_v1";

interface Store {
  categories: ProductCategory[];
  workflows: WorkflowDefinition[];
  products: Product[];
  instances: ProductWorkflowInstance[];
  tasks: WorkflowTask[];
}

const seed: Store = {
  categories: [
    { categoryCode: "TAB", categoryName: "Tablets", workflowCode: "STD_DRUG_WF" },
    { categoryCode: "INJ", categoryName: "Injectables", workflowCode: "STD_DRUG_WF" },
    { categoryCode: "SYR", categoryName: "Syrups", workflowCode: "STD_DRUG_WF" },
  ],
  workflows: [
    {
      workflowCode: "STD_DRUG_WF",
      workflowName: "Standard Drug Approval",
      version: "1.0",
      active: true,
      steps: [
        {
          stepNumber: 1,
          stepName: "Quality Review",
          approverRole: "QUALITY_OFFICER",
          mandatoryAttachment: true,
          nextStatus: "QUALITY_APPROVED",
          rejectionStatus: "QUALITY_REJECTED",
        },
        {
          stepNumber: 2,
          stepName: "Medical Review",
          approverRole: "MEDICAL_OFFICER",
          mandatoryAttachment: false,
          nextStatus: "MEDICAL_APPROVED",
          rejectionStatus: "MEDICAL_REJECTED",
        },
        {
          stepNumber: 3,
          stepName: "Drug Controller Final Approval",
          approverRole: "DRUG_CONTROLLER",
          mandatoryAttachment: false,
          nextStatus: "APPROVED",
          rejectionStatus: "REJECTED",
        },
      ],
    },
  ],
  products: [],
  instances: [],
  tasks: [],
};

function load(): Store {
  if (typeof window === "undefined") return structuredClone(seed);
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = structuredClone(seed);
    seedDemoProducts(initial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return structuredClone(seed);
  }
}

function save(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seedDemoProducts(store: Store) {
  const samples: Array<Partial<Product>> = [
    { productCode: "DRG-001", productName: "Paracetamol 500mg", manufacturer: "Acme Pharma", categoryCode: "TAB", status: "PENDING_QUALITY_REVIEW" },
    { productCode: "DRG-002", productName: "Amoxicillin 250mg", manufacturer: "Acme Pharma", categoryCode: "TAB", status: "UNDER_MEDICAL_REVIEW" },
    { productCode: "DRG-003", productName: "Insulin Glargine", manufacturer: "BioMed Labs", categoryCode: "INJ", status: "APPROVED" },
    { productCode: "DRG-004", productName: "Cough Syrup XR", manufacturer: "Wellness Co.", categoryCode: "SYR", status: "DRAFT" },
  ];
  for (const s of samples) {
    const osid = uid("prod");
    const product: Product = {
      osid,
      productCode: s.productCode!,
      productName: s.productName!,
      manufacturer: s.manufacturer!,
      categoryCode: s.categoryCode!,
      status: s.status as ProductStatus,
      ownerUsername: "manufacturer",
      createdAt: new Date().toISOString(),
      attachments: [],
    };
    store.products.push(product);
    if (product.status !== "DRAFT") {
      const wf = store.workflows[0];
      const instance: ProductWorkflowInstance = {
        instanceId: uid("inst"),
        productOsid: osid,
        workflowCode: wf.workflowCode,
        currentStep: product.status === "PENDING_QUALITY_REVIEW" ? 1 : product.status === "UNDER_MEDICAL_REVIEW" ? 2 : 3,
        status: product.status,
        history: [],
      };
      store.instances.push(instance);
      // Create a current pending task
      if (product.status !== "APPROVED") {
        const step = wf.steps[instance.currentStep - 1];
        store.tasks.push({
          taskId: uid("task"),
          workflowInstanceId: instance.instanceId,
          productOsid: osid,
          productName: product.productName,
          productCode: product.productCode,
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          assignedRole: step.approverRole,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }
}

// API surface
export const db = {
  // Products
  listProducts(role?: Role, username?: string): Product[] {
    const s = load();
    if (role === "MANUFACTURER" && username) {
      return s.products.filter((p) => p.ownerUsername === username);
    }
    return s.products;
  },
  getProduct(osid: string): Product | undefined {
    return load().products.find((p) => p.osid === osid);
  },
  createProduct(input: Omit<Product, "osid" | "createdAt" | "attachments" | "status"> & { status?: ProductStatus }): Product {
    const s = load();
    const p: Product = {
      ...input,
      osid: uid("prod"),
      createdAt: new Date().toISOString(),
      attachments: [],
      status: input.status ?? "DRAFT",
    };
    s.products.push(p);
    save(s);
    return p;
  },
  updateProduct(osid: string, patch: Partial<Product>) {
    const s = load();
    const idx = s.products.findIndex((p) => p.osid === osid);
    if (idx >= 0) {
      s.products[idx] = { ...s.products[idx], ...patch };
      save(s);
      return s.products[idx];
    }
    return undefined;
  },
  addAttachment(osid: string, file: File) {
    const s = load();
    const p = s.products.find((x) => x.osid === osid);
    if (!p) return;
    p.attachments.push({
      id: uid("att"),
      fileName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    });
    save(s);
  },

  // Categories
  listCategories(): ProductCategory[] {
    return load().categories;
  },
  upsertCategory(c: ProductCategory) {
    const s = load();
    const idx = s.categories.findIndex((x) => x.categoryCode === c.categoryCode);
    if (idx >= 0) s.categories[idx] = c;
    else s.categories.push(c);
    save(s);
  },
  deleteCategory(code: string) {
    const s = load();
    s.categories = s.categories.filter((c) => c.categoryCode !== code);
    save(s);
  },

  // Workflows
  listWorkflows(): WorkflowDefinition[] {
    return load().workflows;
  },
  upsertWorkflow(w: WorkflowDefinition) {
    const s = load();
    const idx = s.workflows.findIndex((x) => x.workflowCode === w.workflowCode);
    if (idx >= 0) s.workflows[idx] = w;
    else s.workflows.push(w);
    save(s);
  },

  // Tasks
  listTasks(role?: Role): WorkflowTask[] {
    const s = load();
    if (!role) return s.tasks;
    if (role === "ADMIN" || role === "MANUFACTURER") return s.tasks;
    return s.tasks.filter((t) => t.assignedRole === role);
  },
  getInstanceForProduct(osid: string): ProductWorkflowInstance | undefined {
    return load().instances.find((i) => i.productOsid === osid);
  },
  getTasksForProduct(osid: string): WorkflowTask[] {
    return load().tasks.filter((t) => t.productOsid === osid);
  },

  // Submit product → start workflow
  submitProduct(osid: string): { ok: boolean; message: string } {
    const s = load();
    const p = s.products.find((x) => x.osid === osid);
    if (!p) return { ok: false, message: "Product not found" };
    const cat = s.categories.find((c) => c.categoryCode === p.categoryCode);
    if (!cat) return { ok: false, message: "Category has no workflow mapping" };
    const wf = s.workflows.find((w) => w.workflowCode === cat.workflowCode);
    if (!wf) return { ok: false, message: "Workflow definition not found" };
    const firstStep = wf.steps[0];
    if (firstStep.mandatoryAttachment && p.attachments.length === 0) {
      return { ok: false, message: "Attachments are mandatory for the first step" };
    }
    const instance: ProductWorkflowInstance = {
      instanceId: uid("inst"),
      productOsid: osid,
      workflowCode: wf.workflowCode,
      currentStep: 1,
      status: "PENDING_QUALITY_REVIEW",
      history: [],
    };
    s.instances.push(instance);
    s.tasks.push({
      taskId: uid("task"),
      workflowInstanceId: instance.instanceId,
      productOsid: osid,
      productName: p.productName,
      productCode: p.productCode,
      stepNumber: firstStep.stepNumber,
      stepName: firstStep.stepName,
      assignedRole: firstStep.approverRole,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });
    p.status = "PENDING_QUALITY_REVIEW";
    save(s);
    return { ok: true, message: "Submitted for approval" };
  },

  actOnTask(taskId: string, action: "APPROVE" | "REJECT", comments: string, actorUsername: string): { ok: boolean; message: string } {
    const s = load();
    const task = s.tasks.find((t) => t.taskId === taskId);
    if (!task) return { ok: false, message: "Task not found" };
    if (task.status !== "PENDING") return { ok: false, message: "Task already actioned" };
    const inst = s.instances.find((i) => i.instanceId === task.workflowInstanceId);
    const product = s.products.find((p) => p.osid === task.productOsid);
    const wf = s.workflows.find((w) => inst && w.workflowCode === inst.workflowCode);
    if (!inst || !product || !wf) return { ok: false, message: "Workflow integrity error" };
    const step = wf.steps[task.stepNumber - 1];

    task.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    task.comments = comments;
    task.actionDate = new Date().toISOString();
    task.assignedUser = actorUsername;
    inst.history.push({ ...task });

    if (action === "REJECT") {
      product.status = step.rejectionStatus;
      inst.status = step.rejectionStatus;
    } else {
      product.status = step.nextStatus;
      inst.status = step.nextStatus;
      const nextStep = wf.steps[task.stepNumber];
      if (nextStep) {
        inst.currentStep = nextStep.stepNumber;
        // Map progressing status
        if (nextStep.approverRole === "MEDICAL_OFFICER") {
          product.status = "UNDER_MEDICAL_REVIEW";
          inst.status = "UNDER_MEDICAL_REVIEW";
        } else if (nextStep.approverRole === "DRUG_CONTROLLER") {
          product.status = "IN_PROGRESS";
          inst.status = "IN_PROGRESS";
        }
        s.tasks.push({
          taskId: uid("task"),
          workflowInstanceId: inst.instanceId,
          productOsid: product.osid,
          productName: product.productName,
          productCode: product.productCode,
          stepNumber: nextStep.stepNumber,
          stepName: nextStep.stepName,
          assignedRole: nextStep.approverRole,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
      } else {
        // Final
        product.status = "APPROVED";
        inst.status = "COMPLETED";
      }
    }
    save(s);
    return { ok: true, message: `Task ${action.toLowerCase()}d` };
  },

  resetStore() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
