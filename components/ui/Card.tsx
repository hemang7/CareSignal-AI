import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm min-w-0 break-words overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
