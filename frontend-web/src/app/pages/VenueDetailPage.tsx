import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Star, MapPin, Wifi, Zap, Clock, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";

export function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState("2");
  const [isSaved, setIsSaved] = useState(false);

  const venue = {
    id,
    name: "The Grand Hotel Lobby",
    type: "Hotel Lobby",
    rating: 4.8,
    reviewCount: 142,
    address: "123 Main Street, Downtown",
    distance: 0.5,
    price: 5,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1519167758481-83f29da8c851?w=800",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800",
    ],
    amenities: ["WiFi", "Power Outlets", "Quiet Environment"],
    complimentaryDrinks: ["Bottled Water", "Coffee", "Tea"],
    description:
      "Spacious and elegant hotel lobby perfect for focused work. Enjoy comfortable seating, excellent lighting, and a professional atmosphere.",
    termsAndConditions: [
      "Please maintain a professional and quiet atmosphere",
      "Laptop and mobile device use is encouraged",
      "The venue reserves the right to limit noise levels",
      "You may not ask guests to leave during their booked time",
      "Complimentary beverages are provided as listed",
    ],
    timeSlots: [
      { time: "2:00 PM - 3:00 PM", available: true },
      { time: "3:00 PM - 4:00 PM", available: true },
      { time: "4:00 PM - 5:00 PM", available: false },
      { time: "5:00 PM - 6:00 PM", available: true },
    ],
    reviews: [
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
    ],
  };

  const handleBooking = () => {
    navigate("/checkout", {
      state: {
        venue: venue.name,
        duration: selectedDuration,
        price: venue.price * parseInt(selectedDuration),
      },
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? "Removed from saved places" : "Added to saved places");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Image Gallery */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="aspect-video overflow-hidden rounded-lg">
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {venue.images.slice(1).map((image, idx) => (
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
                    {venue.address}
                  </span>
                  <span>•</span>
                  <span>{venue.distance} km away</span>
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
              <span className="text-muted-foreground">({venue.reviewCount} reviews)</span>
              <Badge>{venue.type}</Badge>
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
            <p className="text-muted-foreground">{venue.description}</p>
          </div>

          <Separator className="my-6" />

          <div className="mb-6">
            <h3 className="mb-4">Complimentary Drinks</h3>
            <div className="flex flex-wrap gap-2">
              {venue.complimentaryDrinks.map((drink) => (
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
              {venue.termsAndConditions.map((term, idx) => (
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
              {venue.reviews.map((review) => (
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
                {venue.timeSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      slot.available ? "bg-card" : "bg-muted opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>{slot.time}</span>
                    </div>
                    <Badge variant={slot.available ? "default" : "secondary"}>
                      {slot.available ? "Available" : "Booked"}
                    </Badge>
                  </div>
                ))}
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
                  <span className="text-3xl">${venue.price}</span>
                  <span className="text-muted-foreground">per hour</span>
                </div>

                <div className="space-y-3">
                  <Label>Select Duration</Label>
                  <RadioGroup value={selectedDuration} onValueChange={setSelectedDuration}>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="1" id="1hr" />
                        <Label htmlFor="1hr" className="cursor-pointer">1 hour</Label>
                      </div>
                      <span>${venue.price}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="2" id="2hr" />
                        <Label htmlFor="2hr" className="cursor-pointer">2 hours</Label>
                      </div>
                      <span>${venue.price * 2}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="3" id="3hr" />
                        <Label htmlFor="3hr" className="cursor-pointer">3 hours</Label>
                      </div>
                      <span>${venue.price * 3}</span>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span>Total</span>
                <span className="text-2xl" style={{ color: '#2f8a64' }}>${venue.price * parseInt(selectedDuration)}</span>
              </div>

              <Button className="w-full" size="lg" onClick={handleBooking} style={{ backgroundColor: '#253c50' }}>
                Continue to Checkout
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
