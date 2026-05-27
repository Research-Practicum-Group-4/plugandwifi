import { useState } from "react";
import { Link } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, MapPin, Star, Phone, Volume2, Filter } from "lucide-react";

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    callsAllowed: false,
    noLoudMusic: false,
    fourPlusStars: false,
  });
  const [priceRange, setPriceRange] = useState([1, 10]);

  const venues = [
    {
      id: 1,
      name: "The Grand Hotel Lobby",
      type: "Hotel Lobby",
      distance: 0.5,
      rating: 4.8,
      reviews: 142,
      price: 5,
      availability: "2 PM - 4 PM",
      amenities: ["WiFi", "Power Outlets", "Quiet"],
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    },
    {
      id: 2,
      name: "Cafe Moderna",
      type: "Cafe",
      distance: 0.8,
      rating: 4.6,
      reviews: 89,
      price: 3,
      availability: "3 PM - 6 PM",
      amenities: ["WiFi", "Power Outlets", "Beverages"],
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
    },
    {
      id: 3,
      name: "Downtown Business Lounge",
      type: "Business Lounge",
      distance: 1.2,
      rating: 4.9,
      reviews: 203,
      price: 7,
      availability: "Now - 5 PM",
      amenities: ["WiFi", "Power Outlets", "Quiet", "Meeting Rooms"],
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
    },
    {
      id: 4,
      name: "Riverside Coffee House",
      type: "Cafe",
      distance: 1.5,
      rating: 4.4,
      reviews: 67,
      price: 4,
      availability: "1 PM - 7 PM",
      amenities: ["WiFi", "Power Outlets", "Outdoor Seating"],
      image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Filters Sidebar */}
        <aside className="space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <Filter className="size-5" />
              Filters
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noLoudMusic"
                  checked={filters.noLoudMusic}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, noLoudMusic: checked as boolean })
                  }
                />
                <Label htmlFor="noLoudMusic" className="flex items-center gap-2 cursor-pointer">
                  <Volume2 className="size-4" />
                  No Loud Music
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="callsAllowed"
                  checked={filters.callsAllowed}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, callsAllowed: checked as boolean })
                  }
                />
                <Label htmlFor="callsAllowed" className="flex items-center gap-2 cursor-pointer">
                  <Phone className="size-4" />
                  Calls Allowed
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fourPlusStars"
                  checked={filters.fourPlusStars}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, fourPlusStars: checked as boolean })
                  }
                />
                <Label htmlFor="fourPlusStars" className="flex items-center gap-2 cursor-pointer">
                  <Star className="size-4" />
                  4+ Stars
                </Label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4">Price Range (per hour)</h4>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              min={1}
              max={10}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            Clear All Filters
          </Button>
        </aside>

        {/* Main Content */}
        <div>
          <div className="mb-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search by city or venue name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <p className="text-muted-foreground">
                  {venues.length} spaces available
                </p>

                {venues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="grid md:grid-cols-[250px_1fr] gap-4">
                      <div className="aspect-video md:aspect-square overflow-hidden">
                        <img
                          src={venue.image}
                          alt={venue.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="mb-1">{venue.name}</h3>
                            <p className="text-muted-foreground">
                              {venue.type} • {venue.distance} km away
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                            <span>{venue.rating}</span>
                            <span className="text-muted-foreground">
                              ({venue.reviews})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {venue.amenities.map((amenity) => (
                            <span
                              key={amenity}
                              className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-muted-foreground">Available</p>
                            <p>{venue.availability}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl" style={{ color: '#2f8a64' }}>
                              ${venue.price}/hr
                            </p>
                            <Link to={`/venue/${venue.id}`}>
                              <Button style={{ backgroundColor: '#253c50' }}>
                                Book a Space
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="map">
                <Card className="h-[600px] overflow-hidden">
                  <div className="relative h-full bg-gray-100">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Location_map_United_States_Manhattan_2.svg"
                      alt="Manhattan Map"
                      className="w-full h-full object-contain"
                    />
                    {venues.map((venue, idx) => (
                      <div
                        key={venue.id}
                        className="absolute cursor-pointer group"
                        style={{
                          left: `${20 + idx * 18}%`,
                          top: `${30 + idx * 15}%`,
                        }}
                      >
                        <div className="relative">
                          <div
                            className="size-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                            style={{ backgroundColor: '#253c50' }}
                          >
                            <MapPin className="size-6 text-white" />
                          </div>
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 min-w-[200px]">
                            <p className="font-medium mb-1">{venue.name}</p>
                            <p className="text-sm text-muted-foreground mb-2">${venue.price}/hour</p>
                            <Link to={`/venue/${venue.id}`}>
                              <Button
                                size="sm"
                                className="w-full"
                                style={{ backgroundColor: '#2f8a64' }}
                              >
                                Book a Space
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
