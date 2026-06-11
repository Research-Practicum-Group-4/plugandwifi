import { Outlet, Link, useLocation } from "react-router";
import { Button } from "../ui/button";
import { User, Building2 } from "lucide-react";
import logo from "../../../imports/temp_logo.jpg";
import { ChatBot } from "../ChatBot";
import { useAuth } from "../../contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

export function MainLayout() {
  const location = useLocation();
  const isProviderRoute = location.pathname.startsWith("/provider");
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Plug & Wifi"
              className="h-32"
              style={{ mixBlendMode: "multiply" }}
            />
          </Link>

          <nav className="flex items-center gap-4">
            {!isProviderRoute && (
              <>
                <Link
                  to={isAuthenticated ? "/search" : "#"}
                  className={!isAuthenticated ? "pointer-events-none opacity-50" : ""}
                >
                  <Button variant="ghost" disabled={!isAuthenticated}>
                    Find Space
                  </Button>
                </Link>
                <Link
                  to={isAuthenticated ? "/saved" : "#"}
                  className={!isAuthenticated ? "pointer-events-none opacity-50" : ""}
                >
                  <Button variant="ghost" disabled={!isAuthenticated}>
                    Saved
                  </Button>
                </Link>
              </>
            )}

            <Link
              to={isAuthenticated ? "/provider/dashboard" : "#"}
              className={!isAuthenticated ? "pointer-events-none opacity-50" : ""}
            >
              <Button variant="ghost" size="icon" disabled={!isAuthenticated}>
                <Building2 className="size-5" />
              </Button>
            </Link>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full cursor-pointer">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="icon">
                  <User className="size-5" />
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Plug & Wifi - Find your perfect workspace</p>
        </div>
      </footer>

      {/* AI Chatbot */}
      <ChatBot />
    </div>
  );
}

