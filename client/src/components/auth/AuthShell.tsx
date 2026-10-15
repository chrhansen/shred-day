import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';

export default function AuthShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 pt-24 relative">
    <div className="absolute left-6 top-6">
      <Link to="/" aria-label="Shred Day home"><Logo /></Link>
    </div>
    <div className="w-full max-w-md">
      <Card className="rounded-2xl shadow-xl bg-gradient-to-br from-white to-slate-100 border-0">
        <CardContent className="py-10 px-8">{children}</CardContent>
      </Card>
    </div>
  </div>;
}
