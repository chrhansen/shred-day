import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { skiService } from "@/services/skiService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // --- Sign Up State ---
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirmation, setSignupPasswordConfirmation] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // --- Login State ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- Sign Up Handler ---
  const handleSignUpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signupPassword !== signupPasswordConfirmation) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSigningUp(true);
    try {
      const user = await skiService.signUp({
        email: signupEmail,
        password: signupPassword,
        password_confirmation: signupPasswordConfirmation,
      });
      toast.success(`Welcome, ${user.email}! Sign up successful.`);
      login(user);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSigningUp(false);
    }
  };

  // --- Sign In Handler ---
  const handleSignInSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    try {
      const user = await skiService.signIn({
        email: loginEmail,
        password: loginPassword,
      });
      toast.success(`Welcome back, ${user.email}!`);
      login(user);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl bg-gradient-to-br from-white to-slate-100 border-0">
        <CardContent className="py-10 px-8">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            Welcome to Shred Day
          </h1>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="flex w-full bg-slate-100 rounded-full mb-8">
              <TabsTrigger value="login" className="flex-1 text-md py-2 aria-selected:bg-gradient-to-r aria-selected:from-blue-600 aria-selected:to-indigo-600 aria-selected:text-white">
                <LogIn className="inline mr-1 w-4 h-4" /> Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 text-md py-2 aria-selected:bg-gradient-to-r aria-selected:from-blue-600 aria-selected:to-indigo-600 aria-selected:text-white">
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
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-75"
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
              <div className="mt-4 text-center">
                <span className="text-slate-400 text-sm">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-blue-600 font-medium underline"
                    onClick={() => (document.querySelector('[data-state="signup"]') as HTMLElement)?.click()}
                  >
                    Sign up
                  </button>
                </span>
              </div>
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
                <div>
                  <Label htmlFor="signup-password-confirmation" className="block mb-1 text-slate-700">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                    <Input
                      id="signup-password-confirmation"
                      type={signupPasswordVisible ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      value={signupPasswordConfirmation}
                      onChange={(e) => setSignupPasswordConfirmation(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-75"
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
              <div className="mt-4 text-center">
                <span className="text-slate-400 text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-blue-600 font-medium underline"
                    onClick={() => (document.querySelector('[data-state="login"]') as HTMLElement)?.click()}
                  >
                    Login
                  </button>
                </span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
