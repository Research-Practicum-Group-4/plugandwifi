import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { VenueDetailPage } from "./pages/VenueDetailPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { SavedPlacesPage } from "./pages/SavedPlacesPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ProviderDashboard } from "./pages/provider/ProviderDashboard";
import { OfferSpacePage } from "./pages/provider/OfferSpacePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "search", Component: SearchPage },
      { path: "venue/:id", Component: VenueDetailPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      
      // Protected pages
      {
        element: <ProtectedRoute />,
        children: [
          { path: "checkout", Component: CheckoutPage },
          { path: "saved", Component: SavedPlacesPage },
          { path: "provider/dashboard", Component: ProviderDashboard },
          { path: "provider/offer-space", Component: OfferSpacePage },
        ],
      },
      
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
