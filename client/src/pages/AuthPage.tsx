import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/assets/icons/google-g-logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { skiService } from "@/services/skiService";
import { accountService } from "@/services/accountService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

export default function AuthPage() {
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(() => {
    const modeParam = new URLSearchParams(location.search).get("mode");
    return modeParam === "signup" ? "signup" : "login";
  });

  const updateModeParam = (mode: "login" | "signup") => {
    const params = new URLSearchParams(location.search);
    if (mode === "signup") {
      params.set("mode", "signup");
    } else {
      params.delete("mode");
    }
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  };

  useEffect(() => {
    const modeParam = new URLSearchParams(location.search).get("mode");
    const mode = modeParam === "signup" ? "signup" : "login";
    setActiveTab(mode);
  }, [location.search]);

  // --- Sign Up State ---
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // --- Login State ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // --- Sign Up Handler ---
  const handleSignUpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningUp(true);
    try {
      const user = await skiService.signUp({
        email: signupEmail,
        password: signupPassword,
      });
      toast.success(`Welcome, ${user.email}! Sign up successful.`);

      // Fetch complete account details for the auth context
      const accountDetails = await accountService.getAccountDetails();
      login(accountDetails);
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSigningUp(false);
    }
  };

  // --- Login Handler ---
  const handleSignInSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    try {
      const user = await skiService.signIn({
        email: loginEmail,
        password: loginPassword,
      });
      toast.success(`Welcome back, ${user.email}!`);

      // Fetch complete account details for the auth context
      const accountDetails = await accountService.getAccountDetails();
      login(accountDetails);
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- Google Sign In Handler ---
  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    try {
      // Step 1: Call the service to get the Google Auth URL
      const data = await skiService.initiateGoogleSignIn();

      if (data.url) {
        // Step 2: Redirect to the Google Auth URL received from the backend
        window.location.href = data.url;
      } else {
        toast.error("Could not retrieve Google sign-in URL. Please try again.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred during Google sign-in.");
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 relative">
      <div className="absolute left-6 top-6">
        <Link to="/" aria-label="Shred Day home">
          <Logo />
        </Link>
      </div>
      <div className="w-full max-w-md">
      <Card className="rounded-2xl shadow-xl bg-gradient-to-br from-white to-slate-100 border-0">
        <CardContent className="py-10 px-8">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            Welcome to Shred Day
          </h1>
          <Tabs value={activeTab} onValueChange={(value) => {
            const mode = value === "signup" ? "signup" : "login";
            setActiveTab(mode);
            updateModeParam(mode);
          }} className="w-full">
            <TabsList className="flex w-full bg-slate-100 rounded-lg mb-8 p-0">
              <TabsTrigger
                value="login"
                className="flex-1 text-md py-2 rounded-l-lg rounded-r-none aria-selected:bg-gradient-to-r aria-selected:from-blue-600 aria-selected:to-indigo-600 aria-selected:text-white data-[state=inactive]:hover:bg-slate-200 data-[state=inactive]:text-slate-600 transition-all duration-150"
              >
                <LogIn className="inline mr-1 w-4 h-4" /> Login
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 text-md py-2 rounded-r-lg rounded-l-none aria-selected:bg-gradient-to-r aria-selected:from-blue-600 aria-selected:to-indigo-600 aria-selected:text-white data-[state=inactive]:hover:bg-slate-200 data-[state=inactive]:text-slate-600 transition-all duration-150"
              >
                <UserPlus className="inline mr-1 w-4 h-4" /> Sign Up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form className="w-full space-y-6" onSubmit={handleSignInSubmit}>
                <div>
                  <Label htmlFor="login-email" className="block mb-1 text-slate-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@email.com"
                      className="pl-10"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="login-password" className="block mb-1 text-slate-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <Input
                      id="login-password"
                      type={loginPasswordVisible ? "text" : "password"}
                      placeholder="Password"
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setLoginPasswordVisible((v) => !v)}
                      className="absolute right-3 top-2.5 focus:outline-none text-slate-400"
                      aria-label={loginPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {loginPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-75"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 w-5 h-5" />
                  )}
                  {isLoggingIn ? "Logging In..." : "Login"}
                </Button>
              </form>
              {/* Google Sign-In Button and Separator */}
              <div className="relative my-6">
                <div className="flex items-center">
                  <div className="flex-grow border-t border-slate-300"></div>
                  <span className="px-4 text-muted-foreground uppercase text-xs">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-300"></div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 text-md rounded-lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
              >
                {isGoogleSigningIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                {isGoogleSigningIn ? "Redirecting..." : "Continue with Google"}
              </Button>
            </TabsContent>
            <TabsContent value="signup">
              <form className="w-full space-y-6" onSubmit={handleSignUpSubmit}>
                <div>
                  <Label htmlFor="signup-email" className="block mb-1 text-slate-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@email.com"
                      className="pl-10"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-password" className="block mb-1 text-slate-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <Input
                      id="signup-password"
                      type={signupPasswordVisible ? "text" : "password"}
                      placeholder="Create a password (min 8 chars)"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setSignupPasswordVisible((v) => !v)}
                      className="absolute right-3 top-2.5 focus:outline-none text-slate-400"
                      aria-label={signupPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {signupPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-75"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 w-5 h-5" />
                  )}
                  {isSigningUp ? "Signing Up..." : "Sign Up"}
                </Button>
              </form>
              {/* Google Sign-In Button and Separator */}
              <div className="relative my-6">
                <div className="flex items-center">
                  <div className="flex-grow border-t border-slate-300"></div>
                  <span className="px-4 text-muted-foreground uppercase text-xs">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-300"></div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 text-md rounded-lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
              >
                {isGoogleSigningIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                {isGoogleSigningIn ? "Redirecting..." : "Continue with Google"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
