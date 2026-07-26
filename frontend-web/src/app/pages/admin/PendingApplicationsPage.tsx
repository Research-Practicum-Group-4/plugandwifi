import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../services/api";
import { AdminPendingVenue } from "../../../types/api";

export function PendingApplicationsPage() {
  const [applications, setApplications] = useState<AdminPendingVenue[]>([]);
  const [selected, setSelected] = useState<AdminPendingVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionVenueId, setActionVenueId] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const response = await api.getPendingVenues();
        setApplications(response.items);
      } catch (err: any) {
        const message =
          err.response?.data?.detail || err.message || "Could not load pending venues.";
        toast.error("Failed to load applications", { description: message });
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, []);

  const review = async (
    application: AdminPendingVenue,
    decision: "approve" | "reject"
  ) => {
    try {
      setActionVenueId(application.venue_id);
      await api.reviewVenue(application.venue_id, decision);
      setApplications((current) =>
        current.filter((item) => item.venue_id !== application.venue_id)
      );
      setSelected(null);
      toast.success(decision === "approve" ? "Venue approved" : "Venue rejected", {
        description:
          decision === "approve"
            ? "The venue is now visible in public search."
            : "The venue will remain hidden from public search.",
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail || err.message || "Could not review this venue.";
      toast.error("Review failed", { description: message });
    } finally {
      setActionVenueId(null);
    }
  };

  const formatTime = (value: string | null) => value?.slice(0, 5) || "Not specified";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-1">Pending Applications</h1>
        <p className="text-muted-foreground">Review and approve space provider submissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications ({applications.length} pending)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No applications are waiting for review.
            </div>
          ) : (
            <div className="divide-y">
              {applications.map((application) => {
                const actionPending = actionVenueId === application.venue_id;
                return (
                  <div
                    key={application.venue_id}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium">{application.name}</p>
                        <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-800">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {application.provider_name} · {application.provider_email}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {application.borough} · {application.availability_date || "No date"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setSelected(application)}
                      >
                        <Eye className="size-3.5" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 text-white hover:bg-green-700"
                        disabled={actionPending}
                        onClick={() => review(application, "approve")}
                      >
                        {actionPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={actionPending}
                        onClick={() => review(application, "reject")}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium">{selected.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{selected.osm_type || "Other"}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{selected.provider_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="break-all font-medium">{selected.provider_email}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p>
                  {[selected.street, selected.borough, selected.zipcode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.lat}, {selected.lon}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Availability</p>
                  <p>
                    {selected.availability_date || "Not specified"}{" "}
                    {formatTime(selected.availability_start_time)}-
                    {formatTime(selected.availability_end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capacity / Price</p>
                  <p>
                    {selected.seat_capacity} seats · $
                    {(selected.hourly_price ?? 0).toFixed(2)}/hour
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Description and rules</p>
                <p>{selected.rules_text || "No description provided."}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amenities</p>
                <p>{selected.amenity_tags.join(", ") || "None listed"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selected && (
              <>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={actionVenueId === selected.venue_id}
                  onClick={() => review(selected, "approve")}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600"
                  disabled={actionVenueId === selected.venue_id}
                  onClick={() => review(selected, "reject")}
                >
                  Reject
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
