import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  Ban,
  BarChart2,
  Building2,
  ClipboardList,
  Flag,
  Loader2,
  Search,
  ShieldAlert,
  Tags,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { api } from "../../../services/api";
import type {
  AdminActionResponse,
  AdminActionType,
  AdminCustomerIssue,
  AdminDashboardOverviewResponse,
  AdminIssueStatus,
  AdminStatsResponse,
  AdminVenueIssue,
  Venue,
} from "../../../types/api";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-sky-100 text-sky-800 border-sky-200",
  };

  return (
    <Badge className={`border text-xs capitalize ${colors[severity] ?? ""}`}>
      {severity}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AdminIssueStatus }) {
  const colors: Record<AdminIssueStatus, string> = {
    pending: "bg-zinc-800 text-white",
    warned: "bg-amber-100 text-amber-800",
    suspended: "bg-orange-100 text-orange-800",
    banned: "bg-red-100 text-red-800",
    resolved: "bg-green-100 text-green-800",
  };

  return (
    <Badge className={`text-xs capitalize ${colors[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

type ActionTarget =
  | { kind: "customer"; issue: AdminCustomerIssue }
  | { kind: "venue"; issue: AdminVenueIssue };

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [overview, setOverview] = useState<AdminDashboardOverviewResponse | null>(null);
  const [customerIssues, setCustomerIssues] = useState<AdminCustomerIssue[]>([]);
  const [venueIssues, setVenueIssues] = useState<AdminVenueIssue[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [suspendingVenue, setSuspendingVenue] = useState<Venue | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  useEffect(() => {
    (async () => {
      if (import.meta.env.VITE_USE_MOCK === "true" && !localStorage.getItem("access_token")) {
        localStorage.setItem("access_token", "mock_jwt_token");
      }
      try {
        const [statsData, overviewData, customerData, venueData, venueListData] = await Promise.all([
          api.getAdminStats(),
          api.getAdminOverview().catch(() => null),
          api.getAdminCustomerIssues(),
          api.getAdminVenueIssues(),
          api.getVenues({ limit: 100 }).catch(() => ({ items: [] })),
        ]);

        setStats(statsData);
        setOverview(overviewData);
        setCustomerIssues(customerData);
        setVenueIssues(venueData);
        setVenues(venueListData.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredVenues = useMemo(
    () =>
      venues.filter((venue) => {
        const search = venueSearch.trim().toLowerCase();
        if (!search) return true;
        return (
          venue.name.toLowerCase().includes(search) ||
          (venue.borough ?? "").toLowerCase().includes(search)
        );
      }),
    [venueSearch, venues]
  );

  const pendingCustomer = customerIssues.filter((issue) => issue.status === "pending").length;
  const pendingVenue = venueIssues.filter((issue) => issue.status === "pending").length;

  const handleAction = async (action: AdminActionType) => {
    if (!actionTarget || actionPending) return;

    setActionPending(true);
    try {
      let result: AdminActionResponse;

      if (actionTarget.kind === "customer") {
        result = await api.adminActionCustomer(actionTarget.issue.id, action);
        setCustomerIssues((prev) =>
          prev.map((issue) =>
            issue.id === actionTarget.issue.id ? { ...issue, status: result.status } : issue
          )
        );
      } else {
        result = await api.adminActionVenue(actionTarget.issue.id, action);
        setVenueIssues((prev) =>
          prev.map((issue) =>
            issue.id === actionTarget.issue.id ? { ...issue, status: result.status } : issue
          )
        );
      }

      toast.success(result.message);
    } catch (err) {
      console.error("Failed to apply admin action:", err);
      toast.error("Failed to apply admin action.");
    } finally {
      setActionPending(false);
      setActionTarget(null);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendingVenue || isSuspending) return;

    setIsSuspending(true);
    try {
      const result = await api.suspendVenue(suspendingVenue.venue_id, "Suspended");
      setVenues((prev) =>
        prev.map((venue) =>
          venue.venue_id === suspendingVenue.venue_id
            ? { ...venue, state: result.state }
            : venue
        )
      );
      toast.success(result.message);
    } catch (err) {
      console.error("Failed to suspend venue:", err);
      toast.error("Failed to suspend venue.");
    } finally {
      setIsSuspending(false);
      setSuspendingVenue(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-700">
          <ShieldAlert className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform management and venue oversight</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/applications">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 pb-5 pt-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
                <ClipboardList className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Pending Applications</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.pending_approval ?? 0} awaiting review
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reviews">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 pb-5 pt-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100">
                <Flag className="size-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Review Moderation</p>
                <p className="text-xs text-muted-foreground">Manage reported reviews</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/taxonomy">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 pb-5 pt-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100">
                <Tags className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Taxonomy Management</p>
                <p className="text-xs text-muted-foreground">Manage tags & categories</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Financial Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <span className="text-xs text-muted-foreground">$</span>
              </div>
              <p className="mt-1 text-2xl font-bold">${stats?.total_revenue.toLocaleString() ?? "0"}</p>
              <p className="mt-1 text-xs font-medium text-emerald-600">+18.5%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-2xl font-bold">{stats?.total_bookings.toLocaleString() ?? "0"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Avg Booking Value</p>
                <span className="text-xs text-muted-foreground">$</span>
              </div>
              <p className="mt-1 text-2xl font-bold">${stats?.avg_booking_value ?? "0"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Median Venue Revenue</p>
                <BarChart2 className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-2xl font-bold">${stats?.median_venue_revenue.toLocaleString() ?? "0"}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Venue + User Statistics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <p className="font-semibold">Venue Statistics</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Venues</span>
                <span className="font-bold text-lg">{stats?.total_venues ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Venues</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-emerald-600">{stats?.active_venues ?? 0}</span>
                  <Badge className="bg-zinc-900 text-white text-xs">Active</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Approval</span>
                <span className="font-bold text-lg">{stats?.pending_approval ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suspended</span>
                <Badge className="bg-red-600 text-white">{stats?.suspended_venues ?? 0}</Badge>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground">Top Performer</span>
                <span className="font-medium">{stats?.top_performer ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <p className="font-semibold">User Statistics</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-bold text-lg">{stats?.total_users.toLocaleString() ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Users</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-emerald-600">{stats?.active_users.toLocaleString() ?? 0}</span>
                  <Badge className="bg-zinc-900 text-white text-xs">Active</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New This Month</span>
                <span className="font-bold text-lg">+{stats?.new_this_month ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-bold text-lg text-red-500">{stats?.churn_rate ?? 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-emerald-700" />
                Operational Venues
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Search active listings and suspend problematic venues.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                placeholder="Search venues..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVenues.map((venue) => (
                  <tr key={venue.venue_id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{venue.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{venue.borough || "Manhattan"}</td>
                    <td className="px-4 py-3">★ {venue.rating}</td>
                    <td className="px-4 py-3">${venue.hourly_price}/hr</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          venue.state === "Suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                        }
                      >
                        {venue.state || "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50"
                        disabled={venue.state === "Suspended"}
                        onClick={() => setSuspendingVenue(venue)}
                      >
                        <Ban className="mr-1 size-3.5" />
                        Suspend
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredVenues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No venues found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Critical Actions Required</h2>
        </div>

        <Tabs defaultValue="customer">
          <TabsList className="mb-4">
            <TabsTrigger value="customer">Customer Issues ({pendingCustomer})</TabsTrigger>
            <TabsTrigger value="venue">Venue Issues ({pendingVenue})</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 text-sm font-normal text-muted-foreground">
                  <span>Customer</span>
                  <span>Issue</span>
                  <span>Severity</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {customerIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-4 border-t pt-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{issue.user_name}</p>
                      <p className="text-xs text-muted-foreground">{issue.user_id}</p>
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{issue.issue}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{issue.description}</p>
                    </div>
                    <SeverityBadge severity={issue.severity} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{issue.reported_at}</span>
                    <StatusBadge status={issue.status} />
                    {issue.status === "pending" ? (
                      <Button
                        size="sm"
                        className="h-7 bg-red-700 text-xs text-white hover:bg-red-800"
                        onClick={() => setActionTarget({ kind: "customer", issue })}
                      >
                        Take Action
                      </Button>
                    ) : (
                      <span className="w-[88px]" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venue">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 text-sm font-normal text-muted-foreground">
                  <span>Venue</span>
                  <span>Issue</span>
                  <span>Severity</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span>Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {venueIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-4 border-t pt-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{issue.venue_name}</p>
                      <p className="text-xs text-muted-foreground">{issue.venue_id}</p>
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{issue.issue}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{issue.description}</p>
                    </div>
                    <SeverityBadge severity={issue.severity} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{issue.reported_at}</span>
                    <StatusBadge status={issue.status} />
                    {issue.status === "pending" ? (
                      <Button
                        size="sm"
                        className="h-7 bg-red-700 text-xs text-white hover:bg-red-800"
                        onClick={() => setActionTarget({ kind: "venue", issue })}
                      >
                        Take Action
                      </Button>
                    ) : (
                      <span className="w-[88px]" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={suspendingVenue !== null}
        onOpenChange={(open) => {
          if (!open) setSuspendingVenue(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Confirm Venue Suspension
            </DialogTitle>
            <DialogDescription>
              Suspend <span className="font-semibold">{suspendingVenue?.name}</span> and remove it from discovery.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendingVenue(null)} disabled={isSuspending}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmSuspend}
              disabled={isSuspending}
            >
              {isSuspending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Ban className="mr-2 size-4" />}
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Take Action Against {actionTarget?.kind === "customer" ? "Customer" : "Venue"}
            </DialogTitle>
            <DialogDescription>
              Review the issue details and choose the appropriate enforcement action.
            </DialogDescription>
          </DialogHeader>

          {actionTarget && (
            <div className="space-y-3 py-2 text-sm">
              <p>
                <span className="font-semibold">
                  {actionTarget.kind === "customer" ? "Customer: " : "Venue: "}
                </span>
                {actionTarget.kind === "customer"
                  ? actionTarget.issue.user_name
                  : actionTarget.issue.venue_name}
              </p>
              <p>
                <span className="font-semibold">Issue: </span>
                {actionTarget.issue.issue}
              </p>
              <p className="text-muted-foreground">{actionTarget.issue.description}</p>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => setActionTarget(null)} disabled={actionPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  onClick={() => handleAction("warn")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  Send Warning
                </Button>
                <Button
                  className="bg-orange-500 text-white hover:bg-orange-600"
                  onClick={() => handleAction("suspend")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  Suspend Account
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => handleAction("ban")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  Ban Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
