import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { MapPin } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-24 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center max-w-md">
        <div className="size-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(47, 138, 100, 0.1)' }}>
          <MapPin className="size-10" style={{ color: '#2f8a64' }} />
        </div>
        <h1 className="mb-4">404</h1>
        <h2 className="mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/">
            <Button size="lg">Go Home</Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="lg">
              Browse Spaces
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
