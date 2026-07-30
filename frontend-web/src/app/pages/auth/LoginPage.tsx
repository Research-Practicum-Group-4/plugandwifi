import { Link, useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Loader2, ShieldAlert, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isAdminPortal = searchParams.get("portal") === "admin";

  // Redirect back to original path if specified, else home page
  const fromPath = (location.state as any)?.from || (isAdminPortal ? "/admin/dashboard" : "/");
  const bookingData = (location.state as any)?.bookingData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!", {
        description: "Logged in successfully.",
      });
      navigate(fromPath, {
        replace: true,
        state: bookingData
      });
    } catch (err: any) {
      console.error("Login page submit failed:", err);
      const errorMsg = err.response?.data?.detail || "Invalid email or password";
      toast.error("Login failed", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          {/* Register/Login as a Space Provider button */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {/* <Link
              to="/provider/register"
              className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-primary/60 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              <Building2 className="size-3" />
              Register/Login as a Space Provider
            </Link> */}
            <Link
              to={isAdminPortal ? "/login" : "/login?portal=admin"}
              state={location.state}
              className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-700/60 text-emerald-700 hover:bg-emerald-700/10 transition-colors whitespace-nowrap"
            >
              {isAdminPortal ? <User className="size-3" /> : <ShieldAlert className="size-3" />}
              {isAdminPortal ? "Back to User Login" : "Admin Login"}
            </Link>
          </div>
          {isAdminPortal && (
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2f8a64' }}>
                <ShieldAlert className="size-6 text-white" />
              </div>
            </div>
          )}
          <CardTitle>{isAdminPortal ? "Admin Sign In" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isAdminPortal
              ? "Sign in with your admin account to access the admin dashboard"
              : "Sign in to your Plug & Wifi account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
              or continue with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" disabled={loading}>Google</Button>
            <Button variant="outline" disabled={loading}>Apple</Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>

          {/* Continue browsing without login */}
          <p className="text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Continue browsing without login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
