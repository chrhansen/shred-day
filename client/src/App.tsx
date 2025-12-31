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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
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
  );
}

export default App;
