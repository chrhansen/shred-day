import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-md shadow-indigo-200">
        <span className="text-lg">A</span>
      </div>
      <span className="text-lg md:text-xl font-semibold text-slate-900">Shred.day</span>
    </div>
  );
};
