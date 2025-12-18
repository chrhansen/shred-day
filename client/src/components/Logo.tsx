import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/shread-day-logo_192x192.png"
        alt="Shred Day logo"
        className="h-10 w-10 rounded-lg shadow-sm"
      />
      <span className="text-lg md:text-xl font-semibold text-slate-900">Shred.day</span>
    </div>
  );
};
