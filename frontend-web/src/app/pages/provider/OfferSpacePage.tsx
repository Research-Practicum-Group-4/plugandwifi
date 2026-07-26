import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../services/api";
import { VenueCreateRequest } from "../../../types/api";

const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const WEEKDAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

const normalizeNycZip = (value: string) => {
  const trimmed = value.trim().toUpperCase().replace(/\s+/g, " ");
  const plainZip = trimmed.match(/^\d{5}$/);
  if (plainZip) return `NY ${plainZip[0]}`;

  const nyZip = trimmed.match(/^NY\s?(\d{5})$/);
  if (nyZip) return `NY ${nyZip[1]}`;

  return "";
};

export function OfferSpacePage() {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [spaceType, setSpaceType] = useState("");
  const [borough, setBorough] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenities, setAmenities] = useState({
    wifi: false,
    powerOutlets: false,
    water: false,
    coffee: false,
    tea: false,
  });
  const [ownership, setOwnership] = useState({
    womenOwned: false,
    blackOwned: false,
    lgbtOwned: false,
  });
  const [accessibility, setAccessibility] = useState({
    wheelchair: false,
    elevator: false,
    accessibleRestroom: false,
    signLanguage: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    if (!spaceType) {
      toast.error("Please select a space type");
      return;
    }
    if (!borough) {
      toast.error("Please select a New York borough");
      return;
    }
    if (availabilityDays.length === 0) {
      toast.error("Please select at least one operating day");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const startTime = String(formData.get("startTime"));
    const endTime = String(formData.get("endTime"));
    if (endTime <= startTime) {
      toast.error("Available until must be after available from");
      return;
    }
    const zipcode = normalizeNycZip(String(formData.get("zip")));
    if (!zipcode) {
      toast.error("Please enter a New York ZIP Code like NY 10001");
      return;
    }

    const amenityTags = [
      amenities.wifi && "wifi",
      amenities.powerOutlets && "power outlets",
      amenities.water && "complimentary water",
      amenities.coffee && "complimentary coffee",
      amenities.tea && "complimentary tea",
      accessibility.elevator && "elevator",
      accessibility.accessibleRestroom && "accessible restroom",
      accessibility.signLanguage && "sign language support",
    ].filter((tag): tag is string => Boolean(tag));

    const capacity = Number(formData.get("capacity"));
    const street = String(formData.get("address")).trim();
    const daySummary = WEEKDAYS.filter((day) =>
      availabilityDays.includes(day.value)
    )
      .map((day) => day.label)
      .join(", ");

    try {
      setIsSubmitting(true);
      const geocode = await api.geocodeNycAddress({
        address: street,
        borough,
        zipcode,
      });
      const payload: VenueCreateRequest = {
        name: String(formData.get("spaceName")).trim(),
        osm_type: spaceType,
        street,
        zipcode,
        borough,
        lat: geocode.lat,
        lon: geocode.lon,
        opening_hours: `${daySummary} ${startTime}-${endTime}`,
        seat_capacity: capacity,
        amenity_tags: amenityTags,
        rules_text: String(formData.get("description")).trim(),
        has_wifi: amenities.wifi,
        plug_access: amenities.powerOutlets ? capacity : 0,
        hourly_price: Number(formData.get("price")),
        accessibility_friendly: accessibility.wheelchair,
        wbe_certified: ownership.womenOwned,
        mbe_certified: ownership.blackOwned,
        lgbt_friendly: ownership.lgbtOwned,
        availability_days: [...availabilityDays].sort(),
        availability_start_time: `${startTime}:00`,
        availability_end_time: `${endTime}:00`,
      };
      await api.createVenue(payload);
      toast.success("Space submitted for approval", {
        description: "It will appear in search after an administrator approves it.",
      });
      navigate("/provider/dashboard");
    } catch (err: any) {
      const message =
        err.response?.data?.detail || err.message || "Could not create the space listing.";
      toast.error("Submission failed", {
        description: typeof message === "string" ? message : "Please check the form and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailabilityDay = (day: number, checked: boolean) => {
    setAvailabilityDays((current) =>
      checked
        ? [...new Set([...current, day])].sort()
        : current.filter((value) => value !== day)
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="mb-2">List Your Space</h1>
        <p className="text-muted-foreground">
          Share your venue with professionals looking for workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spaceName">Space Name</Label>
              <Input
                id="spaceName"
                name="spaceName"
                placeholder="e.g., Bryant Park Hotel Lobby"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spaceType">Space Type</Label>
              <Select value={spaceType} onValueChange={setSpaceType} required>
                <SelectTrigger id="spaceType">
                  <SelectValue placeholder="Select space type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel Lobby</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="lounge">Business Lounge</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your space, atmosphere, and what makes it great for work..."
                rows={4}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (number of tables/desks)</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="e.g., 8"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Hour ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 12"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="350 5th Avenue"
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borough">Area / Borough</Label>
                <Select value={borough} onValueChange={setBorough} required>
                  <SelectTrigger id="borough">
                    <SelectValue placeholder="Select NYC borough" />
                  </SelectTrigger>
                  <SelectContent>
                    {NYC_BOROUGHS.map((nycBorough) => (
                      <SelectItem key={nycBorough} value={nycBorough}>
                        {nycBorough}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" name="zip" placeholder="NY 10001" required />
              </div>
            </div>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Coordinates are filled automatically from the New York address when you submit.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Operating Days</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {WEEKDAYS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={availabilityDays.includes(day.value)}
                      onCheckedChange={(checked) =>
                        toggleAvailabilityDay(day.value, checked === true)
                      }
                    />
                    <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" name="startTime" type="time" defaultValue="14:00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Available Until</Label>
                <Input id="endTime" name="endTime" type="time" defaultValue="17:00" required />
              </div>
            </div>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                The system will create valid booking slots for the next 30 days using these days and times.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amenities & Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wifi"
                  checked={amenities.wifi}
                  onCheckedChange={(checked) =>
                    setAmenities({ ...amenities, wifi: checked as boolean })
                  }
                />
                <Label htmlFor="wifi" className="cursor-pointer">
                  WiFi Available
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="powerOutlets"
                  checked={amenities.powerOutlets}
                  onCheckedChange={(checked) =>
                    setAmenities({ ...amenities, powerOutlets: checked as boolean })
                  }
                />
                <Label htmlFor="powerOutlets" className="cursor-pointer">
                  Power Outlets
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="water"
                  checked={amenities.water}
                  onCheckedChange={(checked) =>
                    setAmenities({ ...amenities, water: checked as boolean })
                  }
                />
                <Label htmlFor="water" className="cursor-pointer">
                  Complimentary Water
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="coffee"
                  checked={amenities.coffee}
                  onCheckedChange={(checked) =>
                    setAmenities({ ...amenities, coffee: checked as boolean })
                  }
                />
                <Label htmlFor="coffee" className="cursor-pointer">
                  Complimentary Coffee
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tea"
                  checked={amenities.tea}
                  onCheckedChange={(checked) =>
                    setAmenities({ ...amenities, tea: checked as boolean })
                  }
                />
                <Label htmlFor="tea" className="cursor-pointer">
                  Complimentary Tea
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="womenOwned"
                  checked={ownership.womenOwned}
                  onCheckedChange={(checked) =>
                    setOwnership({ ...ownership, womenOwned: checked === true })
                  }
                />
                <Label htmlFor="womenOwned" className="cursor-pointer">Women-Owned Business</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blackOwned"
                  checked={ownership.blackOwned}
                  onCheckedChange={(checked) =>
                    setOwnership({ ...ownership, blackOwned: checked === true })
                  }
                />
                <Label htmlFor="blackOwned" className="cursor-pointer">Black-Owned Business</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lgbtOwned"
                  checked={ownership.lgbtOwned}
                  onCheckedChange={(checked) =>
                    setOwnership({ ...ownership, lgbtOwned: checked === true })
                  }
                />
                <Label htmlFor="lgbtOwned" className="cursor-pointer">LGBT+ Owned Business</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Help users find businesses that match their values
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wheelchair"
                  checked={accessibility.wheelchair}
                  onCheckedChange={(checked) =>
                    setAccessibility({ ...accessibility, wheelchair: checked === true })
                  }
                />
                <Label htmlFor="wheelchair" className="cursor-pointer">Wheelchair Accessible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="elevator"
                  checked={accessibility.elevator}
                  onCheckedChange={(checked) =>
                    setAccessibility({ ...accessibility, elevator: checked === true })
                  }
                />
                <Label htmlFor="elevator" className="cursor-pointer">Elevator Access</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accessibleRestroom"
                  checked={accessibility.accessibleRestroom}
                  onCheckedChange={(checked) =>
                    setAccessibility({
                      ...accessibility,
                      accessibleRestroom: checked === true,
                    })
                  }
                />
                <Label htmlFor="accessibleRestroom" className="cursor-pointer">Accessible Restroom</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signLanguage"
                  checked={accessibility.signLanguage}
                  onCheckedChange={(checked) =>
                    setAccessibility({ ...accessibility, signLanguage: checked === true })
                  }
                />
                <Label htmlFor="signLanguage" className="cursor-pointer">Sign Language Support</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mark the accessibility features available at your venue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3 text-sm">
              <p>By listing your space, you agree to:</p>
              <ul className="space-y-2 ml-4 list-disc">
                <li>Not ask guests to leave during their booked time slot</li>
                <li>Allow guests to use laptops and work equipment</li>
                <li>Provide the amenities listed in your space description</li>
                <li>Maintain a professional and quiet environment</li>
                <li>Honor all confirmed bookings</li>
                <li>Process refunds according to cancellation policy</li>
              </ul>
            </div>

            <Separator />

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                required
              />
              <Label htmlFor="terms" className="cursor-pointer">
                I have read and agree to the Terms & Conditions and Provider Guidelines
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/provider/dashboard")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            size="lg"
            style={{ backgroundColor: '#2f8a64' }}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </form>
    </div>
  );
}
