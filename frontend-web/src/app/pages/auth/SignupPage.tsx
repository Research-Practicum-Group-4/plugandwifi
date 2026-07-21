import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { MapPin, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

export function SignupPage() {
  const [userType, setUserType] = useState("space-user");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      await register(fullName, email, password);
      toast.success("Account created!", {
        description: "You can now log in with your credentials.",
      });
      navigate("/login");
    } catch (err: any) {
      console.error("Signup page submit failed:", err);
      const errorMsg = err.response?.data?.detail || "Registration failed. Try again.";
      toast.error("Signup failed", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="size-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2f8a64' }}>
              <MapPin className="size-6 text-white" />
            </div>
          </div>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join Plug & Wifi today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>I want to</Label>
            <RadioGroup value={userType} onValueChange={setUserType} disabled={loading}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border">
                <RadioGroupItem value="space-user" id="space-user" />
                <Label htmlFor="space-user" className="cursor-pointer flex-1">
                  <div>
                    <p>Find workspace</p>
                    <p className="text-sm text-muted-foreground">
                      Book spaces to work
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border">
                <RadioGroupItem value="space-provider" id="space-provider" />
                <Label htmlFor="space-provider" className="cursor-pointer flex-1">
                  <div>
                    <p>Offer workspace</p>
                    <p className="text-sm text-muted-foreground">
                      List my venue
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
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
              <Label htmlFor="password">Password</Label>
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
                  Creating Account...
                </>
              ) : (
                "Create Account"
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
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>

          {/* Continue browsing without registration */}
          <p className="text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Continue browsing without registration
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
