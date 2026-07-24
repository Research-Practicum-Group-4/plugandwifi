import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, Heart, MapPin, Star, Building2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { useFavorites } from "../contexts/FavoritesContext";
import { venueImage } from "../utils/venueEnrichment";

export function SavedPlacesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const { favoriteVenueIds, loading, removeFavorite } = useFavorites();

  useEffect(() => {
    const fetchSavedVenues = async () => {
      try {
        const favs = favoriteVenueIds;

        if (favs.length === 0) {
          setVenues([]);
          return;
        }

        const details = await Promise.all(
          favs.map((id) =>
            api.getVenueDetail(id).catch((err) => {
              console.warn(`Failed to fetch details for saved venue ${id}:`, err);
              return null;
            })
          )
        );

        const validVenues = details
          .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
          .map((detail) => ({
            venue_id: detail.venue_id,
            name: detail.name,
            osm_type: detail.osm_type,
            cuisine_type: detail.cuisine_type || "Workspace",
            distance_km: detail.distance_km || 0,
            has_wifi: detail.has_wifi || false,
            wifi_free: detail.wifi_free || false,
            opening_now: true,
            seats_avail: detail.seats_avail || 10,
            total_seats: detail.total_seats || 20,
            hourly_price: detail.hourly_price || 0,
            rating: detail.rating || 4.5,
            lat: detail.lat,
            lon: detail.lon,
            accessibility_friendly: detail.accessibility_friendly,
            calls_allowed: detail.calls_allowed,
            wbe_certified: detail.wbe_certified,
            mbe_certified: detail.mbe_certified,
            vbe_certified: detail.vbe_certified,
            bcorp_certified: detail.bcorp_certified,
            lgbt_friendly: detail.lgbt_friendly,
            state: detail.state,
          }));

        setVenues(validVenues);
      } catch (err) {
        console.error("Failed to load saved places:", err);
      }
    };

    void fetchSavedVenues();
  }, [favoriteVenueIds]);

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
            <div className="py-12 text-center text-muted-foreground">
              Loading saved workspaces...
            </div>
          ) : venues.length === 0 ? (
            <Card>
              <CardContent className="pb-12 pt-12 text-center">
                <Heart className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="mb-2">No saved places yet</h3>
                <p className="mb-6 text-muted-foreground">
                  Start saving your favorite workspaces
                </p>
                <Link to="/search">
                  <Button style={{ backgroundColor: "#253c50" }}>Browse Spaces</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => (
                <Link key={venue.venue_id} to={`/venue/${venue.venue_id}`}>
                  <Card className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg">
                    <div className="relative overflow-hidden">
                      <img
                        src={venueImage(venue.venue_id, venue.osm_type ?? venue.cuisine_type ?? "workspace")}
                        alt={venue.name}
                        className="h-48 w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                        <div className="rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/85">
                            <Building2 className="size-3.5" />
                            <span>Saved workspace</span>
                          </div>
                        </div>
                        <div className="rounded-full border border-rose-200/70 bg-white/90 px-3 py-1 text-xs font-medium text-rose-700">
                          Favorite
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <p className="text-sm text-white/80">{venue.cuisine_type || "Workspace"}</p>
                        <h4 className="mt-1">{venue.name}</h4>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                            <span>{venue.rating}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await removeFavorite(venue.venue_id);
                              setVenues((prev) => prev.filter((item) => item.venue_id !== venue.venue_id));
                            } catch (err) {
                              console.error("Failed to remove favorite:", err);
                              if ((err as any).response?.status === 404) {
                                setVenues((prev) => prev.filter((item) => item.venue_id !== venue.venue_id));
                              }
                            }
                          }}
                        >
                          <Heart className="size-4 fill-red-500 stroke-red-500" />
                        </Button>
                      </div>
                      <p className="mb-2 text-muted-foreground">
                        {venue.cuisine_type} • {venue.distance_km} km away
                      </p>
                      <p style={{ color: "#2f8a64" }}>${venue.hourly_price}/hour</p>
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
                    <MapPin className="mr-2 size-4" />
                    City Alert
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Heart className="mr-2 size-4" />
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
                      <div className="mt-1 flex size-10 items-center justify-center rounded-full bg-primary/10">
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
