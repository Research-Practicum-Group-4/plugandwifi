import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Star, MapPin, Wifi, Zap, Clock, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { VenueDetail, AvailabilitySlot } from "../../types/api";

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const getSlotDurationHours = (slot: AvailabilitySlot) => {
    try {
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      const diffMs = end.getTime() - start.getTime();
      return Math.round(diffMs / (1000 * 60 * 60));
    } catch {
      return 1;
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getVenueDetail(id),
      api.getAvailability(id)
    ])
      .then(([venueData, availabilityData]) => {
        setVenue(venueData);
        setSlots(availabilityData.available_slots);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load venue:", err);
        setLoading(false);
        toast.error("Failed to load workspace details.");
      });
  }, [id]);

  const handleBooking = () => {
    if (!venue) return;
    if (!selectedSlot) {
      toast.error("Please select an available time slot first.");
      return;
    }

    const bookingDate = selectedSlot.start_time.split("T")[0];
    const startTime = selectedSlot.start_time.split("T")[1];
    const endTime = selectedSlot.end_time.split("T")[1];
    const duration = getSlotDurationHours(selectedSlot);

    navigate("/checkout", {
      state: {
        venueId: venue.venue_id,
        venueName: venue.name,
        bookingDate,
        startTime,
        endTime,
        duration: duration.toString(),
        price: venue.hourly_price * duration,
      },
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? "Removed from saved places" : "Added to saved places");
  };

  const getVenueImages = (venueId: string) => {
    const defaultImages = [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1519167758481-83f29da8c851?w=800",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800",
    ];
    // Vary based on ID for visual difference
    if (venueId === "osm_12346") {
      return [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800",
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800",
      ];
    }
    return defaultImages;
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
    return `A premium ${v.cuisine_type || 'workspace'} located in ${v.borough}. Equipped with verified ${v.has_wifi ? 'high-speed WiFi' : 'basic WiFi'}, plug access, and a ${v.noise_level} noise level environment. Ideal for focus sessions, remote calls, and short-term study.`;
  };

  const complimentaryDrinks = ["Bottled Water", "Coffee", "Tea"];

  const termsAndConditions = [
    "Please maintain a professional and quiet atmosphere",
    "Laptop and mobile device use is encouraged",
    "The venue reserves the right to limit noise levels",
    "You may not ask guests to leave during their booked time",
    "Complimentary beverages are provided as listed",
  ];

  const defaultReviews = [
    {
      id: 1,
      author: "Sarah Johnson",
      rating: 5,
      date: "2 days ago",
      comment: "Perfect spot for getting work done! Quiet, professional atmosphere and excellent WiFi.",
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

  const images = getVenueImages(venue.venue_id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Image Gallery */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="aspect-video overflow-hidden rounded-lg">
          <img
            src={images[0]}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {images.slice(1).map((image, idx) => (
            <div key={idx} className="aspect-video overflow-hidden rounded-lg">
              <img src={image} alt={`${venue.name} ${idx + 2}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

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
                <Button variant="outline" size="icon" onClick={handleSave}>
                  <Heart className={`size-5 ${isSaved ? "fill-red-500 stroke-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="size-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="size-5 fill-yellow-400 stroke-yellow-400" />
                <span>{venue.rating}</span>
              </div>
              <span className="text-muted-foreground">(142 reviews)</span>
              <Badge>{venue.cuisine_type}</Badge>
            </div>
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

          <div className="mb-6">
            <h3 className="mb-4">Complimentary Drinks</h3>
            <div className="flex flex-wrap gap-2">
              {complimentaryDrinks.map((drink) => (
                <span
                  key={drink}
                  className="px-3 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#2f8a64' }}
                >
                  {drink}
                </span>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

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
                  <p className="text-muted-foreground text-center py-4">No available time slots for today.</p>
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
                  <span className="text-3xl">${venue.hourly_price}</span>
                  <span className="text-muted-foreground">per hour</span>
                </div>

                <div className="space-y-3">
                  <Label>Select Time Slot</Label>
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No slots available today.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const duration = getSlotDurationHours(slot);
                        return (
                          <button
                            key={slot.slot_id}
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot)}
                            className={`w-full text-left p-3 rounded-lg border text-sm flex items-center justify-between transition-all cursor-pointer ${
                              !slot.available
                                ? "bg-muted opacity-50 cursor-not-allowed"
                                : selectedSlot?.slot_id === slot.slot_id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "hover:bg-accent border-border"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Clock className="size-4 text-muted-foreground" />
                              {formatSlotTime(slot.start_time, slot.end_time)}
                              <span className="text-xs text-muted-foreground">({duration}h)</span>
                            </span>
                            <Badge variant={slot.available ? (selectedSlot?.slot_id === slot.slot_id ? "default" : "outline") : "secondary"}>
                              {slot.available ? (selectedSlot?.slot_id === slot.slot_id ? "Selected" : "Available") : "Booked"}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span>Total</span>
                <span className="text-2xl" style={{ color: '#2f8a64' }}>
                  ${selectedSlot ? (venue.hourly_price * getSlotDurationHours(selectedSlot)).toFixed(2) : "0.00"}
                </span>
              </div>

              <Button
                className="w-full cursor-pointer"
                size="lg"
                onClick={handleBooking}
                style={{ backgroundColor: '#253c50' }}
                disabled={!selectedSlot}
              >
                {selectedSlot ? "Continue to Checkout" : "Select a Time Slot"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Free cancellation up to 1 hour before booking
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
