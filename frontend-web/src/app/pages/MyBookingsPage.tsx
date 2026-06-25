import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../services/api";
import { UserBookingItem } from "../../types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardDescription, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, Ticket, ArrowRight, Loader2, RefreshCw } from "lucide-react";

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<{
    upcoming: UserBookingItem[];
    completed: UserBookingItem[];
    cancelled: UserBookingItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getUserBookings();
      setBookings(data);
    } catch (err: any) {
      console.error("Failed to load user bookings:", err);
      toast.error("Could not fetch bookings list.");
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
      toast.success(response.message || "Booking cancelled successfully.", {
        description: `Booking #${bookingId} has been cancelled and seats released.`,
      });
      // Refresh list to update UI state
      await fetchBookings();
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);
      const errMsg = err.response?.data?.detail || err.message || "Cancellation failed.";
      toast.error("Cancellation failed", {
        description: errMsg,
      });
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    // Strip seconds if present
    if (timeStr && timeStr.split(':').length === 3) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "upcoming":
      case "confirmed":
        return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200">Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200">Completed</Badge>;
      case "cancelled":
      case "canceled":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderEmptyState = (tabName: string) => (
    <Card className="border-dashed py-12 text-center flex flex-col items-center justify-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <Calendar className="size-6" />
      </div>
      <CardTitle className="text-xl font-bold">No {tabName} Bookings</CardTitle>
      <CardDescription className="max-w-xs mt-2 mb-6 text-sm">
        You don't have any {tabName.toLowerCase()} workspace bookings at the moment.
      </CardDescription>
      {tabName === "Upcoming" && (
        <Link to="/search">
          <Button style={{ backgroundColor: '#2f8a64' }} className="text-white flex items-center gap-2">
            Explore Spaces <ArrowRight className="size-4" />
          </Button>
        </Link>
      )}
    </Card>
  );

  if (loading && !bookings) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Loader2 className="animate-spin size-8 text-emerald-600" />
        <p className="text-sm font-medium">Loading your booking dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage your workspace reservations and view check-in tickets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading} className="self-start md:self-auto flex items-center gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg py-2.5 font-semibold text-sm">Upcoming</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg py-2.5 font-semibold text-sm">Completed</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg py-2.5 font-semibold text-sm">Cancelled</TabsTrigger>
        </TabsList>

        {/* UPCOMING TAB */}
        <TabsContent value="upcoming" className="space-y-4 focus-visible:outline-none">
          {bookings?.upcoming && bookings.upcoming.length > 0 ? (
            bookings.upcoming.map((booking) => (
              <Card key={booking.booking_id} className="overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow transition-shadow">
                <div className="grid md:grid-cols-12 items-stretch">
                  
                  {/* Left Section - Main Details */}
                  <div className="p-6 md:col-span-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase font-mono">
                          {booking.order_id}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-4">{booking.venue_name || "Workspace"}</h3>
                      
                      <div className="grid sm:grid-cols-2 gap-y-3 gap-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-emerald-600 shrink-0" />
                          <span>{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-emerald-600 shrink-0" />
                          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-emerald-600 shrink-0" />
                          <span>{booking.seats_reserved} {booking.seats_reserved === 1 ? 'seat' : 'seats'} reserved</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-emerald-600 shrink-0" />
                          <span>Dublin Workspace</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
                      {/* Cancel dialog wrapping the cancel action */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs md:text-sm">
                            Cancel Reservation
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel your reservation at <strong>{booking.venue_name}</strong> and release the reserved seats. Cancellations are subject to the 24-hour check-in policy.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Back</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelBooking(booking.booking_id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={cancellingId !== null}
                            >
                              {cancellingId === booking.booking_id ? "Cancelling..." : "Yes, cancel booking"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Right Section - Ticket Stub & Host Inspection ID */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 md:col-span-4 border-t md:border-t-0 md:border-l border-dashed border-emerald-500/20 flex flex-col justify-center items-center text-center">
                    <div className="size-8 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 mb-2">
                      <Ticket className="size-4" />
                    </div>
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                      Check-in Code
                    </span>
                    <div className="font-black tracking-widest text-3xl text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-500/30 px-4 py-2 rounded-md font-mono select-all">
                      #{booking.booking_id}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 max-w-[150px]">
                      Show this ID to the host on check-in
                    </p>
                  </div>

                </div>
              </Card>
            ))
          ) : (
            renderEmptyState("Upcoming")
          )}
        </TabsContent>

        {/* COMPLETED TAB */}
        <TabsContent value="completed" className="space-y-4 focus-visible:outline-none">
          {bookings?.completed && bookings.completed.length > 0 ? (
            bookings.completed.map((booking) => (
              <Card key={booking.booking_id} className="p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase font-mono">
                        {booking.order_id}
                      </span>
                      {getStatusBadge("completed")}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{booking.venue_name || "Workspace"}</h3>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {formatDate(booking.booking_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        {booking.seats_reserved} reserved
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end justify-between shrink-0">
                    <span className="text-xs text-muted-foreground mb-1">Checked-in ID</span>
                    <span className="font-bold text-lg font-mono text-muted-foreground">#{booking.booking_id}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            renderEmptyState("Completed")
          )}
        </TabsContent>

        {/* CANCELLED TAB */}
        <TabsContent value="cancelled" className="space-y-4 focus-visible:outline-none">
          {bookings?.cancelled && bookings.cancelled.length > 0 ? (
            bookings.cancelled.map((booking) => (
              <Card key={booking.booking_id} className="p-6 border-l-4 border-l-red-200 dark:border-l-red-950 opacity-75 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase font-mono">
                        {booking.order_id}
                      </span>
                      {getStatusBadge("cancelled")}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{booking.venue_name || "Workspace"}</h3>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {formatDate(booking.booking_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs text-red-600 font-semibold">{booking.payment_status === "refunded" ? "Refunded" : "Refund Pending"}</p>
                    <p className="text-xs text-muted-foreground mt-1">ID: #{booking.booking_id}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            renderEmptyState("Cancelled")
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
