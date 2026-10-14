import { FormEvent, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emailConfirmationService } from '@/services/emailConfirmationService';

export default function EmailConfirmationRequest({ email, title = 'Check your email' }: { email?: string; title?: string }) {
  const [address, setAddress] = useState(email || '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestLink = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await emailConfirmationService.request(email || address);
      setMessage(result.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not request a link. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    <p className="text-sm text-slate-700">
      {email && <>Check <strong className="break-words">{email}</strong>. </>}
      The link confirms your email address and lets you set a new password. You’ll then sign in with that password.
    </p>
    <form onSubmit={requestLink} className="space-y-3">
      {!email && <div>
        <Label htmlFor="confirmation-email">Email address</Label>
        <Input id="confirmation-email" type="email" autoComplete="email" value={address}
          onChange={event => setAddress(event.target.value)} required disabled={pending} />
      </div>}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        {pending ? 'Requesting link…' : 'Resend confirmation email'}
      </Button>
    </form>
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
