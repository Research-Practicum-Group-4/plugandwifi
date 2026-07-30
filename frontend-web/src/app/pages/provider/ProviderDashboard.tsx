import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Calendar, DollarSign, Users, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../../../services/api";
import {
  ProviderDashboardKPIsResponse,
  ProviderArrivalItem,
  VenueCreateResponse,
} from "../../../types/api";
import { toast } from "sonner";

export function ProviderDashboard() {
  const [kpis, setKpis] = useState<ProviderDashboardKPIsResponse | null>(null);
  const [arrivals, setArrivals] = useState<ProviderArrivalItem[]>([]);
  const [bookingHistory, setBookingHistory] = useState<ProviderArrivalItem[]>([]);
  const [spaces, setSpaces] = useState<VenueCreateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingBookingId, setCompletingBookingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (import.meta.env.VITE_USE_MOCK === "true" && !localStorage.getItem("access_token")) {
        localStorage.setItem("access_token", "mock_jwt_token");
      }
      try {
        setLoading(true);
        const [kpiData, arrivalData, historyData, venueData] = await Promise.all([
          api.getProviderKPIs(),
          api.getProviderArrivals(),
          api.getProviderBookingHistory(),
          api.getProviderVenues(),
        ]);
        setKpis(kpiData);
        setArrivals(arrivalData.items);
        setBookingHistory(historyData.items);
        setSpaces(venueData.items);
      } catch (err: any) {
        console.error("Failed to load provider dashboard stats:", err);
        toast.error("Failed to sync dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "";
    return delta >= 0 ? `+${delta}%` : `${delta}%`;
  };

  const getKPIStatsList = () => {
    if (!kpis) {
      return [
        { label: "Total Bookings", value: "0", icon: Calendar, change: "" },
        { label: "Revenue (Month)", value: "$0", icon: DollarSign, change: "" },
        { label: "Active Spaces", value: "0", icon: Users, change: "" },
        { label: "Avg Rating", value: "0.0", icon: TrendingUp, change: "" },
      ];
    }
    return [
      {
        label: "Total Bookings",
        value: kpis.total_reservations.value.toString(),
        icon: Calendar,
        change: formatDelta(kpis.total_reservations.delta_percent),
      },
      {
        label: "Revenue (Month)",
        value: `$${kpis.monthly_revenue.value.toLocaleString()}`,
        icon: DollarSign,
        change: formatDelta(kpis.monthly_revenue.delta_percent),
      },
      {
        label: "Active Spaces",
        value: kpis.active_properties_count.value.toString(),
        icon: Users,
        change: formatDelta(kpis.active_properties_count.delta_percent),
      },
      {
        label: "Avg Rating",
        value: kpis.average_user_rating.value.toFixed(1),
        icon: TrendingUp,
        change: formatDelta(kpis.average_user_rating.delta_percent),
      },
    ];
  };

  const stats = getKPIStatsList();

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (timeStr && timeStr.split(':').length === 3) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  const handleCompleteBooking = async (bookingId: number) => {
    if (completingBookingId) return;

    setCompletingBookingId(bookingId);
    try {
      const response = await api.completeProviderBooking(bookingId);
      toast.success(response.message || "Booking marked as completed.");
      const completedArrival = arrivals.find((booking) => booking.booking_id === bookingId);
      const completedHistory = bookingHistory.find((booking) => booking.booking_id === bookingId);
      setArrivals((current) => current.filter((booking) => booking.booking_id !== bookingId));
      setBookingHistory((current) => {
        if (completedHistory) {
          return current.map((booking) =>
            booking.booking_id === bookingId
              ? { ...booking, confirmation_status: response.status }
              : booking
          );
        }
        if (completedArrival) {
          return [
            { ...completedArrival, confirmation_status: response.status },
            ...current,
          ];
        }
        return current;
      });
    } catch (err: any) {
      console.error("Failed to complete booking:", err);
      const message = err.response?.data?.detail || err.message || "Could not complete this booking.";
      toast.error("Completion failed", { description: message });
    } finally {
      setCompletingBookingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1>Provider Dashboard</h1>
        <Link to="/provider/offer-space">
          <Button size="lg" style={{ backgroundColor: '#2f8a64' }}>
            <Plus className="size-5 mr-2" />
            Offer New Space
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="animate-spin size-8 text-emerald-600" />
          <p className="text-sm font-medium">Syncing provider telemetry...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const isPositive = stat.change.startsWith("+");
              return (
                <Card key={stat.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-end justify-between">
                      <h2>{stat.value}</h2>
                      <span className={`text-sm ${isPositive ? "text-green-600" : "text-muted-foreground"}`}>
                        {stat.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs defaultValue="bookings" className="w-full">
            <TabsList>
              <TabsTrigger value="bookings">Upcoming Bookings</TabsTrigger>
              <TabsTrigger value="history">Past Bookings</TabsTrigger>
              <TabsTrigger value="spaces">My Spaces</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Bookings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {arrivals.length > 0 ? (
                    arrivals.map((booking) => (
                      <div
                        key={booking.booking_id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4>{booking.client_full_name}</h4>
                            <Badge
                              variant={
                                booking.confirmation_status === "confirmed" ? "default" : "secondary"
                              }
                            >
                              {booking.confirmation_status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-1">
                            {booking.venue_name || "Workspace"} {booking.space_label ? `• ${booking.space_label}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                          <p className="text-xl mb-2">${booking.fee_estimate.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.seats_reserved} {booking.seats_reserved === 1 ? "seat" : "seats"}
                          </p>
                          <Button
                            size="sm"
                            className="bg-emerald-700 text-white hover:bg-emerald-800"
                            disabled={completingBookingId === booking.booking_id}
                            onClick={() => handleCompleteBooking(booking.booking_id)}
                          >
                            {completingBookingId === booking.booking_id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 size-4" />
                            )}
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No upcoming guest arrivals today.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Past Bookings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingHistory.length > 0 ? (
                    bookingHistory.map((booking) => (
                      <div
                        key={booking.booking_id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4>{booking.client_full_name}</h4>
                            <Badge
                              variant={
                                booking.confirmation_status === "completed" ? "default" : "secondary"
                              }
                            >
                              {booking.confirmation_status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-1">
                            {booking.venue_name || "Workspace"} {booking.space_label ? `??${booking.space_label}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(booking.booking_date)} ??{formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                          <p className="text-xl mb-2">${booking.fee_estimate.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.seats_reserved} {booking.seats_reserved === 1 ? "seat" : "seats"}
                          </p>
                          {booking.confirmation_status !== "completed" && (
                            <Button
                              size="sm"
                              className="bg-emerald-700 text-white hover:bg-emerald-800"
                              disabled={completingBookingId === booking.booking_id}
                              onClick={() => handleCompleteBooking(booking.booking_id)}
                            >
                              {completingBookingId === booking.booking_id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 size-4" />
                              )}
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No past bookings yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spaces" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {spaces.length > 0 ? spaces.map((space) => (
                  <Card key={space.venue_id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{space.name}</CardTitle>
                          <p className="text-muted-foreground mt-1">{space.borough}</p>
                        </div>
                        <Badge variant={space.state === "Active" ? "default" : "secondary"}>
                          {space.state}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity</span>
                        <span>{space.seat_capacity} seats</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Availability</span>
                        <span>{space.opening_hours || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hourly price</span>
                        <span>${(space.hourly_price ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="pt-3 flex gap-2">
                        <Button variant="outline" className="flex-1">
                          Edit
                        </Button>
                        <Button variant="outline" className="flex-1">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="md:col-span-2 py-10 text-center text-sm text-muted-foreground">
                    No spaces submitted yet.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
