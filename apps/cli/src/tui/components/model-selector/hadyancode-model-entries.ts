import type {
	HadyanCodeRecommendedModel,
	HadyanCodeRecommendedModelsData,
} from "@hadyancode/core";

export type HadyanCodeModelPickerTier = "recommended" | "subscribed" | "free";

export interface HadyanCodeModelPickerItem {
	kind: "model";
	model: HadyanCodeRecommendedModel;
	tier: HadyanCodeModelPickerTier;
}

export interface HadyanCodeModelPickerBrowse {
	kind: "browse";
}

export type HadyanCodeModelPickerEntry =
	| HadyanCodeModelPickerItem
	| HadyanCodeModelPickerBrowse;

export const HADYANCODE_MODEL_PICKER_TIER_LABELS: Record<
	HadyanCodeModelPickerTier,
	string
> = {
	recommended: "Recommended",
	subscribed: "Subscribed",
	free: "Free",
};

// Featured entries for the sectioned picker, keyed by provider: hadyancode gets
// Recommended/Free with a browse-all escape into the full catalog; hadyancode-pass
// gets Subscribed/Free (see buildHadyanCodePassModelEntries for why no browse-all).
export function buildFeaturedModelEntries(
	providerId: string,
	data: HadyanCodeRecommendedModelsData,
): HadyanCodeModelPickerEntry[] {
	return providerId === "hadyancode-pass"
		? buildHadyanCodePassModelEntries(data)
		: buildHadyanCodeModelEntries(data);
}

function buildHadyanCodeModelEntries(
	data: HadyanCodeRecommendedModelsData,
): HadyanCodeModelPickerEntry[] {
	const entries: HadyanCodeModelPickerEntry[] = [];
	for (const m of data.recommended) {
		entries.push({ kind: "model", model: m, tier: "recommended" });
	}
	for (const m of data.free) {
		entries.push({ kind: "model", model: m, tier: "free" });
	}
	entries.push({ kind: "browse" });
	return entries;
}

// Shown under the Free section header when picking a model for HadyanCodePass
export const HADYANCODE_PASS_FREE_SECTION_DESCRIPTION =
	"Try with limited usage, separate from HadyanCodePass quota.";

// HadyanCodePass shows the subscription's models plus the HadyanCode free models — both
// providers hit the same HadyanCode API, so free models are selectable in place
// (they ride usage billing at $0 instead of the subscription quota).
// No "browse all" entry when the hadyancodePass bucket is populated: unlike hadyancode,
// the HadyanCodePass catalog contains exactly these two buckets, so the sections
// already list every selectable model. An empty hadyancodePass bucket means the
// fetch fell back to the bundled list (which has no pass models) — without an
// escape into the full catalog a subscriber could only pick free models, so
// browse-all comes back in that degraded mode.
function buildHadyanCodePassModelEntries(
	data: HadyanCodeRecommendedModelsData,
): HadyanCodeModelPickerEntry[] {
	const entries: HadyanCodeModelPickerEntry[] = [];
	for (const m of data.hadyancodePass) {
		entries.push({ kind: "model", model: m, tier: "subscribed" });
	}
	for (const m of data.free) {
		entries.push({ kind: "model", model: m, tier: "free" });
	}
	if (data.hadyancodePass.length === 0) {
		entries.push({ kind: "browse" });
	}
	return entries;
}

// The quota explainer only makes sense in the HadyanCodePass picker, which is the
// only picker that has a "subscribed" section
export function freeTierDescriptionFor(
	entries: HadyanCodeModelPickerEntry[],
): string | undefined {
	const isHadyanCodePassPicker = entries.some(
		(entry) => entry.kind === "model" && entry.tier === "subscribed",
	);
	return isHadyanCodePassPicker ? HADYANCODE_PASS_FREE_SECTION_DESCRIPTION : undefined;
}
