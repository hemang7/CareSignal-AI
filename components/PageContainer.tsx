import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-6xl w-full min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
