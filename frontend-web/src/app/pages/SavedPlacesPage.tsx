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
    const fetchSavedVenues = async () => {
      try {
        setLoading(true);
        const favsStr = localStorage.getItem("plugandwifi_favorites");
        const favs: string[] = favsStr ? JSON.parse(favsStr) : [];
        
        if (favs.length === 0) {
          setVenues([]);
          setLoading(false);
          return;
        }

        // Fetch detail for each favorited venue ID from the backend database
        const details = await Promise.all(
          favs.map(id => api.getVenueDetail(id).catch(err => {
            console.warn(`Failed to fetch details for saved venue ${id}:`, err);
            return null;
          }))
        );

        // Filter out any failed requests (nulls) and convert to Venue objects for the list view
        const validVenues = details
          .filter((d): d is NonNullable<typeof d> => d !== null)
          .map(d => ({
            venue_id: d.venue_id,
            name: d.name,
            cuisine_type: d.cuisine_type || "Workspace",
            distance_km: d.distance_km || 0,
            has_wifi: d.has_wifi || false,
            wifi_free: d.wifi_free || false,
            opening_now: true,
            seats_avail: d.seats_avail || 10,
            total_seats: d.total_seats || 20,
            hourly_price: d.hourly_price || 0,
            rating: d.rating || 4.5,
            lat: d.lat,
            lon: d.lon,
            accessibility_friendly: d.accessibility_friendly,
            calls_allowed: d.calls_allowed,
            wbe_certified: d.wbe_certified,
            mbe_certified: d.mbe_certified,
            vbe_certified: d.vbe_certified,
            bcorp_certified: d.bcorp_certified,
            lgbt_friendly: d.lgbt_friendly
          }));

        setVenues(validVenues);
      } catch (err) {
        console.error("Failed to load saved places:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedVenues();
  }, []);

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
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-base">{venue.name}</h4>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Star className="size-3.5 fill-yellow-400 stroke-yellow-400" />
                            <span className="font-medium text-foreground">{venue.rating}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await api.removeFavorite(venue.venue_id);
                              const favsStr = localStorage.getItem("plugandwifi_favorites");
                              let favs: string[] = favsStr ? JSON.parse(favsStr) : [];
                              favs = favs.filter(fid => fid !== venue.venue_id);
                              localStorage.setItem("plugandwifi_favorites", JSON.stringify(favs));
                              setVenues(prev => prev.filter(v => v.venue_id !== venue.venue_id));
                            } catch (err) {
                              console.error("Failed to remove favorite:", err);
                            }
                          }}
                        >
                          <Heart className="size-4 fill-red-500 stroke-red-500" />
                        </Button>
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
