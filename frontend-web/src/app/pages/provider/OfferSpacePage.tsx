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
import { Info } from "lucide-react";
import { toast } from "sonner";

export function OfferSpacePage() {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [amenities, setAmenities] = useState({
    wifi: false,
    powerOutlets: false,
    water: false,
    coffee: false,
    tea: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    toast.success("Space listing created successfully!");
    navigate("/provider/dashboard");
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
                placeholder="e.g., Grand Hotel Lobby"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spaceType">Space Type</Label>
              <Select required>
                <SelectTrigger id="spaceType">
                  <SelectValue placeholder="Select space type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel-lobby">Hotel Lobby</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="business-lounge">Business Lounge</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
                placeholder="123 Main Street"
                required
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="New York" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="NY" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" placeholder="10001" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Available From</Label>
                <Input id="startTime" type="time" defaultValue="14:00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Available Until</Label>
                <Input id="endTime" type="time" defaultValue="17:00" required />
              </div>
            </div>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Specify when your space is available for workspace bookings
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
            <CardTitle>Booking Extensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="allowExtensions" defaultChecked />
              <Label htmlFor="allowExtensions" className="cursor-pointer">
                Allow guests to extend their booking
              </Label>
            </div>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Enable guests to extend their workspace booking for dining or additional work time
              </AlertDescription>
            </Alert>
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
          <Button type="submit" className="flex-1" size="lg" style={{ backgroundColor: '#2f8a64' }}>
            Create Space Listing
          </Button>
        </div>
      </form>
    </div>
  );
}
