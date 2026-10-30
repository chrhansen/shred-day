import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/assets/icons/google-g-logo';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { skiService } from '@/services/skiService';
import { accountService } from '@/services/accountService';
import { EmailConfirmationRequiredError } from '@/lib/apiClient';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PageMeta from '@/components/PageMeta';
import AuthShell from '@/components/auth/AuthShell';
import EmailConfirmationRequest from '@/components/auth/EmailConfirmationRequest';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, emailConfirmationRequired } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(() =>
    new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'login');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupSent, setSignupSent] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  useEffect(() => {
    setActiveTab(new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'login');
  }, [location.search]);

  const changeMode = (value: string) => {
    const mode = value === 'signup' ? 'signup' : 'login';
    setActiveTab(mode);
    const params = new URLSearchParams(location.search);
    if (mode === 'signup') params.set('mode', 'signup');
    else params.delete('mode');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' }, { replace: true });
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    if (isSigningUp) return;
    setIsSigningUp(true);
    setSignupError('');
    try {
      await skiService.signUp({ email: signupEmail });
      setSignupSent(true);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Could not sign up. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError('');
    setConfirmationEmail(null);
    try {
      const user = await skiService.signIn({ email: loginEmail, password: loginPassword });
      const details = await accountService.getAccountDetails();
      login(details);
      toast.success(`Welcome back, ${user.email}!`);
      navigate('/');
    } catch (error) {
      if (error instanceof EmailConfirmationRequiredError) {
        setConfirmationEmail(loginEmail);
        setLoginPassword('');
      } else {
        setLoginError(error instanceof Error ? error.message : 'Could not sign in. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    try {
      const data = await skiService.initiateGoogleSignIn();
      if (data.url) window.location.href = data.url;
      else toast.error('Could not retrieve Google sign-in URL. Please try again.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Google sign-in. Please try again.');
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return <>
    <PageMeta title="Sign In · Shred Day" description="Sign in to Shred Day." />
    <AuthShell>
      <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">Welcome to Shred Day</h1>
      {emailConfirmationRequired && !confirmationEmail && <div className="mb-6">
        <EmailConfirmationRequest title="Confirm your email before password sign-in" />
      </div>}
      <Tabs value={activeTab} onValueChange={changeMode} className="w-full">
        <TabsList className="flex w-full bg-slate-100 rounded-lg mb-8 p-0">
          <TabsTrigger value="login" className="flex-1 py-2"><LogIn className="mr-1 w-4 h-4" /> Login</TabsTrigger>
          <TabsTrigger value="signup" className="flex-1 py-2"><UserPlus className="mr-1 w-4 h-4" /> Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form className="space-y-6" onSubmit={handleSignIn}>
            <div>
              <Label htmlFor="login-email" className="block mb-1 text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input id="login-email" type="email" placeholder="you@email.com" className="pl-10" autoComplete="email"
                  value={loginEmail} onChange={event => { setLoginEmail(event.target.value); setConfirmationEmail(null); }} required disabled={isLoggingIn} />
              </div>
            </div>
            <div>
              <Label htmlFor="login-password" className="block mb-1 text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input id="login-password" type={loginPasswordVisible ? 'text' : 'password'} placeholder="Password"
                  className="pl-10 pr-10" autoComplete="current-password" value={loginPassword}
                  onChange={event => setLoginPassword(event.target.value)} required disabled={isLoggingIn} />
                <button type="button" onClick={() => setLoginPasswordVisible(value => !value)}
                  className="absolute right-3 top-2.5 text-slate-400" aria-label={loginPasswordVisible ? 'Hide password' : 'Show password'}>
                  {loginPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Link to="/forgot-password" className="block py-2 text-right text-blue-700 underline">Forgot password?</Link>
            {loginError && <p role="alert" className="text-sm text-red-700">{loginError}</p>}
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 w-5 h-5" />}
              {isLoggingIn ? 'Logging In…' : 'Login'}
            </Button>
          </form>
          {confirmationEmail && <div className="mt-5"><EmailConfirmationRequest email={confirmationEmail}
            title="Confirm your email before password sign-in" /></div>}
        </TabsContent>
        <TabsContent value="signup">
          {signupSent ? <div className="space-y-4">
            <EmailConfirmationRequest email={signupEmail} />
            <Button variant="link" type="button" className="w-full" onClick={() => setSignupSent(false)}>Use a different email</Button>
          </div> : <form className="space-y-6" onSubmit={handleSignUp}>
            <p className="text-sm text-slate-600">We’ll send a link to confirm your email address and set your password.</p>
            <div>
              <Label htmlFor="signup-email" className="block mb-1 text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input id="signup-email" type="email" placeholder="you@email.com" className="pl-10" autoComplete="email"
                  value={signupEmail} onChange={event => setSignupEmail(event.target.value)} required disabled={isSigningUp} />
              </div>
            </div>
            {signupError && <p role="alert" className="text-sm text-red-700">{signupError}</p>}
            <Button type="submit" className="w-full h-12 text-lg" disabled={isSigningUp}>
              {isSigningUp ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 w-5 h-5" />}
              {isSigningUp ? 'Sending link…' : 'Send confirmation link'}
            </Button>
          </form>}
        </TabsContent>
      </Tabs>
      <div className="relative my-6 flex items-center">
        <div className="flex-grow border-t border-slate-300" /><span className="px-4 text-muted-foreground uppercase text-xs">Or</span>
        <div className="flex-grow border-t border-slate-300" />
      </div>
      <Button variant="outline" className="w-full h-12" onClick={handleGoogleSignIn} disabled={isGoogleSigningIn}>
        {isGoogleSigningIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
        {isGoogleSigningIn ? 'Redirecting...' : 'Continue with Google'}
      </Button>
      <p className="mt-3 text-center text-xs text-slate-500">Google confirms your email for you.</p>
    </AuthShell>
  </>;
}
