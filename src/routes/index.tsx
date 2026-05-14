import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const u = typeof window !== "undefined" ? getStoredUser() : null;
    throw redirect({ to: u ? "/dashboard" : "/login" });
  },
  component: () => null,
});
