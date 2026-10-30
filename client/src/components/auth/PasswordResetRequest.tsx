import { FormEvent, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { passwordResetService } from '@/services/passwordResetService';

export default function PasswordResetRequest() {
  const [email, setEmail] = useState('');
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
      const result = await passwordResetService.request(email);
      setMessage(result.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not request a reset link. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return <div className="space-y-5">
    <p className="text-slate-600">Enter your account email. We’ll send a link to choose a new password, valid for one hour.</p>
    <form onSubmit={requestLink} className="space-y-5">
      <div>
        <Label htmlFor="reset-email">Email address</Label>
        <Input id="reset-email" type="email" autoComplete="email" value={email}
          onChange={event => setEmail(event.target.value)} required disabled={pending} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        {pending ? 'Sending link…' : 'Send reset link'}
      </Button>
    </form>
    {message && <div role="status" className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-700">
      <p>{message}</p>
      <p>Check your inbox and spam folder. If needed, request another link after a minute.</p>
    </div>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
