import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  DollarSign, TrendingUp, Building2, Users, ClipboardList, Flag, Tags,
  AlertTriangle, Loader2, ShieldAlert,
} from "lucide-react";
import { api } from "../../../services/api";
import type {
  AdminStatsResponse,
  AdminCustomerIssue,
  AdminVenueIssue,
  AdminActionType,
  AdminIssueStatus,
} from "../../../types/api";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high:   "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low:    "bg-sky-100 text-sky-800 border-sky-200",
  };
  return (
    <Badge className={`capitalize text-xs border ${colors[severity] ?? ""}`}>
      {severity}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AdminIssueStatus }) {
  const colors: Record<AdminIssueStatus, string> = {
    pending:   "bg-zinc-800 text-white",
    warned:    "bg-amber-100 text-amber-800",
    suspended: "bg-orange-100 text-orange-800",
    banned:    "bg-red-100 text-red-800",
    resolved:  "bg-green-100 text-green-800",
  };
  return (
    <Badge className={`capitalize text-xs ${colors[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

type ActionTarget =
  | { kind: "customer"; issue: AdminCustomerIssue }
  | { kind: "venue";    issue: AdminVenueIssue };

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [customerIssues, setCustomerIssues] = useState<AdminCustomerIssue[]>([]);
  const [venueIssues, setVenueIssues] = useState<AdminVenueIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, ci, vi] = await Promise.all([
          api.getAdminStats(),
          api.getAdminCustomerIssues(),
          api.getAdminVenueIssues(),
        ]);
        setStats(s);
        setCustomerIssues(ci);
        setVenueIssues(vi);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAction = async (action: AdminActionType) => {
    if (!actionTarget || actionPending) return;
    setActionPending(true);
    try {
      if (actionTarget.kind === "customer") {
        const res = await api.adminActionCustomer(actionTarget.issue.id, action);
        setCustomerIssues((prev) =>
          prev.map((i) => (i.id === actionTarget.issue.id ? { ...i, status: res.status } : i))
        );
      } else {
        const res = await api.adminActionVenue(actionTarget.issue.id, action);
        setVenueIssues((prev) =>
          prev.map((i) => (i.id === actionTarget.issue.id ? { ...i, status: res.status } : i))
        );
      }
    } finally {
      setActionPending(false);
      setActionTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin size-8 text-muted-foreground" />
      </div>
    );
  }

  const pendingCustomer = customerIssues.filter((i) => i.status === "pending").length;
  const pendingVenue    = venueIssues.filter((i) => i.status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-12 rounded-full bg-emerald-700 flex items-center justify-center">
          <ShieldAlert className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform management and oversight</p>
        </div>
      </div>

      {/* Quick-nav cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <Link to="/admin/applications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardList className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Pending Applications</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.pending_approval ?? "—"} awaiting review
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reviews">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <Flag className="size-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Review Moderation</p>
                <p className="text-xs text-muted-foreground">Manage reported reviews</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/taxonomy">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Tags className="size-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Taxonomy Management</p>
                <p className="text-xs text-muted-foreground">Manage tags &amp; categories</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Financial Overview */}
      <h2 className="text-lg font-semibold mb-4">Financial Overview</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {
            label: "Total Revenue",
            value: stats ? `$${stats.total_revenue.toLocaleString()}` : "—",
            change: "+18.5%",
            icon: DollarSign,
            changeColor: "text-green-600",
          },
          {
            label: "Total Bookings",
            value: stats ? stats.total_bookings.toLocaleString() : "—",
            icon: TrendingUp,
          },
          {
            label: "Avg Booking Value",
            value: stats ? `$${stats.avg_booking_value}` : "—",
            icon: DollarSign,
          },
          {
            label: "Median Venue Revenue",
            value: stats ? `$${stats.median_venue_revenue.toLocaleString()}` : "—",
            icon: ClipboardList,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{kpi.value}</span>
                  {kpi.change && (
                    <span className={`text-xs font-medium mb-0.5 ${kpi.changeColor ?? ""}`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Venue & User Stats */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="size-5 text-muted-foreground" />
              <span className="font-semibold">Venue Statistics</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Venues</span>
                <span className="font-bold text-base">{stats?.total_venues ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Venues</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-emerald-600">{stats?.active_venues ?? "—"}</span>
                  <Badge className="bg-black text-white text-xs">Active</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Approval</span>
                <span className="font-bold text-base">{stats?.pending_approval ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suspended</span>
                <Badge className="bg-red-600 text-white text-xs">{stats?.suspended_venues ?? "—"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Top Performer</span>
                <span className="font-medium">{stats?.top_performer ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-5 text-muted-foreground" />
              <span className="font-semibold">User Statistics</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-bold text-base">{stats?.total_users?.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Users</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-emerald-600">
                    {stats?.active_users?.toLocaleString() ?? "—"}
                  </span>
                  <Badge className="bg-black text-white text-xs">Active</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New This Month</span>
                <span className="font-bold text-base">+{stats?.new_this_month ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-bold text-base text-red-600">{stats?.churn_rate ?? "—"}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Actions */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="size-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Critical Actions Required</h2>
      </div>

      <Tabs defaultValue="customer">
        <TabsList className="mb-4">
          <TabsTrigger value="customer">
            Customer Issues ({pendingCustomer})
          </TabsTrigger>
          <TabsTrigger value="venue">
            Venue Issues ({pendingVenue})
          </TabsTrigger>
        </TabsList>

        {/* Customer Issues tab */}
        <TabsContent value="customer">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-normal grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4">
                <span>Customer</span>
                <span>Issue</span>
                <span>Severity</span>
                <span>Date</span>
                <span>Status</span>
                <span>Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {customerIssues.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 items-center border-t pt-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.user_name}</p>
                    <p className="text-xs text-muted-foreground">{row.user_id}</p>
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{row.issue}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
                  </div>
                  <SeverityBadge severity={row.severity} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{row.reported_at}</span>
                  <StatusBadge status={row.status} />
                  {row.status === "pending" ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-red-700 hover:bg-red-800 text-white"
                      onClick={() => setActionTarget({ kind: "customer", issue: row })}
                    >
                      Take Action
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize w-[88px]" />
                  )}
                </div>
              ))}
              {customerIssues.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No customer issues.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Venue Issues tab */}
        <TabsContent value="venue">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-normal grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4">
                <span>Venue</span>
                <span>Issue</span>
                <span>Severity</span>
                <span>Date</span>
                <span>Status</span>
                <span>Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {venueIssues.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 items-center border-t pt-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.venue_name}</p>
                    <p className="text-xs text-muted-foreground">{row.venue_id}</p>
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{row.issue}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
                  </div>
                  <SeverityBadge severity={row.severity} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{row.reported_at}</span>
                  <StatusBadge status={row.status} />
                  {row.status === "pending" ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-red-700 hover:bg-red-800 text-white"
                      onClick={() => setActionTarget({ kind: "venue", issue: row })}
                    >
                      Take Action
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize w-[88px]" />
                  )}
                </div>
              ))}
              {venueIssues.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No venue issues.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Take Action Modal */}
      <Dialog open={actionTarget !== null} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Take Action Against {actionTarget?.kind === "customer" ? "Customer" : "Venue"}
            </DialogTitle>
            <DialogDescription>
              Review the {actionTarget?.kind} issue details below and select an appropriate action.
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

              <p className="font-semibold pt-2">Select an action:</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setActionTarget(null)}
                  disabled={actionPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => handleAction("warn")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="animate-spin size-4 mr-1" /> : null}
                  Send Warning
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => handleAction("suspend")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="animate-spin size-4 mr-1" /> : null}
                  Suspend Account
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleAction("ban")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="animate-spin size-4 mr-1" /> : null}
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
