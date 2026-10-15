import { FormEvent, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import EmailConfirmationRequest from '@/components/auth/EmailConfirmationRequest';
import PageMeta from '@/components/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/apiClient';
import { emailConfirmationService } from '@/services/emailConfirmationService';

export default function ConfirmEmailPage() {
  const location = useLocation();
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

  const confirm = async (event: FormEvent) => {
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
      await emailConfirmationService.confirm(token, password, confirmation);
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
      setError(error instanceof Error ? error.message : 'Could not confirm your email. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return <>
    <PageMeta title="Confirm Email · Shred Day" description="Confirm your email and set your Shred Day password."
      url={`${window.location.origin}/confirm-email`} />
    <Helmet><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <AuthShell>
      {complete ? <div className="space-y-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">Email confirmed</h1>
        <p className="text-slate-600">Sign in with your new password to continue.</p>
        <Button asChild className="w-full"><Link to="/auth" replace>Go to sign in</Link></Button>
      </div> : <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Confirm your email</h1>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {token ? <>
          <p className="text-slate-600">Set a new password to confirm your email address. Opening this page alone does not confirm it.</p>
          <form onSubmit={confirm} className="space-y-5">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8}
                value={password} onChange={event => setPassword(event.target.value)} required disabled={pending}
                aria-describedby="password-help" />
              <p id="password-help" className="mt-1 text-sm text-slate-500">At least 8 characters.</p>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8}
                value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={pending} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? 'Confirming…' : 'Confirm email and set password'}
            </Button>
          </form>
        </> : <>
          {!error && <p role="alert" className="text-slate-600">This confirmation link is missing or invalid. Request a new one below.</p>}
          <EmailConfirmationRequest title="Request a new confirmation link" />
        </>}
        <Link to="/auth" replace className="block text-center text-sm text-blue-700 underline">Back to sign in</Link>
      </div>}
    </AuthShell>
  </>;
}
