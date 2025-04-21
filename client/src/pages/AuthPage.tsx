
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const navigate = useNavigate();

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
              <form className="w-full space-y-6">
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
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl">
                  <LogIn className="mr-2 w-5 h-5" /> Login
                </Button>
              </form>
              <div className="mt-4 text-center">
                <span className="text-slate-400 text-sm">
                  Don&apos;t have an account?{" "}
                  <button 
                    type="button" 
                    className="text-blue-600 font-medium underline"
                    onClick={() => document.querySelector('[data-state="signup"]')?.click()}
                  >
                    Sign up
                  </button>
                </span>
              </div>
            </TabsContent>
            <TabsContent value="signup">
              <form className="w-full space-y-6">
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
                      placeholder="Create a password"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
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
                <Button type="submit" className="w-full h-12 mt-2 text-lg rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl">
                  <UserPlus className="mr-2 w-5 h-5" /> Sign Up
                </Button>
              </form>
              <div className="mt-4 text-center">
                <span className="text-slate-400 text-sm">
                  Already have an account?{" "}
                  <button 
                    type="button" 
                    className="text-blue-600 font-medium underline"
                    onClick={() => document.querySelector('[data-state="login"]')?.click()}
                  >
                    Login
                  </button>
                </span>
              </div>
            </TabsContent>
          </Tabs>
          <Button 
            variant="ghost"
            className="block mx-auto mt-8 text-slate-600 hover:text-blue-700 transition-all"
            onClick={() => navigate("/")}
          >
            ← Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
