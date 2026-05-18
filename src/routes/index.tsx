import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredUser } from "@/lib/auth";
import { REVIEWER_ROLES } from "@/lib/types";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const u = typeof window !== "undefined" ? getStoredUser() : null;
    throw redirect({
      to: u ? (REVIEWER_ROLES.includes(u.role) ? "/tasks" : "/dashboard") : "/login",
    });
  },
  component: () => null,
});
