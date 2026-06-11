import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { CreditCard, Building2, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

import { api } from "../../services/api";

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  // Recover booking state if returning from login redirect, otherwise use location state
  const bookingData = location.state?.bookingData || location.state || {
    venueId: "osm_296568074",
    venueName: "Starbucks Ranelagh (Sample)",
    bookingDate: "2026-06-15",
    startTime: "09:00:00",
    endTime: "12:00:00",
    duration: "3",
    price: 10.5
  };

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states for contact info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please sign in to complete your booking.");
      navigate("/login", {
        state: {
          from: "/checkout",
          bookingData: location.state
        }
      });
    }
  }, [isAuthenticated, authLoading, navigate, location.state]);

  // Pre-populate details from user state
  useEffect(() => {
    if (user) {
      const parts = user.full_name.trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error("You must be signed in to book.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await api.createBooking({
        user_id: user.user_id || user.id || 1,
        venue_id: bookingData.venueId,
        booking_date: bookingData.bookingDate || "2026-06-15",
        start_time: bookingData.startTime || "09:00:00",
        end_time: bookingData.endTime || "12:00:00",
        seats_reserved: 1,
      });
      
      setIsProcessing(false);
      toast.success("Booking confirmed!", {
        description: `Booking ID: ${response.booking_id}. Check confirmation shortly.`,
      });
      navigate("/");
    } catch (err: any) {
      console.error("Booking failed:", err);
      setIsProcessing(false);
      const errorMsg = err.response?.data?.detail || "Booking placement failed.";
      toast.error("Booking failed", {
        description: errorMsg,
      });
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground flex items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="animate-spin size-5 text-primary" />
        Checking session status...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground min-h-[400px]">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Payment Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-4 rounded-lg border">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="size-5" />
                      Credit or Debit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 rounded-lg border">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="size-5" />
                      Bank Transfer
                    </Label>
                  </div>
                </RadioGroup>

                {paymentMethod === "card" && (
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" placeholder="MM/YY" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input id="cvc" placeholder="123" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input id="cardName" placeholder="John Doe" required />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isProcessing}
                  style={{ backgroundColor: '#253c50' }}
                >
                  {isProcessing ? "Processing..." : "Complete Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="mb-2">{bookingData.venueName}</h4>
                <p className="text-muted-foreground">
                  Duration: {bookingData.duration} hour{bookingData.duration !== "1" ? "s" : ""}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Workspace rental</span>
                  <span>${bookingData.price}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service fee</span>
                  <span>${(bookingData.price * 0.1).toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span>Total</span>
                <span className="text-2xl" style={{ color: '#2f8a64' }}>${(bookingData.price * 1.1).toFixed(2)}</span>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="size-5 text-primary mt-0.5" />
                  <div>
                    <p>Free cancellation</p>
                    <p className="text-sm text-muted-foreground">
                      Cancel up to 1 hour before your booking
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
