import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

interface Application {
  id: number;
  providerName: string;
  email: string;
  venueName: string;
  venueType: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

const INITIAL_APPS: Application[] = [
  { id: 1, providerName: "Maria Chen", email: "maria@grandhotel.com", venueName: "The Grand Hotel Lobby", venueType: "Hotel Lobby", submittedAt: "2026-07-10", status: "pending", notes: "Includes photos and floor plan." },
  { id: 2, providerName: "James O'Brien", email: "james@tribecacowork.com", venueName: "Tribeca Co-work Hub", venueType: "Coworking Space", submittedAt: "2026-07-12", status: "pending" },
  { id: 3, providerName: "Priya Sharma", email: "priya@uptown.cafe", venueName: "Uptown Cafe & Work", venueType: "Cafe", submittedAt: "2026-07-14", status: "pending", notes: "WBE certified, documents attached." },
  { id: 4, providerName: "Tom Wilson", email: "tom@soholounge.com", venueName: "SoHo Business Lounge", venueType: "Business Lounge", submittedAt: "2026-07-15", status: "pending" },
];

export function PendingApplicationsPage() {
  const [apps, setApps] = useState<Application[]>(INITIAL_APPS);
  const [selected, setSelected] = useState<Application | null>(null);

  const approve = (id: number) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "approved" } : a)));
    setSelected(null);
  };

  const reject = (id: number) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)));
    setSelected(null);
  };

  const statusColor: Record<Application["status"], string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-1">Pending Applications</h1>
        <p className="text-muted-foreground">Review and approve space provider submissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications ({apps.filter((a) => a.status === "pending").length} pending)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {apps.map((app) => (
              <div key={app.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{app.venueName}</p>
                    <Badge className={`text-xs capitalize ${statusColor[app.status]}`}>
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.providerName} • {app.email} • {app.venueType}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Submitted {app.submittedAt}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setSelected(app)}
                  >
                    <Eye className="size-3.5" />
                    Review
                  </Button>
                  {app.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approve(app.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => reject(app.id)}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium">{selected.venueName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{selected.venueType}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{selected.providerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selected.email}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{selected.notes || "No notes provided."}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selected?.status === "pending" && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => selected && approve(selected.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200"
                  onClick={() => selected && reject(selected.id)}
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
