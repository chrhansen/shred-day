import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { skiService } from "@/services/skiService";
import { accountService } from "@/services/accountService";
import { useAuth } from "@/contexts/AuthContext";

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      setIsProcessing(true);
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || `OAuth error: ${errorParam}`);
        }

        if (!code || !state) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const codeRetry = searchParams.get('code');
          const stateRetry = searchParams.get('state');
          if (!codeRetry || !stateRetry) {
            throw new Error('Authorization code or state not received from Google.');
          }
        }

        if (!code || !state) {
            throw new Error('Critical error: Code or state became null unexpectedly.');
        }

        await skiService.completeGoogleSignIn(code, state);

        const accountDetails = await accountService.getAccountDetails();

        login(accountDetails);
        setIsProcessing(false);
        navigate('/', { replace: true });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed due to an unknown error.');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 text-center">

          {isProcessing ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Signing you in...
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Please wait while we complete your Google sign-in
              </p>

              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
              </div>

              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sign-in Failed
              </h1>

              <Alert className="mb-6">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
