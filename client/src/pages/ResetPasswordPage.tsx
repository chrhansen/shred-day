import { FormEvent, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import PasswordResetRequest from '@/components/auth/PasswordResetRequest';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/apiClient';
import { passwordResetService } from '@/services/passwordResetService';

export default function ResetPasswordPage() {
  const location = useLocation();
  const { logout } = useAuth();
  const [token, setToken] = useState(() => {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const value = fragment.get('token') || '';
    return fragment.getAll('token').length === 1 && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
  });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, '', location.pathname);
  }, [location.pathname]);

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !token) return;
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmation) {
      setError('Your passwords do not match.');
      return;
    }
    setPending(true);
    setError('');
    try {
      await passwordResetService.reset(token, password, confirmation);
      await logout();
      setToken('');
      setPassword('');
      setConfirmation('');
      setComplete(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setToken('');
        setPassword('');
        setConfirmation('');
      }
      setError(error instanceof Error ? error.message : 'Could not reset your password. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return <>
    <PageMeta title="Reset Password · Shred Day" description="Choose a new password for Shred Day."
      url={`${window.location.origin}/reset-password`} />
    <Helmet><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <AuthShell>
      {complete ? <div className="space-y-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">Password reset</h1>
        <p className="text-slate-600">Sign in with your new password to get back to your ski journal.</p>
        <Button asChild className="w-full"><Link to="/auth" replace>Go to sign in</Link></Button>
      </div> : <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {token ? <form onSubmit={reset} className="space-y-5">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={8}
              value={password} onChange={event => setPassword(event.target.value)} required disabled={pending}
              aria-describedby="password-help" />
            <p id="password-help" className="mt-1 text-slate-600">At least 8 characters.</p>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8}
              value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={pending} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Resetting password…' : 'Reset password'}
          </Button>
        </form> : <>
          {!error && <p role="alert" className="text-slate-600">This password reset link is missing or invalid. Request a new one below.</p>}
          <PasswordResetRequest />
        </>}
        <Link to="/auth" replace className="block py-3 text-center text-blue-700 underline">Back to sign in</Link>
      </div>}
    </AuthShell>
  </>;
}
