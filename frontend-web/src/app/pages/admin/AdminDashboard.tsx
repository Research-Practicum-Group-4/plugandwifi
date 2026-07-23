import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Building2, ClipboardList, Flag, Tags,
  AlertTriangle, Loader2, ShieldAlert, Search, Ban
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../services/api";
import type {
  AdminStatsResponse,
  AdminCustomerIssue,
  AdminVenueIssue,
  AdminActionType,
  AdminIssueStatus,
  Venue,
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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Suspend Venue Intercept Modal state
  const [suspendingVenue, setSuspendingVenue] = useState<Venue | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const [s, ci, vi, vList] = await Promise.all([
          api.getAdminStats(),
          api.getAdminCustomerIssues(),
          api.getAdminVenueIssues(),
          api.getVenues({ limit: 100 }).catch(() => ({ items: [] })),
        ]);
        setStats(s);
        setCustomerIssues(ci);
        setVenueIssues(vi);
        setVenues(vList.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirmSuspend = async () => {
    if (!suspendingVenue || isSuspending) return;
    setIsSuspending(true);
    try {
      await api.suspendVenue(suspendingVenue.venue_id, "Suspended");
      toast.success(`Venue "${suspendingVenue.name}" has been suspended successfully.`);
      setVenues((prev) =>
        prev.map((v) =>
          v.venue_id === suspendingVenue.venue_id ? { ...v, opening_now: false } : v
        )
      );
    } catch (err: any) {
      console.error("Failed to suspend venue:", err);
      toast.error("Failed to suspend venue.");
    } finally {
      setIsSuspending(false);
      setSuspendingVenue(null);
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

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.borough && v.borough.toLowerCase().includes(venueSearch.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-full bg-emerald-700 flex items-center justify-center">
          <ShieldAlert className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm">System administration and venue oversight</p>
        </div>
      </div>

      {/* Quick-nav cards */}
      <div className="grid sm:grid-cols-3 gap-4">
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

      {/* Operational Venues Table (G4PW-219 & G4PW-220) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="size-5 text-emerald-700" />
                Operational Venues Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Inspect active venues, monitor ratings, and manage space suspensions.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search venues..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase border-b">
                <tr>
                  <th className="py-3 px-4">Venue Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Hourly Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVenues.map((v) => (
                  <tr key={v.venue_id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{v.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{v.borough || "Manhattan"}</td>
                    <td className="py-3 px-4 font-semibold text-amber-600">★ {v.rating}</td>
                    <td className="py-3 px-4 font-semibold">${v.hourly_price}/hr</td>
                    <td className="py-3 px-4">
                      {v.opening_now ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inactive / Suspended</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                        onClick={() => setSuspendingVenue(v)}
                      >
                        <Ban className="size-3.5 mr-1" />
                        Suspend Space
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredVenues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">
                      No operational venues found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Critical Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Critical Incident Reports</h2>
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
      </div>

      {/* Administrative Intercept Modal for Venue Suspension (G4PW-220) */}
      <Dialog open={suspendingVenue !== null} onOpenChange={(open) => { if (!open) setSuspendingVenue(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Confirm Venue Suspension
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground font-medium">
              Are you sure you want to suspend <span className="font-bold">{suspendingVenue?.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>This action will hide the listing from all user discovery screens and automatically cancel pending active bookings.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSuspendingVenue(null)} disabled={isSuspending}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              onClick={handleConfirmSuspend}
              disabled={isSuspending}
            >
              {isSuspending ? <Loader2 className="animate-spin size-4 mr-2" /> : <Ban className="size-4 mr-2" />}
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                  className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                  onClick={() => handleAction("warn")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="animate-spin size-4 mr-1" /> : null}
                  Send Warning
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                  onClick={() => handleAction("suspend")}
                  disabled={actionPending}
                >
                  {actionPending ? <Loader2 className="animate-spin size-4 mr-1" /> : null}
                  Suspend Account
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
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
