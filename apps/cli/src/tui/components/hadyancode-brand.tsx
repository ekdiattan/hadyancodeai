import { useTheme } from "../hooks/use-theme";

/**
 * "HadyanCode" brand wordmark.
 *
 * Replaces the Cline robot mascot on the home and onboarding screens so the
 * CLI shows its own branding instead of the upstream Cline logo. Rendered
 * with OpenTUI's ASCII art font, tinted with the theme accent.
 */
export function HadyanCodeWordmark(props: { color?: string }) {
	const theme = useTheme();
	const color = props.color ?? theme.accents.act;
	return (
		<box
			width="100%"
			flexShrink={1}
			alignItems="center"
			justifyContent="center"
			overflow="hidden"
		>
			<ascii-font text="HADYANCODE" font="tiny" color={color} />
		</box>
	);
}
