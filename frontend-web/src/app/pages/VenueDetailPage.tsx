import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Star, MapPin, Wifi, Zap, Clock, Heart, Share2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { VenueDetail, AvailabilitySlot } from "../../types/api";
import { enrichVenue, EnrichedVenue } from "../utils/venueEnrichment";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";

const EDI_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  "WBE-Certified":    { bg: "bg-purple-100", text: "text-purple-700" },
  "MBE-Certified":    { bg: "bg-amber-100",  text: "text-amber-800"  },
  "LGBT+ Friendly":   { bg: "bg-pink-100",   text: "text-pink-700"   },
  "B-Corp Certified": { bg: "bg-green-100",  text: "text-green-700"  },
  "VBE-Certified":    { bg: "bg-blue-100",   text: "text-blue-700"   },
};

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isFavorite, addFavorite, removeFavorite, loading: favoritesLoading } = useFavorites();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const stateParams = location.state || {};

  const todayStr = new Date().toISOString().split("T")[0];

  const [bookingDate, setBookingDate] = useState(
    stateParams.searchDate || sessionStorage.getItem("searchDate") || todayStr
  );
  const [startTime, setStartTime] = useState(
    stateParams.startTime || sessionStorage.getItem("startTime") || "09:00"
  );
  const [endTime, setEndTime] = useState(
    stateParams.endTime || sessionStorage.getItem("endTime") || "12:00"
  );
  const [seatsReserved, setSeatsReserved] = useState(
    stateParams.seatsRequired || parseInt(sessionStorage.getItem("seatsRequired") || "1")
  );

  // Duration radio (from Figma mockup)
  const [selectedDuration, setSelectedDuration] = useState("2");

  const [venue, setVenue] = useState<(VenueDetail & EnrichedVenue) | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const getDurationHours = (start: string, end: string) => {
    try {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const diff = endH + endM / 60 - (startH + startM / 60);
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getVenueDetail(id),
      api.getAvailability(id).catch((e) => {
        console.warn("Could not load slots:", e);
        return { venue_id: id, available_slots: [] };
      }),
    ])
      .then(([venueData, availabilityData]) => {
        setVenue(enrichVenue(venueData) as VenueDetail & EnrichedVenue);
        setSlots(availabilityData.available_slots);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load venue:", err);
        setLoading(false);
        toast.error("Failed to load workspace details.");
      });
  }, [id]);

  const duration = getDurationHours(startTime, endTime);
  const totalPrice = venue ? venue.enrichedPrice * duration * seatsReserved : 0;

  const handleBooking = () => {
    if (!venue) return;
    if (!bookingDate) {
      toast.error("Please select a booking date.");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Please select both start and end times.");
      return;
    }
    if (duration <= 0) {
      toast.error("End time must be after start time.");
      return;
    }

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    navigate("/checkout", {
      state: {
        venueId: venue.venue_id,
        venueName: venue.name,
        bookingDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        duration: duration.toString(),
        price: totalPrice,
        seatsReserved,
      },
    });
  };

  const isSaved = id ? isFavorite(id) : false;

  const handleSave = async () => {
    if (!venue) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to save workspaces.");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    try {
      if (isSaved) {
        await removeFavorite(venue.venue_id);
        toast.success("Removed from saved places");
      } else {
        await addFavorite(venue.venue_id);
        toast.success("Added to saved places");
      }
    } catch (err: any) {
      console.error("Failed to toggle favorite:", err);
      if (err.response?.status === 401) {
        toast.error("Please sign in to save workspaces.");
      } else if (err.response?.status === 409) {
      } else if (err.response?.status === 404 && isSaved) {
      } else {
        toast.error("Failed to update favorite status.");
      }
    }
  };


  const formatSlotTime = (startTime: string, endTime: string) => {
    try {
      const start = startTime.split("T")[1].substring(0, 5);
      const end = endTime.split("T")[1].substring(0, 5);
      return `${start} - ${end}`;
    } catch {
      return `${startTime} - ${endTime}`;
    }
  };

  const getAddress = (v: VenueDetail) => {
    return [v.building_number, v.street, v.borough, v.zipcode].filter(Boolean).join(", ");
  };

  const getDescription = (v: VenueDetail) => {
    return `A premium ${v.cuisine_type || "workspace"} located in ${v.borough}. Equipped with verified ${v.has_wifi ? "high-speed WiFi" : "basic WiFi"}, plug access, and ${v.calls_allowed ? "call-friendly" : "workspace-focused"} amenities. Ideal for focus sessions, remote calls, and short-term study.`;
  };

  // ** HARDCODED ** - no API for complimentary drinks
  const complimentaryDrinks = ["Bottled Water", "Coffee", "Tea"];

  // ** HARDCODED ** - no API for terms
  const termsAndConditions = [
    "Please maintain a professional and quiet atmosphere",
    "Laptop and mobile device use is encouraged",
    "The venue reserves the right to limit noise levels",
    "You may not ask guests to leave during their booked time",
    "Complimentary beverages are provided as listed",
  ];

  // ** HARDCODED ** - default reviews until review API is available
  const defaultReviews = [
    {
      id: 1,
      author: "Sarah Johnson",
      rating: 5,
      date: "2 days ago",
      comment:
        "Perfect spot for getting work done! Quiet, professional atmosphere and excellent WiFi.",
    },
    {
      id: 2,
      author: "Michael Chen",
      rating: 4,
      date: "1 week ago",
      comment: "Great location and comfortable seating. The complimentary water was a nice touch.",
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Loading workspace details...
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Main Content */}
        <div>
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="mb-2">{venue.name}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {getAddress(venue)}
                  </span>
                  <span>•</span>
                  <span>{venue.distance_km} km away</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleSave} disabled={authLoading || favoritesLoading}>
                  <Heart className={`size-5 ${isSaved ? "fill-red-500 stroke-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="size-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="size-5 fill-yellow-400 stroke-yellow-400" />
                <span>{venue.rating}</span>
              </div>
              <span className="text-muted-foreground">(142 reviews)</span>
              <Badge>{venue.cuisine_type}</Badge>
            </div>

            {venue.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {venue.certifications.map((cert) => {
                  const style = EDI_BADGE_STYLES[cert] ?? { bg: "bg-gray-100", text: "text-gray-700" };
                  return (
                    <span
                      key={cert}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      {cert}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <h3 className="mb-4">Amenities</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wifi className="size-5 text-primary" />
                </div>
                <span>High-Speed WiFi</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="size-5 text-primary" />
                </div>
                <span>Power Outlets</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <h3 className="mb-4">About this space</h3>
            <p className="text-muted-foreground">{getDescription(venue)}</p>
          </div>

          <Separator className="my-6" />

          {/* ** HARDCODED ** - Complimentary Drinks section (no API) */}
          <div className="mb-6">
            <h3 className="mb-4">Complimentary Drinks</h3>
            <div className="flex flex-wrap gap-2">
              {complimentaryDrinks.map((drink) => (
                <span
                  key={drink}
                  className="px-3 py-2 rounded-lg text-white"
                  style={{ backgroundColor: "#2f8a64" }}
                >
                  {drink}
                </span>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* ** HARDCODED ** - Terms & Conditions section (no API) */}
          <div className="mb-6">
            <h3 className="mb-4">Terms & Conditions</h3>
            <ul className="space-y-2">
              {termsAndConditions.map((term, idx) => (
                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator className="my-6" />

          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-4 mt-6">
              {defaultReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4>{review.author}</h4>
                        <p className="text-sm text-muted-foreground">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                        <span>{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="availability" className="mt-6">
              <div className="space-y-2">
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No available time slots for today.
                  </p>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot.slot_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        slot.available ? "bg-card" : "bg-muted opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="size-4" />
                        <span>{formatSlotTime(slot.start_time, slot.end_time)}</span>
                      </div>
                      <Badge variant={slot.available ? "default" : "secondary"}>
                        {slot.available ? "Available" : "Booked"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Booking Card */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Book Your Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl">${venue.enrichedPrice}</span>
                  <span className="text-muted-foreground">per hour</span>
                </div>

                {/* Duration radio group (from Figma) */}
                <div className="space-y-3 mb-4">
                  <Label>Select Duration</Label>
                  <RadioGroup value={selectedDuration} onValueChange={setSelectedDuration}>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="1" id="1hr" />
                        <Label htmlFor="1hr" className="cursor-pointer">
                          1 hour
                        </Label>
                      </div>
                      <span>${venue.enrichedPrice}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="2" id="2hr" />
                        <Label htmlFor="2hr" className="cursor-pointer">
                          2 hours
                        </Label>
                      </div>
                      <span>${venue.enrichedPrice * 2}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="3" id="3hr" />
                        <Label htmlFor="3hr" className="cursor-pointer">
                          3 hours
                        </Label>
                      </div>
                      <span>${venue.enrichedPrice * 3}</span>
                    </div>
                  </RadioGroup>
                </div>

                <Separator className="my-4" />

                {/* Date/time selectors (keep for API integration) */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="bookingDate">Date</Label>
                    <Input
                      id="bookingDate"
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="startTime">Start Time</Label>
                      <select
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Array.from({ length: 15 }, (_, i) => {
                          const hour = i + 8;
                          const str = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                          return (
                            <option key={str} value={str}>
                              {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="endTime">End Time</Label>
                      <select
                        id="endTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Array.from({ length: 15 }, (_, i) => {
                          const hour = i + 9;
                          const str = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                          return (
                            <option key={str} value={str}>
                              {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="seatsReserved">Seats Reserved</Label>
                    <select
                      id="seatsReserved"
                      value={seatsReserved}
                      onChange={(e) => setSeatsReserved(parseInt(e.target.value))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "seat" : "seats"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span>
                  Total ({duration}h • {seatsReserved} {seatsReserved === 1 ? "seat" : "seats"})
                </span>
                <span className="text-2xl" style={{ color: "#2f8a64" }}>
                  ${totalPrice.toFixed(2)}
                </span>
              </div>

              <Button
                className="w-full cursor-pointer"
                size="lg"
                onClick={handleBooking}
                style={{ backgroundColor: "#253c50" }}
                disabled={duration <= 0}
              >
                {duration <= 0 ? "Invalid Time Range" : "Continue to Checkout"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Free cancellation up to 24 hours before booking
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="size-12 rounded-full flex items-center justify-center bg-[#253c50]">
              <LogIn className="size-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center">Sign in to continue</DialogTitle>
          <DialogDescription className="text-center">
            Create a free account or sign in to complete your booking at{" "}
            <span className="font-medium text-foreground">{venue?.name}</span>.
            Your selection will be waiting for you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            className="w-full"
            style={{ backgroundColor: "#253c50" }}
            onClick={() => navigate("/login", { state: { from: location.pathname } })}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/signup", { state: { from: location.pathname } })}
          >
            Create account
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setShowLoginPrompt(false)}
          >
            Continue browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
