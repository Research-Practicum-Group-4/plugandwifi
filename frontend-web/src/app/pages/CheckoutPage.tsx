import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { CheckCircle, Loader2, MapPin, Building2, CalendarDays, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../../services/api";

function SignInModal({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="size-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#2f8a64" }}
            >
              <MapPin className="size-4 text-white" />
            </div>
            Sign in to continue
          </DialogTitle>
        </DialogHeader>
        <div className="absolute top-4 right-4">
          <Link
            to="/provider/offer-space"
            className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-primary/60 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
          >
            <Building2 className="size-3" />
            Register/Login as a Space Provider
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Sign in to complete your booking. Your checkout details are saved.
        </p>
        <form
          className="space-y-4 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Signed in successfully");
            onSignedIn();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="modal-email">Email</Label>
            <Input id="modal-email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-password">Password</Label>
            <Input id="modal-password" type="password" required />
          </div>
          <Button type="submit" className="w-full" style={{ backgroundColor: "#253c50" }}>
            Sign In & Continue
          </Button>
        </form>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button variant="outline">Google</Button>
          <Button variant="outline">Apple</Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/signup" className="text-primary hover:underline" onClick={onClose}>
            Sign up
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

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
    price: 10.5,
  };

  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Form states for contact info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  const [cvc, setCvc] = useState("123");
  const [cardName, setCardName] = useState("");

  // Redirect if not logged in (but also allow sign-in modal)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Don't redirect immediately — user can sign in via modal
    }
  }, [isAuthenticated, authLoading]);

  // Pre-populate details from user state
  useEffect(() => {
    if (user) {
      const parts = user.full_name.trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const processPayment = async () => {
    setIsProcessing(true);

    try {
      const booking = await api.createBooking({
        venue_id: bookingData.venueId,
        booking_date: bookingData.bookingDate || "2026-06-15",
        start_time: bookingData.startTime || "09:00:00",
        end_time: bookingData.endTime || "12:00:00",
        seats_reserved: bookingData.seatsReserved || 1,
      });
      const payment = await api.confirmMockPayment({
        booking_id: booking.booking_id,
        card_number: paymentMethod === "stripe" ? cardNumber : "4242 4242 4242 4242",
      });

      if (payment.payment_status !== "paid") {
        throw new Error(payment.message || "Payment failed.");
      }

      setIsProcessing(false);
      toast.success("Payment approved. Booking confirmed!");
      navigate("/booking-confirmation", {
        state: {
          bookingId: payment.booking_id,
          orderId: payment.order_id,
          venueName: bookingData.venueName,
          bookingDate: bookingData.bookingDate,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          duration: bookingData.duration,
          seatsReserved: bookingData.seatsReserved || 1,
          price: bookingData.price,
        },
      });
    } catch (err: any) {
      console.error("Booking failed:", err);
      setIsProcessing(false);
      const errorMsg = err.response?.data?.detail || err.message || "Payment or booking failed.";
      toast.error("Checkout failed", { description: errorMsg });
    }
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      // Show sign-in modal instead of redirect
      setShowSignIn(true);
      return;
    }
    processPayment();
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground flex items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="animate-spin size-5 text-primary" />
        Checking session status...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSignedIn={() => {
          setShowSignIn(false);
          processPayment();
        }}
      />

      <h1 className="mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Left column */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    <Building2 className="size-3.5" />
                    <span>Workspace Summary</span>
                  </div>
                  <h2 className="text-2xl font-semibold">{bookingData.venueName}</h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700">
                  Ready to book
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span>Date</span>
                  </div>
                  <p className="font-semibold">{bookingData.bookingDate}</p>
                </div>
                <div className="rounded-xl border bg-background/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="size-4" />
                    <span>Time</span>
                  </div>
                  <p className="font-semibold">
                    {bookingData.startTime} - {bookingData.endTime}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    <span>Seats</span>
                  </div>
                  <p className="font-semibold">{bookingData.seatsReserved || 1} reserved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
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

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  {/* Google Pay */}
                  <div className="flex items-center space-x-2 p-4 rounded-lg border">
                    <RadioGroupItem value="googlepay" id="googlepay" />
                    <Label
                      htmlFor="googlepay"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500 font-semibold text-sm">G</span>
                        <span className="text-red-500 font-semibold text-sm">o</span>
                        <span className="text-yellow-500 font-semibold text-sm">o</span>
                        <span className="text-blue-500 font-semibold text-sm">g</span>
                        <span className="text-green-500 font-semibold text-sm">l</span>
                        <span className="text-red-500 font-semibold text-sm">e</span>
                      </div>
                      <span className="font-medium">Google Pay</span>
                    </Label>
                  </div>
                  {/* Stripe */}
                  <div className="flex items-center space-x-2 p-4 rounded-lg border">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label
                      htmlFor="stripe"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div
                        className="size-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: "#635bff" }}
                      >
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      <span className="font-medium">Stripe</span>
                      <span className="text-xs text-muted-foreground">(Credit / Debit Card)</span>
                    </Label>
                  </div>
                </RadioGroup>

                {paymentMethod === "stripe" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Demo cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 fails.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Name on Card</Label>
                      <Input
                        id="cardName"
                        placeholder="John Doe"
                        value={cardName || `${firstName} ${lastName}`.trim()}
                        onChange={(e) => setCardName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isProcessing}
                  style={{ backgroundColor: "#253c50" }}
                >
                  {isProcessing ? "Processing payment..." : "Pay & Confirm Booking"}
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
                  Duration: {bookingData.duration} hour
                  {bookingData.duration !== "1" ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seats: {bookingData.seatsReserved || 1}{" "}
                  {(bookingData.seatsReserved || 1) === 1 ? "seat" : "seats"}
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
                <span className="text-2xl" style={{ color: "#2f8a64" }}>
                  ${(bookingData.price * 1.1).toFixed(2)}
                </span>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="size-5 text-primary mt-0.5" />
                  <div>
                    <p>Free cancellation</p>
                    <p className="text-sm text-muted-foreground">
                      Cancel up to 24 hours before your booking
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
