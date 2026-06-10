import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, Volume2, Phone, Star, MapPin, LayoutGrid, Map } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const suggestions = [
    {
      id: 1,
      name: "The Grand Hotel Lobby",
      distance: "5 mins away",
      availability: "2 PM - 4 PM",
      rating: 4.8,
      price: 5,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      lat: 40.7589,
      lng: -73.9851,
    },
    {
      id: 2,
      name: "Cafe Moderna",
      distance: "8 mins away",
      availability: "3 PM - 6 PM",
      rating: 4.6,
      price: 3,
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      lat: 40.7614,
      lng: -73.9776,
    },
    {
      id: 3,
      name: "Downtown Business Lounge",
      distance: "12 mins away",
      availability: "Now - 5 PM",
      rating: 4.9,
      price: 7,
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
      lat: 40.7549,
      lng: -73.9840,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="mb-4">Find Your Perfect Workspace</h1>
        <p className="text-muted-foreground mb-8">
          Book quality workspace with WiFi and power outlets in hotel lobbies, cafes, and lounges
        </p>

        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              placeholder="Search by city or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 px-6">
                {date ? format(date, "MMM dd") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
          <Link to="/search">
            <Button size="lg" className="h-12 px-8" style={{ backgroundColor: '#2f8a64' }}>
              Search
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm">
            <Volume2 className="size-4 mr-2" />
            No Loud Music
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="size-4 mr-2" />
            Calls Allowed
          </Button>
          <Button variant="outline" size="sm">
            <Star className="size-4 mr-2" />
            4+ Stars
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "map")} className="w-auto">
          <TabsList className="grid w-[300px] grid-cols-2">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <LayoutGrid className="size-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="size-4" />
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Nearby Suggestions */}
      <div className="mb-12">
        <h2 className="mb-6">Available Near You</h2>

        {viewMode === "grid" ? (
          <div className="grid md:grid-cols-3 gap-6">
            {suggestions.map((venue) => (
              <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4>{venue.name}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                      <span>{venue.rating}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    {venue.distance} • {venue.availability}
                  </p>
                  <div className="flex items-center justify-between">
                    <p style={{ color: '#2f8a64' }}>${venue.price}/hour</p>
                    <Button
                      size="sm"
                      style={{ backgroundColor: '#253c50' }}
                      onClick={() => navigate(`/venue/${venue.id}`)}
                    >
                      Book a Space
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="h-[600px] overflow-hidden">
            <div className="relative h-full bg-gray-100">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Location_map_United_States_Manhattan_2.svg"
                alt="Manhattan Map"
                className="w-full h-full object-contain"
              />
              {suggestions.map((venue, idx) => (
                <div
                  key={venue.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${30 + idx * 20}%`,
                    top: `${40 + idx * 10}%`,
                  }}
                  onClick={() => navigate(`/venue/${venue.id}`)}
                >
                  <div className="relative">
                    <div
                      className="size-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: '#253c50' }}
                    >
                      <MapPin className="size-6 text-white" />
                    </div>
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">${venue.price}/hour</p>
                      <Button
                        size="sm"
                        className="w-full"
                        style={{ backgroundColor: '#2f8a64' }}
                      >
                        Book a Space
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
