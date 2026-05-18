import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getStoredUser, useAuth } from "@/lib/auth";
import { REVIEWER_ROLES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Signed in");
      const signedInUser = getStoredUser();
      navigate({
        to: signedInUser && REVIEWER_ROLES.includes(signedInUser.role) ? "/tasks" : "/dashboard",
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-semibold">DrugRegistry</div>
                <div className="text-sm text-muted-foreground">Enterprise Workflow Suite</div>
              </div>
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight">
              Streamline drug product approvals across your organization.
            </h1>
            <p className="mt-4 text-muted-foreground">
              A unified registry for manufacturers, quality, medical, and drug controllers — with
              auditable, role-based workflows backed by Sunbird RC.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Multi-step configurable approval workflows",
                "Role-based dashboards and task assignment",
                "Attachment management with audit trail",
                "Real-time analytics and reporting",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="border-border/60 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Authenticate to access the registry.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
