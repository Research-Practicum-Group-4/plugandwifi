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

export function OfferSpacePage() {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("8");
  const [price, setPrice] = useState("12");
  const [address, setAddress] = useState("");
  const [borough, setBorough] = useState("Midtown");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const [amenities, setAmenities] = useState({
    wifi: true,
    powerOutlets: true,
    water: true,
    coffee: false,
    tea: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      toast.error("Please agree to the Terms & Conditions before publishing.");
      return;
    }

    if (!name.trim()) {
      toast.error("Space Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const activeAmenities: string[] = [];
      if (amenities.wifi) activeAmenities.push("WiFi");
      if (amenities.powerOutlets) activeAmenities.push("Power Outlets");
      if (amenities.water) activeAmenities.push("Complimentary Water");
      if (amenities.coffee) activeAmenities.push("Coffee Available");
      if (amenities.tea) activeAmenities.push("Tea Available");

      await api.createVenue({
        name: name.trim(),
        lat: 40.7580,
        lon: -73.9855,
        borough: borough || "Manhattan",
        opening_hours: `${startTime} - ${endTime}`,
        seat_capacity: parseInt(capacity) || 5,
        amenity_tags: activeAmenities,
        rules_text: description.trim() || `${spaceType} workspace in ${borough}`,
        has_wifi: amenities.wifi,
        plug_access: amenities.powerOutlets ? 1 : 0,
        hourly_price: parseFloat(price) || 10,
      });

      toast.success("Space listing created successfully and submitted for approval!");
      navigate("/provider/dashboard");
    } catch (err: any) {
      console.error("Failed to create venue:", err);
      const errMsg = err.response?.data?.detail || "Failed to create space listing.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">List Your Space</h1>
        <p className="text-muted-foreground">
          Offer your venue to professionals looking for work & study spaces
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
                placeholder="e.g., Grand Hotel Workspace Lounge"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                  <SelectItem value="hotel-lobby">Hotel Lobby</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="business-lounge">Business Lounge</SelectItem>
                  <SelectItem value="other">Other Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Rules & Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your space, quiet atmosphere, rules, and work environment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Total Seat Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Hourly Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
                placeholder="e.g., 350 5th Ave"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borough">Neighborhood / Borough</Label>
                <Input
                  id="borough"
                  placeholder="e.g., Midtown / Chelsea"
                  value={borough}
                  onChange={(e) => setBorough(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value="New York, NY" disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Available From</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Available Until</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Set the daily hours during which your workspace accepts guest bookings.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amenities & Facilities</CardTitle>
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
                  High-Speed Wi-Fi
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
                  Power Outlets Available
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
                  Coffee Available
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Provider Commitment:</p>
              <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Honor all confirmed guest reservations</li>
                <li>Provide dedicated workspace seating and listed amenities</li>
                <li>Maintain a quiet environment suitable for laptop work</li>
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
              <Label htmlFor="terms" className="cursor-pointer text-sm font-medium">
                I have read and agree to the Provider Guidelines and Terms &amp; Conditions
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 cursor-pointer"
            size="lg"
            style={{ backgroundColor: '#2f8a64' }}
            disabled={!acceptedTerms || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin size-4 mr-2" />
                Submitting Space...
              </>
            ) : (
              "Publish Space Listing"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
