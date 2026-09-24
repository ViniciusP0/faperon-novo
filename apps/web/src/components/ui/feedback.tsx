import { AlertTriangle, Info } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-line/70", className)} {...props} />;
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "erro";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const erro = tone === "erro";
  const Icon = erro ? AlertTriangle : Info;
  return (
    <div
      role={erro ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm",
        erro ? "border-danger/40 bg-[#fdf2f1] text-[#7a1810]" : "border-line bg-brand-soft text-brand-dark",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1" : ""}>{children}</div>}
      </div>
    </div>
  );
}
