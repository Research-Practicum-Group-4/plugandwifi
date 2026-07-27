import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { VenueDetailPage } from "./pages/VenueDetailPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { BookingConfirmationPage } from "./pages/BookingConfirmationPage";
import { SavedPlacesPage } from "./pages/SavedPlacesPage";
import { BookingsPage } from "./pages/BookingsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ProviderRegisterPage } from "./pages/provider/ProviderRegisterPage";
import { ProviderDashboard } from "./pages/provider/ProviderDashboard";
import { OfferSpacePage } from "./pages/provider/OfferSpacePage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { PendingApplicationsPage } from "./pages/admin/PendingApplicationsPage";
import { ReviewModerationPage } from "./pages/admin/ReviewModerationPage";
import { TaxonomyManagementPage } from "./pages/admin/TaxonomyManagementPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

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
      { path: "forgot-password", Component: ForgotPasswordPage },
      { path: "provider/register", Component: ProviderRegisterPage },

      // User Protected pages
      {
        element: <ProtectedRoute />,
        children: [
          { path: "checkout", Component: CheckoutPage },
          { path: "booking-confirmation", Component: BookingConfirmationPage },
          { path: "saved", Component: SavedPlacesPage },
          { path: "bookings", Component: BookingsPage },
        ],
      },

      // Provider pages (unguarded for demo access)
      { path: "provider/dashboard", Component: ProviderDashboard },
      { path: "provider/offer-space", Component: OfferSpacePage },

      // Admin pages
      {
        element: <AdminRoute />,
        children: [
          { path: "admin", Component: AdminDashboard },
          { path: "admin/dashboard", Component: AdminDashboard },
          { path: "admin/applications", Component: PendingApplicationsPage },
          { path: "admin/reviews", Component: ReviewModerationPage },
          { path: "admin/taxonomy", Component: TaxonomyManagementPage },
        ],
      },

      { path: "*", Component: NotFoundPage },
    ],
  },
]);
