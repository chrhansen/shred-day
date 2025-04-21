import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LogDay from "./pages/LogDay";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Loader2 } from 'lucide-react'; // Or your preferred loading spinner

const queryClient = new QueryClient();

// Component to handle root and auth routes based on auth state
const AuthRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading indicator while checking auth state
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      {/* Redirect root to /auth if not authenticated */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Routes accessible only when authenticated */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/log"
              element={<ProtectedRoute><LogDay /></ProtectedRoute>}
            />

            {/* Handle root and auth routes based on auth state */}
            <Route path="/*" element={<AuthRoutes />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* Note: The NotFound route might need adjustment depending on desired behavior */}
            {/* For now, AuthRoutes handles the catch-all for unauthenticated users */}
            {/* <Route path="*" element={<NotFound />} /> */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
