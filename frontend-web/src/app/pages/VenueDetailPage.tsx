import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Star, MapPin, Wifi, Zap, Clock, Heart, Share2, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { VenueDetail, AvailabilitySlot } from "../../types/api";
import { enrichVenue, EnrichedVenue, venueImage } from "../utils/venueEnrichment";
import { calculateDistanceKm, formatDistance, LandmarkContext } from "../utils/distance";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";

const EDI_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  "WBE-Certified":    { bg: "bg-purple-100", text: "text-purple-700" },
  "MBE-Certified":    { bg: "bg-amber-100",  text: "text-amber-800"  },
  "LGBT+ Friendly":   { bg: "bg-pink-100",   text: "text-pink-700"   },
  "B-Corp Certified": { bg: "bg-green-100",  text: "text-green-700"  },
  "VBE-Certified":    { bg: "bg-blue-100",   text: "text-blue-700"   },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type HourlyAvailabilityBlock = {
  id: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  available: boolean;
  availableSeats: number;
};

type BookingTimeOption = {
  id: string;
  startTime: string;
  endTime: string;
  availableSeats: number;
};

function getDateKeyFromSlotTime(value: string): string {
  return value.includes("T") ? value.split("T")[0] : value.split(" ")[0];
}

function getTimeFromSlotTime(value: string): string {
  if (value.includes("T")) return value.split("T")[1].substring(0, 5);
  if (value.includes(" ")) return value.split(" ")[1].substring(0, 5);
  return value.substring(0, 5);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatExactDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthDate: Date): Array<{ dateKey: string; dayNumber: number; inMonth: boolean }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      dateKey: formatDateKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getHourlyAvailabilityBlocks(slot: AvailabilitySlot): HourlyAvailabilityBlock[] {
  const dateKey = getDateKeyFromSlotTime(slot.start_time);
  const startMinutes = timeToMinutes(getTimeFromSlotTime(slot.start_time));
  const endMinutes = timeToMinutes(getTimeFromSlotTime(slot.end_time));

  if (endMinutes <= startMinutes) {
    return [
      {
        id: `${slot.slot_id}-${getTimeFromSlotTime(slot.start_time)}`,
        dateKey,
        startTime: getTimeFromSlotTime(slot.start_time),
        endTime: getTimeFromSlotTime(slot.end_time),
        available: slot.available,
        availableSeats: slot.available_seats ?? 1,
      },
    ];
  }

  const blocks: HourlyAvailabilityBlock[] = [];
  for (let current = startMinutes; current < endMinutes; current += 60) {
    const next = Math.min(current + 60, endMinutes);
    blocks.push({
      id: `${slot.slot_id}-${current}`,
      dateKey,
      startTime: minutesToTime(current),
      endTime: minutesToTime(next),
      available: slot.available,
      availableSeats: slot.available_seats ?? 1,
    });
  }

  return blocks;
}

function getBookingTimeOptions(
  blocks: HourlyAvailabilityBlock[],
  durationHours: number,
): BookingTimeOption[] {
  if (durationHours <= 0) return [];

  const availableBlocks = blocks
    .filter((block) => block.available)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const options: BookingTimeOption[] = [];

  for (const block of availableBlocks) {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = startMinutes + durationHours * 60;
    let cursor = startMinutes;
    let availableSeats = block.availableSeats;

    while (cursor < endMinutes) {
      const next = cursor + 60;
      const matchingBlock = availableBlocks.find(
        (candidate) =>
          timeToMinutes(candidate.startTime) === cursor &&
          timeToMinutes(candidate.endTime) === next,
      );

      if (!matchingBlock) break;
      availableSeats = Math.min(availableSeats, matchingBlock.availableSeats);
      cursor = next;
    }

    if (cursor === endMinutes) {
      const endTime = minutesToTime(endMinutes);
      options.push({
        id: `${block.dateKey}-${block.startTime}-${endTime}`,
        startTime: block.startTime,
        endTime,
        availableSeats,
      });
    }
  }

  return options;
}

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isFavorite, addFavorite, removeFavorite, loading: favoritesLoading } = useFavorites();
  const stateParams = location.state || {};
  const stateLandmark = stateParams.landmark as LandmarkContext | undefined;

  const todayStr = formatDateKey(new Date());

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
  const [storedLandmark, setStoredLandmark] = useState<LandmarkContext | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateKey(bookingDate));
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<string | null>(null);

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
    const raw = sessionStorage.getItem("activeLandmark");
    if (!raw) {
      setStoredLandmark(null);
      return;
    }

    try {
      setStoredLandmark(JSON.parse(raw) as LandmarkContext);
    } catch {
      setStoredLandmark(null);
    }
  }, []);

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
  const activeLandmark = stateLandmark ?? storedLandmark;
  const displayedDistance = venue && activeLandmark
    ? formatDistance(calculateDistanceKm(activeLandmark.lat, activeLandmark.lon, venue.lat, venue.lon))
    : formatDistance(venue?.distance_km);
  const hourlyAvailabilityBlocks = useMemo(
    () => slots.flatMap(getHourlyAvailabilityBlocks).sort((a, b) => {
      const dateDiff = a.dateKey.localeCompare(b.dateKey);
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    }),
    [slots],
  );
  const availabilityByDate = useMemo(() => {
    const grouped = new Map<string, HourlyAvailabilityBlock[]>();
    hourlyAvailabilityBlocks.forEach((block) => {
      const existing = grouped.get(block.dateKey) ?? [];
      existing.push(block);
      grouped.set(block.dateKey, existing);
    });
    return grouped;
  }, [hourlyAvailabilityBlocks]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDateBlocks = selectedAvailabilityDate
    ? availabilityByDate.get(selectedAvailabilityDate) ?? []
    : [];
  const availableDateCount = Array.from(availabilityByDate.entries()).filter(([dateKey, dayBlocks]) =>
    dateKey >= todayStr && dayBlocks.some((block) => block.available)
  ).length;
  const availableDateKeys = useMemo(
    () =>
      Array.from(availabilityByDate.entries())
        .filter(([dateKey, dayBlocks]) =>
          dateKey >= todayStr && dayBlocks.some((block) => block.available)
        )
        .map(([dateKey]) => dateKey)
        .sort(),
    [availabilityByDate, todayStr],
  );
  const selectedDurationHours = Number(selectedDuration);
  const bookingDateBlocks = availabilityByDate.get(bookingDate) ?? [];
  const bookingTimeOptions = useMemo(
    () => getBookingTimeOptions(bookingDateBlocks, selectedDurationHours),
    [bookingDateBlocks, selectedDurationHours],
  );
  const selectedTimeIsBookable = bookingTimeOptions.some(
    (option) => option.startTime === startTime && option.endTime === endTime,
  );
  const selectedBookingOption = bookingTimeOptions.find(
    (option) => option.startTime === startTime && option.endTime === endTime,
  );
  const maxBookableSeats = selectedBookingOption?.availableSeats ?? 0;
  const seatOptions = Array.from(
    { length: Math.min(Math.max(maxBookableSeats, 0), 10) },
    (_, index) => index + 1,
  );

  useEffect(() => {
    if (hourlyAvailabilityBlocks.length === 0) {
      setSelectedAvailabilityDate(null);
      return;
    }

    const bookingDateHasBookableSlots =
      bookingDate >= todayStr &&
      (availabilityByDate.get(bookingDate) ?? []).some((block) => block.available);
    const firstAvailableBlock =
      hourlyAvailabilityBlocks.find((block) => block.dateKey >= todayStr && block.available) ?? null;

    if (!bookingDateHasBookableSlots && !firstAvailableBlock) {
      setSelectedAvailabilityDate(null);
      return;
    }

    const nextDate = bookingDateHasBookableSlots ? bookingDate : firstAvailableBlock!.dateKey;

    setSelectedAvailabilityDate(nextDate);
    setCalendarMonth(parseDateKey(nextDate));
  }, [availabilityByDate, bookingDate, hourlyAvailabilityBlocks, todayStr]);

  useEffect(() => {
    if (availableDateKeys.length === 0) return;
    if (!availableDateKeys.includes(bookingDate)) {
      setBookingDate(availableDateKeys[0]);
    }
  }, [availableDateKeys, bookingDate]);

  useEffect(() => {
    if (bookingTimeOptions.length === 0) return;
    if (!selectedTimeIsBookable) {
      const firstOption = bookingTimeOptions[0];
      setStartTime(firstOption.startTime);
      setEndTime(firstOption.endTime);
    }
  }, [bookingTimeOptions, selectedTimeIsBookable]);

  useEffect(() => {
    if (maxBookableSeats <= 0) return;
    if (seatsReserved > maxBookableSeats) {
      setSeatsReserved(maxBookableSeats);
    }
  }, [maxBookableSeats, seatsReserved]);

  const handleBooking = () => {
    if (!venue) return;
    if (!bookingDate) {
      toast.error("Please select a booking date.");
      return;
    }
    if (bookingDate < todayStr) {
      toast.error("Please select today or a future date.");
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
    if (!selectedTimeIsBookable) {
      toast.error("Please select an available time slot.");
      return;
    }
    if (seatsReserved > maxBookableSeats) {
      toast.error("Not enough seats are available for this time slot.");
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
    <><div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Main Content */}
        <div>
          <div className="mb-6">
            <div className="relative mb-6 overflow-hidden rounded-3xl">
              <img
                src={venueImage(venue.venue_id, venue.osm_type ?? venue.cuisine_type ?? "workspace")}
                alt={venue.name}
                className="h-[320px] w-full object-cover sm:h-[380px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-4">
                <Button variant="outline" size="icon" className="border-white/60 bg-white/85" onClick={handleSave} disabled={authLoading || favoritesLoading}>
                  <Heart className={`size-5 ${isSaved ? "fill-red-500 stroke-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" className="border-white/60 bg-white/85">
                  <Share2 className="size-5" />
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <div className="mb-3 inline-flex rounded-full bg-black/35 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/85 backdrop-blur-sm">
                  {(venue.osm_type ?? venue.cuisine_type ?? "workspace").replace(/_/g, " ")}
                </div>
                <h1 className="mb-2 text-white">{venue.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {getAddress(venue)}
                  </span>
                  {activeLandmark ? <span>{displayedDistance ?? "Distance unavailable"}</span> : null}
                </div>
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
              <div className="rounded-lg border bg-card">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="mb-1">Availability calendar</h4>
                    <p className="text-sm text-muted-foreground">
                      {availableDateCount} days with available hourly slots
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 cursor-pointer"
                      onClick={() => {
                        setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                      }}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="min-w-36 text-center font-medium">
                      {formatMonthLabel(calendarMonth)}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 cursor-pointer"
                      onClick={() => {
                        setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                      }}
                      aria-label="Next month"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No available time slots for today.
                  </p>
                ) : (
                  <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
                        {WEEKDAY_LABELS.map((day) => (
                          <div key={day}>{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day) => {
                          const dayBlocks = availabilityByDate.get(day.dateKey) ?? [];
                          const availableCount = dayBlocks.filter((block) => block.available).length;
                          const hasSlots = dayBlocks.length > 0;
                          const isPastDate = day.dateKey < todayStr;
                          const hasBookableSlots = availableCount > 0 && !isPastDate;
                          const isSelected = selectedAvailabilityDate === day.dateKey;

                          return (
                            <button
                              key={day.dateKey}
                              type="button"
                              disabled={!hasBookableSlots}
                              onClick={() => {
                                setSelectedAvailabilityDate(day.dateKey);
                                setBookingDate(day.dateKey);
                              }}
                              className={`min-h-24 rounded-lg border p-2 text-left transition-colors ${isSelected ? "border-emerald-600 bg-emerald-50" : "bg-background hover:bg-muted/40"} ${!day.inMonth ? "text-muted-foreground/60" : ""} ${!hasBookableSlots ? "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-60 hover:bg-muted/50" : "cursor-pointer"}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-medium">{day.dayNumber}</span>
                                {availableCount > 0 && !isPastDate && (
                                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white">
                                    {availableCount}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 text-[11px] leading-tight text-muted-foreground">
                                {formatExactDate(day.dateKey)}
                              </div>
                              {isPastDate && hasSlots && (
                                <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                                  Past date
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background">
                      <div className="border-b p-4">
                        <h4 className="mb-1">
                          {selectedAvailabilityDate ? formatExactDate(selectedAvailabilityDate) : "Select a date"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedDateBlocks.filter((block) => block.available && block.dateKey >= todayStr).length} available hourly blocks
                        </p>
                      </div>
                      <div className="max-h-[460px] space-y-2 overflow-y-auto p-4">
                        {selectedDateBlocks.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            No slots listed for this date.
                          </p>
                        ) : (
                          selectedDateBlocks.map((block) => {
                            const isBookable = block.available && block.dateKey >= todayStr;

                            return (
                              <button
                                key={block.id}
                                type="button"
                                disabled={!isBookable}
                                onClick={() => {
                                  setBookingDate(block.dateKey);
                                  setStartTime(block.startTime);
                                  setEndTime(block.endTime);
                                  setSelectedDuration(String(getDurationHours(block.startTime, block.endTime) || 1));
                                }}
                                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${isBookable ? "cursor-pointer border-emerald-200 bg-card hover:bg-emerald-50" : "cursor-not-allowed bg-muted opacity-60"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`flex size-9 items-center justify-center rounded-full ${isBookable ? "bg-emerald-100 text-emerald-700" : "bg-background text-muted-foreground"}`}>
                                    <Clock className="size-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{block.startTime} - {block.endTime}</div>
                                    <div className="text-xs text-muted-foreground">{formatExactDate(block.dateKey)}</div>
                                  </div>
                                </div>
                                <Badge variant={isBookable ? "default" : "secondary"} className={isBookable ? "bg-emerald-500 text-white hover:bg-emerald-500" : ""}>
                                  {isBookable ? "Available" : block.dateKey < todayStr ? "Past date" : "Booked"}
                                </Badge>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
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

                {/* Date/time selectors are derived from live availability slots. */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="bookingDate">Date</Label>
                    <select
                      id="bookingDate"
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setSelectedAvailabilityDate(e.target.value);
                      }}
                      disabled={availableDateKeys.length === 0}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {availableDateKeys.length === 0 ? (
                        <option value={bookingDate}>No available dates</option>
                      ) : (
                        availableDateKeys.map((dateKey) => (
                          <option key={dateKey} value={dateKey}>
                            {formatExactDate(dateKey)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="bookingTime">Available Time</Label>
                    <select
                      id="bookingTime"
                      value={`${startTime}-${endTime}`}
                      onChange={(e) => {
                        const [nextStartTime, nextEndTime] = e.target.value.split("-");
                        setStartTime(nextStartTime);
                        setEndTime(nextEndTime);
                      }}
                      disabled={bookingTimeOptions.length === 0}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bookingTimeOptions.length === 0 ? (
                        <option value={`${startTime}-${endTime}`}>
                          No available {selectedDurationHours}h slots
                        </option>
                      ) : (
                        bookingTimeOptions.map((option) => (
                          <option
                            key={option.id}
                            value={`${option.startTime}-${option.endTime}`}
                          >
                            {option.startTime} - {option.endTime}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="seatsReserved">Seats Reserved</Label>
                    <select
                      id="seatsReserved"
                      value={seatsReserved}
                      onChange={(e) => setSeatsReserved(parseInt(e.target.value))}
                      disabled={seatOptions.length === 0}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {seatOptions.length === 0 ? (
                        <option value={seatsReserved}>No seats available</option>
                      ) : (
                        seatOptions.map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? "seat" : "seats"}
                          </option>
                        ))
                      )}
                    </select>
                    {selectedBookingOption && (
                      <p className="text-xs text-muted-foreground">
                        {selectedBookingOption.availableSeats}{" "}
                        {selectedBookingOption.availableSeats === 1 ? "seat" : "seats"} available
                        for this time.
                      </p>
                    )}
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
                disabled={
                  duration <= 0 ||
                  bookingTimeOptions.length === 0 ||
                  !selectedTimeIsBookable ||
                  seatsReserved > maxBookableSeats
                }
              >
                {bookingTimeOptions.length === 0
                  ? "No Available Time"
                  : seatsReserved > maxBookableSeats
                    ? "Not Enough Seats"
                  : duration <= 0 || !selectedTimeIsBookable
                    ? "Invalid Time Range"
                    : "Continue to Checkout"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Free cancellation up to 24 hours before booking
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div><Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
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
      </Dialog></>
  );
}
