import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/shred_day_logo.png"
        alt="Shred Day logo"
        className="h-10 w-10 rounded-lg"
      />
      <span className="text-lg md:text-xl font-semibold text-slate-900">Shred.Day</span>
    </div>
  );
};
