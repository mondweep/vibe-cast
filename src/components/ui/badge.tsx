import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        aws: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        design: "border-blue-500/40 bg-blue-500/10 text-blue-400",
        security: "border-red-500/40 bg-red-500/10 text-red-400",
        operations: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
        automation: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        "exam-prep": "border-purple-500/40 bg-purple-500/10 text-purple-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
