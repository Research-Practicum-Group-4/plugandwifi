import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Star, MapPin, Heart, Bell } from "lucide-react";

export function SavedPlacesPage() {
  const savedVenues = [
    {
      id: 1,
      name: "The Grand Hotel Lobby",
      type: "Hotel Lobby",
      distance: 0.5,
      rating: 4.8,
      reviews: 142,
      price: 5,
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
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
    },
  ];

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
          {savedVenues.length === 0 ? (
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
              {savedVenues.map((venue) => (
                <Link key={venue.id} to={`/venue/${venue.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={venue.image}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2"
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
                        {venue.type} • {venue.distance} km away
                      </p>
                      <p style={{ color: '#2f8a64' }}>${venue.price}/hour</p>
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
