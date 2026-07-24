import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className="size-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#2f8a64" }}
            >
              {sent ? (
                <CheckCircle2 className="size-6 text-white" />
              ) : (
                <Mail className="size-6 text-white" />
              )}
            </div>
          </div>
          <CardTitle>{sent ? "Check your inbox" : "Reset your password"}</CardTitle>
          <CardDescription>
            {sent
              ? `We've sent password reset instructions to ${email}`
              : "Enter your email and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 text-center">
                We've sent the details to reset your password to your email address. Check your
                spam folder if you don't see it within a few minutes.
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setEmail(""); setSent(false); }}
              >
                Send to a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
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
              <Button type="submit" className="w-full" size="lg" disabled={loading || !email}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
