import type { OutputHTMLAttributes } from "react";

export type SessionStatusTone = "neutral" | "running" | "error";

export interface SessionStatusProps
	extends OutputHTMLAttributes<HTMLOutputElement> {
	label: string;
	showLabel?: boolean;
	tone?: SessionStatusTone;
}

export function SessionStatus({
	className,
	label,
	showLabel = true,
	tone = "neutral",
	...props
}: SessionStatusProps) {
	return (
		<output
			className={[
				"hadyancode-ui-session-status inline-flex items-center gap-1.5 text-hadyancode-ui-xs leading-none text-hadyancode-ui-muted-foreground",
				`hadyancode-ui-session-status--${tone}`,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			{...props}
		>
			<span
				aria-hidden="true"
				className="hadyancode-ui-session-status__dot size-1.5 shrink-0 rounded-full"
			/>
			<span className={showLabel ? undefined : "hadyancode-ui-sr-only sr-only"}>
				{label}
			</span>
		</output>
	);
}
