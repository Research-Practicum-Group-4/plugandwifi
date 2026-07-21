import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  DollarSign, Users, Building2, Star, AlertTriangle, CheckCircle2,
  ClipboardList, Tags
} from "lucide-react";

const kpis = [
  { label: "Total Revenue (Month)", value: "$48,320", icon: DollarSign, change: "+12%" },
  { label: "Active Users", value: "3,841", icon: Users, change: "+8%" },
  { label: "Listed Venues", value: "124", icon: Building2, change: "+3" },
  { label: "Avg Platform Rating", value: "4.7", icon: Star, change: "+0.1" },
];

const customerIssues = [
  { id: 1, user: "alex@email.com", issue: "Booking not honored by venue", severity: "high", status: "open" },
  { id: 2, user: "priya@email.com", issue: "Refund not received after cancellation", severity: "medium", status: "open" },
  { id: 3, user: "tom@email.com", issue: "WiFi not working at booked space", severity: "low", status: "pending" },
];

const venueIssues = [
  { id: 1, venue: "Bryant Park Cafe", issue: "Multiple noise complaints", severity: "high", status: "open" },
  { id: 2, venue: "Grand Central Lounge", issue: "Overbooked seats 3 times", severity: "medium", status: "flagged" },
  { id: 3, venue: "Chelsea Market Co-work", issue: "Listing photos do not match venue", severity: "low", status: "open" },
];

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-sky-100 text-sky-800 border-sky-200",
  };
  return (
    <Badge className={`capitalize text-xs ${colors[severity] || ""}`}>
      {severity}
    </Badge>
  );
}

export function AdminDashboard() {
  const [customerRows, setCustomerRows] = useState(customerIssues);
  const [venueRows, setVenueRows] = useState(venueIssues);

  const resolveCustomer = (id: number) => {
    setCustomerRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
  };

  const warnVenue = (id: number) => {
    setVenueRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "warned" } : r)));
  };

  const suspendVenue = (id: number) => {
    setVenueRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "suspended" } : r)));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and critical actions</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/applications">
            <Button variant="outline" className="gap-2">
              <ClipboardList className="size-4" />
              Applications
            </Button>
          </Link>
          <Link to="/admin/reviews">
            <Button variant="outline" className="gap-2">
              <Star className="size-4" />
              Reviews
            </Button>
          </Link>
          <Link to="/admin/taxonomy">
            <Button variant="outline" className="gap-2">
              <Tags className="size-4" />
              Taxonomy
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{kpi.value}</span>
                  <span className="text-sm text-green-600 font-medium">{kpi.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Customer Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Customer Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerRows.map((row) => (
              <div key={row.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium">{row.user}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.issue}</p>
                  </div>
                  <SeverityBadge severity={row.severity} />
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{row.status}</span>
                  {row.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => resolveCustomer(row.id)}
                    >
                      <CheckCircle2 className="size-3" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Venue Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-red-500" />
              Venue Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {venueRows.map((row) => (
              <div key={row.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium">{row.venue}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.issue}</p>
                  </div>
                  <SeverityBadge severity={row.severity} />
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{row.status}</span>
                  <div className="flex gap-2">
                    {row.status !== "warned" && row.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-amber-600 border-amber-200"
                        onClick={() => warnVenue(row.id)}
                      >
                        Warn
                      </Button>
                    )}
                    {row.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200"
                        onClick={() => suspendVenue(row.id)}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
