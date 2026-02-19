import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-6xl w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-1 pb-6 sm:pt-2 sm:pb-8 safe-mobile",
        className
      )}
    >
      {children}
    </div>
  );
}
