import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Calendar, DollarSign, Users, TrendingUp } from "lucide-react";

export function ProviderDashboard() {
  const stats = [
    { label: "Total Bookings", value: "127", icon: Calendar, change: "+12%" },
    { label: "Revenue (Month)", value: "$2,450", icon: DollarSign, change: "+18%" },
    { label: "Active Spaces", value: "3", icon: Users, change: "0%" },
    { label: "Avg Rating", value: "4.8", icon: TrendingUp, change: "+0.2" },
  ];

  const upcomingBookings = [
    {
      id: 1,
      guestName: "Sarah Johnson",
      spaceName: "Grand Hotel Lobby - Table 5",
      date: "Today",
      time: "2:00 PM - 4:00 PM",
      duration: "2 hours",
      amount: "$24",
      status: "confirmed",
    },
    {
      id: 2,
      guestName: "Michael Chen",
      spaceName: "Grand Hotel Lobby - Table 3",
      date: "Today",
      time: "3:00 PM - 5:00 PM",
      duration: "2 hours",
      amount: "$24",
      status: "confirmed",
    },
    {
      id: 3,
      guestName: "Emma Wilson",
      spaceName: "Business Lounge - Desk 2",
      date: "Tomorrow",
      time: "10:00 AM - 1:00 PM",
      duration: "3 hours",
      amount: "$45",
      status: "pending",
    },
  ];

  const spaces = [
    {
      id: 1,
      name: "Grand Hotel Lobby",
      type: "Hotel Lobby",
      capacity: "8 tables",
      availability: "2 PM - 5 PM",
      status: "active",
      bookingsToday: 5,
    },
    {
      id: 2,
      name: "Business Lounge",
      type: "Business Lounge",
      capacity: "12 desks",
      availability: "9 AM - 6 PM",
      status: "active",
      bookingsToday: 8,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1>Provider Dashboard</h1>
        <Link to="/provider/offer-space">
          <Button size="lg" style={{ backgroundColor: '#2f8a64' }}>
            <Plus className="size-5 mr-2" />
            Offer New Space
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <h2>{stat.value}</h2>
                  <span className="text-sm text-green-600">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList>
          <TabsTrigger value="bookings">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="spaces">My Spaces</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4>{booking.guestName}</h4>
                      <Badge
                        variant={
                          booking.status === "confirmed" ? "default" : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-1">
                      {booking.spaceName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.date} • {booking.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl mb-2">{booking.amount}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.duration}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spaces" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {spaces.map((space) => (
              <Card key={space.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{space.name}</CardTitle>
                      <p className="text-muted-foreground mt-1">{space.type}</p>
                    </div>
                    <Badge>{space.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>{space.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability</span>
                    <span>{space.availability}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Today's Bookings</span>
                    <span>{space.bookingsToday}</span>
                  </div>
                  <div className="pt-3 flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" className="flex-1">
                      View Details
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
