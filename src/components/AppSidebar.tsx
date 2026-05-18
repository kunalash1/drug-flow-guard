import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  CheckSquare,
  Layers,
  Workflow,
  BarChart3,
  Pill,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const items: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANUFACTURER"],
  },
  { title: "Products", url: "/products", icon: Package, roles: ["ADMIN", "MANUFACTURER"] },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
    roles: ["ADMIN", "QUALITY_OFFICER", "MEDICAL_OFFICER", "DRUG_CONTROLLER"],
  },
  { title: "Categories", url: "/categories", icon: Layers, roles: ["ADMIN"] },
  {
    title: "Workflows",
    url: "/workflows",
    icon: Workflow,
    roles: ["ADMIN", "QUALITY_OFFICER", "MEDICAL_OFFICER", "DRUG_CONTROLLER"],
  },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["ADMIN"] },
];

export function AppSidebar() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!user) return null;
  const visible = items.filter((i) => i.roles.includes(user.role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">DrugRegistry</span>
            <span className="text-xs text-muted-foreground">Workflow Suite</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.title + item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === item.url || path.startsWith(item.url + "/")}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
