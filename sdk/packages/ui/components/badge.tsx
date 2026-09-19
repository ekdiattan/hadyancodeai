"use client";

import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, ...props }, ref) => (
		<span
			{...props}
			className={clsx(
				"inline-flex shrink-0 items-center rounded-hadyancode-ui-sm border border-hadyancode-ui-border bg-hadyancode-ui-surface-hover-lighter px-1.5 pt-[0.3rem] pb-[0.2rem] text-hadyancode-ui-muted-foreground text-hadyancode-ui-xs",
				className,
			)}
			data-slot="badge"
			ref={ref}
		/>
	),
);
Badge.displayName = "Badge";
