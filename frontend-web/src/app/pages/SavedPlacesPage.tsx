import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Star, MapPin, Heart, Bell } from "lucide-react";
import { api } from "../../services/api";
import { Venue } from "../../types/api";

export function SavedPlacesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVenues()
      .then((data) => {
        // Mock saved places as the first two venues
        setVenues(data.slice(0, 2));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load saved places:", err);
        setLoading(false);
      });
  }, []);

  const getVenueImage = (venueId: string) => {
    const images: Record<string, string> = {
      "osm_12345": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      "osm_12346": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
      "osm_12347": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    };
    return images[venueId] || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400";
  };

  const alerts = [
    {
      id: 1,
      type: "venue",
      name: "The Grand Hotel Lobby",
      message: "New availability: 2 PM - 5 PM today",
    },
    {
      id: 2,
      type: "city",
      name: "Downtown",
      message: "3 new spaces available in your area",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8">Saved & Alerts</h1>

      <Tabs defaultValue="saved" className="w-full">
        <TabsList>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Heart className="size-4" />
            Saved Places
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="size-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading saved workspaces...</div>
          ) : venues.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Heart className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">No saved places yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start saving your favorite workspaces
                </p>
                <Link to="/search">
                  <Button>Browse Spaces</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <Link key={venue.venue_id} to={`/venue/${venue.venue_id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={getVenueImage(venue.venue_id)}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Handle removal mock
                        }}
                      >
                        <Heart className="size-4 fill-red-500 stroke-red-500" />
                      </Button>
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4>{venue.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                          <span>{venue.rating}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-2">
                        {venue.cuisine_type} • {venue.distance_km} km away
                      </p>
                      <p style={{ color: '#2f8a64' }}>${venue.hourly_price}/hour</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="max-w-2xl space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4">Create New Alert</h3>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <MapPin className="size-4 mr-2" />
                    City Alert
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Heart className="size-4 mr-2" />
                    Venue Alert
                  </Button>
                </div>
              </CardContent>
            </Card>

            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        <Bell className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="mb-1">{alert.name}</h4>
                        <p className="text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
