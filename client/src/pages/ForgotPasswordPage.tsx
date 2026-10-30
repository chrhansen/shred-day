import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AuthShell from '@/components/auth/AuthShell';
import PasswordResetRequest from '@/components/auth/PasswordResetRequest';
import PageMeta from '@/components/PageMeta';

export default function ForgotPasswordPage() {
  return <>
    <PageMeta title="Forgot Password · Shred Day" description="Request a link to reset your Shred Day password."
      url={`${window.location.origin}/forgot-password`} />
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <AuthShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
        <PasswordResetRequest />
        <Link to="/auth" className="block py-3 text-center text-blue-700 underline">Back to sign in</Link>
      </div>
    </AuthShell>
  </>;
}
