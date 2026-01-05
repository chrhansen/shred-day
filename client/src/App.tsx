import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import StatsPage from "@/pages/StatsPage";
import LogDay from "@/pages/LogDay";
import SkisPage from "@/pages/SkisPage";
import AccountPage from "@/pages/AccountPage";
import DaysListPage from "@/pages/DaysListPage";
import AuthPage from "@/pages/AuthPage";
import CallbackPage from "./pages/CallbackPage";
import PhotoImportPage from "@/pages/PhotoImportPage";
import TextImportPage from "@/pages/TextImportPage";
import CsvExportPage from "@/pages/CsvExportPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import GoogleSheetsCallbackPage from "@/pages/GoogleSheetsCallbackPage";
import LandingPage from "@/pages/LandingPage";
import SharedDayPage from "@/pages/SharedDayPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Helmet, HelmetProvider } from "react-helmet-async";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const defaultImage = baseUrl ? `${baseUrl}/shread-day-logo_192x192.png` : undefined;

  const routeMeta = (() => {
    if (pathname.startsWith("/d/")) {
      return {
        title: "Shared Day · Shred Day",
        description: "View a shared ski day.",
      };
    }

    if (isAuthenticated) {
      if (pathname === "/") {
        return { title: "Your Days · Shred Day", description: "Review your logged ski days." };
      }
      if (pathname === "/stats") {
        return { title: "Stats · Shred Day", description: "Review your ski stats and trends." };
      }
      if (pathname === "/new") {
        return { title: "Log Day · Shred Day", description: "Log a new ski day." };
      }
      if (pathname.startsWith("/days/") && pathname.endsWith("/edit")) {
        return { title: "Edit Day · Shred Day", description: "Edit a logged ski day." };
      }
      if (pathname === "/settings/account") {
        return { title: "Account · Shred Day", description: "Manage your Shred Day account." };
      }
      if (pathname === "/settings/skis") {
        return { title: "Skis · Shred Day", description: "Manage your ski list." };
      }
      if (pathname.startsWith("/photo-imports/")) {
        return { title: "Photo Import · Shred Day", description: "Review imported ski photos." };
      }
      if (pathname.startsWith("/text-import")) {
        return { title: "Text Import · Shred Day", description: "Import ski days from text or CSV." };
      }
      if (pathname === "/csv-export") {
        return { title: "CSV Export · Shred Day", description: "Export your ski days to CSV." };
      }
      if (pathname.startsWith("/integrations")) {
        return { title: "Integrations · Shred Day", description: "Connect Shred Day integrations." };
      }
    } else {
      if (pathname === "/auth") {
        return { title: "Sign In · Shred Day", description: "Sign in to Shred Day." };
      }
      if (pathname === "/auth/callback") {
        return { title: "Signing In · Shred Day", description: "Completing sign-in." };
      }
      if (pathname === "/") {
        return { title: "Shred Day", description: "Log your ski days and photos." };
      }
    }

    return { title: "Shred Day", description: "Log your ski days and photos." };
  })();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{routeMeta.title}</title>
        <meta name="description" content={routeMeta.description} />
        <meta property="og:title" content={routeMeta.title} />
        <meta property="og:description" content={routeMeta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Shred Day" />
        {defaultImage && <meta property="og:image" content={defaultImage} />}
      </Helmet>
      <Routes>
        <Route path="/d/:dayId" element={<SharedDayPage />} />
        {isAuthenticated ? (
          <>
            <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><LogDay /></ProtectedRoute>} />
            <Route path="/days/:id/edit" element={<ProtectedRoute><LogDay /></ProtectedRoute>} />
            <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
            <Route path="/settings/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/settings/skis" element={<ProtectedRoute><SkisPage /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><DaysListPage /></ProtectedRoute>} />
            <Route path="/photo-imports/:importId" element={<ProtectedRoute><PhotoImportPage /></ProtectedRoute>} />
            <Route path="/text-import" element={<ProtectedRoute><TextImportPage /></ProtectedRoute>} />
            <Route path="/text-imports/new" element={<ProtectedRoute><TextImportPage /></ProtectedRoute>} />
            <Route path="/text-imports/:importId" element={<ProtectedRoute><TextImportPage /></ProtectedRoute>} />
            <Route path="/csv-export" element={<ProtectedRoute><CsvExportPage /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
            <Route path="/integrations/google/callback" element={<ProtectedRoute><GoogleSheetsCallbackPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/stats" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/new" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/days/:id/edit" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/settings" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/settings/account" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/settings/skis" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/photo-imports/:importId" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/text-import" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/text-imports/new" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/text-imports/:importId" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/csv-export" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/integrations" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/integrations/google/callback" element={<Navigate to="/auth" state={{ from: location }} replace />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default App;
