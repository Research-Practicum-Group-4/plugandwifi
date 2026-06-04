import { Outlet, Link, useLocation } from "react-router";
import { Button } from "../ui/button";
import { User, Building2 } from "lucide-react";
import logo from "../../../imports/I_need_a_logo_for_Plug___Wifi__a_mobile_and_web_app_for_users_who_want_to_book_a_table_with_plug___wifi_to_work_during_one_2_or_3_hours_in_cafe___hotel_lobby_or_a_restaurant_for_work_purposes.jpg";
import { ChatBot } from "../ChatBot";

export function MainLayout() {
  const location = useLocation();
  const isProviderRoute = location.pathname.startsWith("/provider");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Plug & Wifi" className="h-32" style={{ mixBlendMode: 'multiply' }} />
          </Link>

          <nav className="flex items-center gap-4">
            {!isProviderRoute && (
              <>
                <Link to="/search">
                  <Button variant="ghost">Find Space</Button>
                </Link>
                <Link to="/saved">
                  <Button variant="ghost">Saved</Button>
                </Link>
              </>
            )}

            <Link to="/provider/dashboard">
              <Button variant="ghost" size="icon">
                <Building2 className="size-5" />
              </Button>
            </Link>

            <Link to="/login">
              <Button variant="ghost" size="icon">
                <User className="size-5" />
              </Button>
            </Link>
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
