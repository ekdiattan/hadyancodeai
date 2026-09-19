export enum NEW_USER_TYPE {
	HADYANCODE_PASS = "hadyancode-pass",
	FREE = "free",
	POWER = "power",
	BYOK = "byok",
}

type UserTypeSelection = {
	title: string
	description: string
	type: NEW_USER_TYPE
	learnMoreUrl?: string
}

export const STEP_CONFIG = {
	0: {
		title: "How will you use HadyanCode?",
		description: "Select an option below to get started.",
		buttons: [
			{ text: "Continue", action: "next", variant: "default" },
			{ text: "Login to HadyanCode", action: "signin", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.HADYANCODE_PASS]: {
		title: "Select a HadyanCodePass model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.FREE]: {
		title: "Select a free model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.POWER]: {
		title: "Select your model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.BYOK]: {
		title: "Configure your provider",
		buttons: [
			{ text: "Continue", action: "done", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	2: {
		title: "Almost there!",
		description: "Complete account creation in your browser. Then come back here to finish up.",
		buttons: [{ text: "Back", action: "back", variant: "secondary" }],
	},
} as const

const HADYANCODE_PASS_USER_TYPE_SELECTION: UserTypeSelection = {
	title: "HadyanCodePass",
	description: "Low cost subscription plan for best open weights model.",
	type: NEW_USER_TYPE.HADYANCODE_PASS,
	learnMoreUrl: "https://docs.cline.bot/getting-started/hadyancodepass",
}

const BASE_USER_TYPE_SELECTIONS: UserTypeSelection[] = [
	{ title: "Absolutely Free", description: "Get started at no cost", type: NEW_USER_TYPE.FREE },
	{ title: "Frontier Model", description: "Claude, GPT Codex, Gemini, etc.", type: NEW_USER_TYPE.POWER },
	{ title: "Bring my own API key", description: "Use HadyanCode with your provider of choice", type: NEW_USER_TYPE.BYOK },
]

/** Free leads (and is the default); HadyanCodePass is inserted second when its models are available. */
export function getUserTypeSelections(hasHadyanCodePassModels: boolean): UserTypeSelection[] {
	if (!hasHadyanCodePassModels) {
		return BASE_USER_TYPE_SELECTIONS
	}
	const [free, ...rest] = BASE_USER_TYPE_SELECTIONS
	return [free, HADYANCODE_PASS_USER_TYPE_SELECTION, ...rest]
}
