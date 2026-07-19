import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { CheckCircle2, Trash2, Flag } from "lucide-react";

interface FlaggedReview {
  id: number;
  reviewer: string;
  venue: string;
  rating: number;
  comment: string;
  flagReason: string;
  reportedBy: string;
  reportedAt: string;
  status: "pending" | "dismissed" | "removed";
}

const INITIAL_REVIEWS: FlaggedReview[] = [
  {
    id: 1,
    reviewer: "john_d",
    venue: "Bryant Park Cafe",
    rating: 1,
    comment: "Absolute scam. The wifi doesn't work and staff are rude!!!",
    flagReason: "Harassment / inappropriate language",
    reportedBy: "provider@bryantpark.com",
    reportedAt: "2026-07-17",
    status: "pending",
  },
  {
    id: 2,
    reviewer: "anon_user99",
    venue: "WeWork Times Square",
    rating: 5,
    comment: "Best place ever! Visit mysite.com for 50% off!!",
    flagReason: "Spam / promotional content",
    reportedBy: "provider@wework.com",
    reportedAt: "2026-07-16",
    status: "pending",
  },
  {
    id: 3,
    reviewer: "user_xyz",
    venue: "The Plaza Hotel Lobby",
    rating: 2,
    comment: "They kicked me out after 30 min, never booking again",
    flagReason: "Factual inaccuracy",
    reportedBy: "provider@plaza.com",
    reportedAt: "2026-07-15",
    status: "pending",
  },
];

const statusColor: Record<FlaggedReview["status"], string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  dismissed: "bg-sky-100 text-sky-800 border-sky-200",
  removed: "bg-red-100 text-red-800 border-red-200",
};

export function ReviewModerationPage() {
  const [reviews, setReviews] = useState<FlaggedReview[]>(INITIAL_REVIEWS);

  const dismiss = (id: number) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r)));
  };

  const remove = (id: number) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: "removed" } : r)));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-1">Review Moderation</h1>
        <p className="text-muted-foreground">Handle flagged reviews reported by venue owners</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="size-5 text-amber-500" />
            Flagged Reviews ({reviews.filter((r) => r.status === "pending").length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {reviews.map((review) => (
              <div key={review.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">@{review.reviewer}</p>
                      <span className="text-muted-foreground">→</span>
                      <p className="text-sm text-muted-foreground">{review.venue}</p>
                      <span className="text-xs font-mono text-yellow-600">{"★".repeat(review.rating)}</span>
                    </div>
                    <p className="text-sm italic text-muted-foreground">"{review.comment}"</p>
                  </div>
                  <Badge className={`text-xs capitalize shrink-0 ${statusColor[review.status]}`}>
                    {review.status}
                  </Badge>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Flagged by <strong>{review.reportedBy}</strong> on {review.reportedAt} — <em>{review.flagReason}</em>
                  </span>
                  {review.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => dismiss(review.id)}
                      >
                        <CheckCircle2 className="size-3" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => remove(review.id)}
                      >
                        <Trash2 className="size-3" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
