import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLElement> & {
  title?: string;
  action?: React.ReactNode;
};

export function Card({ title, action, className, children, ...rest }: CardProps) {
  return (
    <section
      className={cn("flex flex-col rounded-lg bg-surface p-5 shadow-card", className)}
      {...rest}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[13px] font-semibold tracking-tight text-fg-muted">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
