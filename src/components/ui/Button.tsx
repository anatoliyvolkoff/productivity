import { cn } from "@/lib/cn";

type Variant = "primary" | "tonal" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110 active:brightness-95",
  tonal: "bg-primary-soft text-primary hover:bg-primary/20",
  secondary: "bg-surface-3 text-fg hover:bg-outline",
  ghost: "text-fg-muted hover:bg-surface-3 hover:text-fg",
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
  accent: "bg-accent text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-[14px] gap-2",
  lg: "h-11 px-6 text-[15px] gap-2",
  icon: "size-9 justify-center",
  "icon-sm": "size-7 justify-center",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap transition select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
