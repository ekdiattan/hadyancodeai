/**
 * List of email domains that are considered trusted testers for HadyanCode.
 */
const HADYANCODE_TRUSTED_TESTER_DOMAINS = ["fibilabs.tech"]

/**
 * Checks if the given email belongs to a HadyanCode bot user.
 * E.g. Emails ending with @cline.bot
 */
function isHadyanCodeBotUser(email: string): boolean {
	return email.endsWith("@cline.bot")
}

export function isHadyanCodeInternalTester(email: string): boolean {
	return isHadyanCodeBotUser(email) || HADYANCODE_TRUSTED_TESTER_DOMAINS.some((d) => email.endsWith(`@${d}`))
}
