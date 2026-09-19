// Shared between the sidecar (which produces this result) and the webview
// (which consumes it), like the desktop transport types.

/**
 * Typed result the `hadyancode_account` sidecar command returns when no HadyanCode
 * account credentials exist. Being signed out is an expected state, so it
 * travels as a structured response instead of a thrown error: it must not be
 * reported to error telemetry or rendered as a raw error string.
 */
export const HADYANCODE_ACCOUNT_NOT_AUTHENTICATED_CODE =
	"ACCOUNT_NOT_AUTHENTICATED" as const;

export type HadyanCodeAccountNotAuthenticatedResult = {
	signedIn: false;
	code: typeof HADYANCODE_ACCOUNT_NOT_AUTHENTICATED_CODE;
};

export const HADYANCODE_ACCOUNT_NOT_AUTHENTICATED_RESULT: HadyanCodeAccountNotAuthenticatedResult =
	{
		signedIn: false,
		code: HADYANCODE_ACCOUNT_NOT_AUTHENTICATED_CODE,
	};

export function isHadyanCodeAccountNotAuthenticatedResult(
	value: unknown,
): value is HadyanCodeAccountNotAuthenticatedResult {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as HadyanCodeAccountNotAuthenticatedResult).code ===
			HADYANCODE_ACCOUNT_NOT_AUTHENTICATED_CODE &&
		(value as HadyanCodeAccountNotAuthenticatedResult).signedIn === false
	);
}
