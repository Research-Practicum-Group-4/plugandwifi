import { Link } from "react-router";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { MapPin } from "lucide-react";

export function SignupPage() {
  const [userType, setUserType] = useState("space-user");

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
            <RadioGroup value={userType} onValueChange={setUserType}>
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

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
              or continue with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline">Google</Button>
            <Button variant="outline">Apple</Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
