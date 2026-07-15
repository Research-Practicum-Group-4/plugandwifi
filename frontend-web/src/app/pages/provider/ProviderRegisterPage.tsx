import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export function ProviderRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms & Conditions.");
      return;
    }

    setLoading(true);

    try {
      // 1. Call registration endpoint with 'provider' role
      await register(fullName.trim(), email.trim(), password, "provider");

      // 2. Perform auto-login to create session
      await login(email.trim(), password);

      toast.success("Welcome aboard!", {
        description: "Your provider account has been registered successfully.",
      });

      // 3. Redirect directly to Provider Dashboard
      navigate("/provider/dashboard");
    } catch (err: any) {
      console.error("Provider registration failed:", err);
      const errMsg = err.response?.data?.detail || "Could not register provider account. Please try again.";
      toast.error("Registration failed", {
        description: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      title: "List Your Workspace Instantly",
      description: "Put your empty tables, desks, or lobbies on the map for remote workers.",
      icon: Sparkles,
    },
    {
      title: "Quick Visual Host Check-ins",
      description: "Host dashboard provides high-contrast Booking IDs for instant scanning.",
      icon: CheckCircle2,
    },
    {
      title: "Automatic Revenue Tracking",
      description: "Keep track of reservations, ratings, and monthly payouts transparently.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="grid lg:grid-cols-12 gap-8 max-w-5xl w-full items-stretch">
        
        {/* Left Column - Marketing & Value Prop */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-card border border-border rounded-2xl p-8 relative overflow-hidden bg-gradient-to-br from-emerald-50/20 via-background to-background">
          <div className="space-y-8 z-10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl flex items-center justify-center bg-emerald-600/10 text-emerald-600">
                <Building2 className="size-5" />
              </div>
              <span className="font-semibold text-sm tracking-wide uppercase text-emerald-600">Plug & Wifi Providers</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">Turn your space into revenue.</h1>
              <p className="text-muted-foreground leading-relaxed">
                Connect with thousands of remote workers, freelancers, and students looking for reliable Wi-Fi and quiet workspaces.
              </p>
            </div>

            <div className="space-y-6 pt-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex gap-4">
                    <div className="size-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-normal">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-border mt-8 lg:mt-0 z-10">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Host Dashboard v1.2</span>
              <span>Need help? Contact support</span>
            </div>
          </div>
        </div>

        {/* Right Column - Registration Form */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <Card className="w-full h-full flex flex-col justify-center border-border shadow-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Register as a Provider</CardTitle>
              <CardDescription>
                Create your space host credentials to list your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business / Company Name</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g. Starbucks Ranelagh or Grand Hotel Lobby"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={loading}
                    className="focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                    disabled={loading}
                    className="mt-1 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer select-none"
                  >
                    I agree to the{" "}
                    <Link to="#" className="text-emerald-600 font-medium hover:underline">
                      Space Provider Agreement
                    </Link>{" "}
                    and certify that I own or have permission to list this space.
                  </Label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow transition-all duration-200 mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Provider Account...
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      Get Started <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Want to book a workspace instead?{" "}
                <Link to="/signup" className="text-emerald-600 font-medium hover:underline">
                  Sign up as a space user
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
