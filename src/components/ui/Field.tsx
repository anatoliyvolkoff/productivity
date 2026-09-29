import { cn } from "@/lib/cn";

const control =
  "w-full rounded-sm bg-surface-3 px-3 text-[14px] text-fg outline-none transition placeholder:text-fg-subtle " +
  "focus:bg-surface focus:ring-2 focus:ring-primary/40 disabled:opacity-60";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8", className)} {...rest}
      style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")", ...rest.style }}>
      {children}
    </select>
  );
}

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-fg-subtle">{hint}</span>}
    </label>
  );
}
