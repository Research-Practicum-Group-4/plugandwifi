import { useLocation, useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { CheckCircle2, Calendar, Clock, Users, MapPin, Download, Share2 } from "lucide-react";

export function BookingConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state || {};

  const {
    bookingId,
    venueName = "Workspace",
    bookingDate,
    startTime,
    endTime,
    duration,
    seatsReserved = 1,
    price,
  } = booking;

  const formatTime = (t: string) => (t ? t.substring(0, 5) : "—");

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      {/* Success header */}
      <div className="text-center mb-10">
        <div
          className="size-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "#2f8a64" }}
        >
          <CheckCircle2 className="size-10 text-white" />
        </div>
        <h1 className="mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground">
          Your workspace has been reserved. Check the details below.
        </p>
        {bookingId && (
          <p className="text-sm font-mono text-muted-foreground mt-2">
            Booking ID: #{bookingId}
          </p>
        )}
      </div>

      {/* Booking details card */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 mt-0.5" style={{ color: "#2f8a64" }} />
            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-semibold">{venueName}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Calendar className="size-5 mt-0.5" style={{ color: "#2f8a64" }} />
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">{formatDate(bookingDate)}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Clock className="size-5 mt-0.5" style={{ color: "#2f8a64" }} />
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-semibold">
                {formatTime(startTime)} – {formatTime(endTime)}
                {duration ? ` (${duration}h)` : ""}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Users className="size-5 mt-0.5" style={{ color: "#2f8a64" }} />
            <div>
              <p className="text-sm text-muted-foreground">Seats</p>
              <p className="font-semibold">
                {seatsReserved} {seatsReserved === 1 ? "seat" : "seats"}
              </p>
            </div>
          </div>

          {price !== undefined && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total paid</span>
                <span className="text-2xl font-bold" style={{ color: "#2f8a64" }}>
                  ${(price * 1.1).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Button variant="outline" className="flex-1 gap-2">
          <Download className="size-4" />
          Download Receipt
        </Button>
        <Button variant="outline" className="flex-1 gap-2">
          <Share2 className="size-4" />
          Share Details
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1"
          style={{ backgroundColor: "#253c50" }}
          onClick={() => navigate("/bookings")}
        >
          View My Bookings
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
