import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Calendar, MapPin, Clock, Star, XCircle, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { UserBookingItem } from "../../types/api";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.split(":").length === 3) return timeStr.substring(0, 5);
  return timeStr;
}

export function BookingsPage() {
  const [upcomingBookings, setUpcomingBookings] = useState<UserBookingItem[]>([]);
  const [pastBookings, setPastBookings] = useState<UserBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getUserBookings();
      setUpcomingBookings(data.upcoming || []);
      // Combine completed and cancelled as "past"
      setPastBookings([...(data.completed || []), ...(data.cancelled || [])]);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      toast.error("Could not fetch bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: number) => {
    setCancellingId(bookingId);
    try {
      const response = await api.cancelBooking(bookingId);
      toast.success(response.message || "Booking cancelled successfully.");
      await fetchBookings();
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);
      const errMsg = err.response?.data?.detail || err.message || "Cancellation failed.";
      toast.error("Cancellation failed", { description: errMsg });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Loader2 className="animate-spin size-8 text-emerald-600" />
        <p className="text-sm font-medium">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8">My Bookings</h1>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
        </TabsList>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">No upcoming bookings</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring and book your perfect workspace
                </p>
                <Link to="/search">
                  <Button style={{ backgroundColor: "#2f8a64" }}>Browse Spaces</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <Card key={booking.booking_id}>
                <div className="grid md:grid-cols-[200px_1fr] gap-4">
                  <div className="flex min-h-[180px] flex-col justify-between rounded-l-xl border-b border-border/60 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 md:border-b-0 md:border-r">
                    <div>
                      <div className="mb-2 inline-flex rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-medium text-sky-700">
                        Upcoming booking
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="size-4" />
                        <span>{booking.venue_name || "Workspace"}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Check-in code #{booking.booking_id}
                    </div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="mb-1">{booking.venue_name || "Workspace"}</h3>
                        <p className="text-muted-foreground text-sm flex items-center gap-1">
                          <MapPin className="size-4" />
                          {/* ** HARDCODED ** - address not in API response */}
                          New York, NY
                        </p>
                      </div>
                      <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200">
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>{formatDate(booking.booking_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span>
                          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in code</p>
                        <p
                          className="text-lg font-bold font-mono"
                          style={{ color: "#2f8a64" }}
                        >
                          #{booking.booking_id}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/venue/${booking.venue_id || booking.booking_id}`}>
                          <Button variant="outline">View Venue</Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <XCircle className="size-4 mr-2" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your booking at{" "}
                                {booking.venue_name || "this venue"}? This action cannot be undone.
                                You will receive a full refund if cancelled at least 24 hours before
                                your booking time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelBooking(booking.booking_id)}
                                className="bg-destructive text-destructive-foreground"
                                disabled={cancellingId !== null}
                              >
                                {cancellingId === booking.booking_id
                                  ? "Cancelling..."
                                  : "Cancel Booking"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">No past bookings</h3>
                <p className="text-muted-foreground mb-4">
                  Your completed and cancelled bookings will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <Card key={booking.booking_id}>
                <div className="grid md:grid-cols-[200px_1fr] gap-4">
                  <div className="flex min-h-[180px] flex-col justify-between rounded-l-xl border-b border-border/60 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5 md:border-b-0 md:border-r">
                    <div>
                      <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
                        Booking history
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="size-4" />
                        <span>{booking.venue_name || "Workspace"}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Booking ID #{booking.booking_id}
                    </div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="mb-1">{booking.venue_name || "Workspace"}</h3>
                        <p className="text-muted-foreground text-sm flex items-center gap-1">
                          <MapPin className="size-4" />
                          {/* ** HARDCODED ** - address not in API response */}
                          New York, NY
                        </p>
                      </div>
                      <Badge variant="secondary">{booking.status}</Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>{formatDate(booking.booking_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span>
                          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Booking ID</p>
                        <p className="font-mono text-muted-foreground">#{booking.booking_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/venue/${booking.venue_id || booking.booking_id}`}>
                          <Button variant="outline">View Venue</Button>
                        </Link>
                        {booking.status === "completed" && (
                          <Button style={{ backgroundColor: "#253c50" }}>
                            <Star className="size-4 mr-2" />
                            Submit a Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
