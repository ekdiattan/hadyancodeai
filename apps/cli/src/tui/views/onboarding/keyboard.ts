import type { ProviderConfigFieldKey } from "@hadyancode/core";
import { useKeyboard } from "@opentui/react";
import type { Dispatch, SetStateAction } from "react";
import type { HadyanCodeModelPickerEntry } from "../../components/model-selector/hadyancode-model-picker";
import type { SearchableListState } from "../../components/searchable-list";
import {
	isOnboardingOAuthProviderId,
	type OnboardingOAuthProviderId,
} from "./auth";
import { FIELD_ORDER } from "./fields";
import {
	type HadyanCodePassSubscriptionOption,
	type HadyanCodePassSubscriptionStatus,
	type MenuOption,
	type OnboardingStep,
	THINKING_LEVELS,
	type ThinkingLevel,
} from "./model";

export function useOnboardingKeyboard(input: {
	step: OnboardingStep;
	onExit: () => void;
	oauthProvider: string;
	activeProviderId: string;
	menuOptions: MenuOption[];
	menuSelected: number;
	providerList: SearchableListState;
	modelList: SearchableListState;
	hadyancodeEntries: HadyanCodeModelPickerEntry[];
	hadyancodeModelSelected: number;
	hadyancodePassSubscriptionStatus: HadyanCodePassSubscriptionStatus;
	hadyancodePassSubscriptionOptions: HadyanCodePassSubscriptionOption[];
	hadyancodePassSubscriptionSelected: number;
	thinkingSelected: number;
	setStep: (step: OnboardingStep) => void;
	setMenuSelected: Dispatch<SetStateAction<number>>;
	resetByoFields: () => void;
	byoFields: Partial<Record<ProviderConfigFieldKey, unknown>>;
	byoFocusedField: ProviderConfigFieldKey;
	setByoFocusedField: Dispatch<SetStateAction<ProviderConfigFieldKey>>;
	setDeviceUserCode: (value: string) => void;
	setDeviceVerifyUrl: (value: string) => void;
	setDeviceError: (value: string) => void;
	setDeviceStatus: (value: string) => void;
	setHadyanCodeModelSelected: Dispatch<SetStateAction<number>>;
	setHadyanCodePassSubscriptionSelected: Dispatch<SetStateAction<number>>;
	setThinkingSelected: Dispatch<SetStateAction<number>>;
	continueFromHadyanCodePassSubscription: () => void;
	refreshHadyanCodePassSubscriptionStatus: () => void;
	openHadyanCodePassSubscriptionPage: () => void;
	abortOAuth: () => void;
	abortDeviceCode: () => void;
	resetAuth: () => void;
	refreshCodexCliStatus: () => void;
	startOAuthFlow: (providerId: OnboardingOAuthProviderId) => void;
	startDeviceCodeFlow: (providerId: OnboardingOAuthProviderId) => void;
	selectProvider: (providerId: string) => void;
	loadModelsForProvider: (providerId: string) => void;
	saveHadyanCodeModelSelection: (modelId: string, modelName: string) => void;
	saveCodexCliConfig: () => void;
	saveByoConfig: () => void;
	saveModelSelection: () => void;
	saveThinkingLevel: (level: ThinkingLevel) => void;
}) {
	useKeyboard((key) => {
		if (input.step === "done") return;

		if (key.ctrl && key.name === "c") {
			input.onExit();
			return;
		}

		if (key.name === "escape") {
			if (input.step === "oauth_pending") {
				input.abortOAuth();
				input.resetAuth();
				input.setStep("menu");
				input.setMenuSelected(0);
				return;
			}
			if (input.step === "device_code") {
				input.abortDeviceCode();
				input.setDeviceUserCode("");
				input.setDeviceVerifyUrl("");
				input.setDeviceError("");
				input.setDeviceStatus("");
				input.setStep("menu");
				input.setMenuSelected(0);
				return;
			}
			if (input.step === "byo_apikey") {
				input.resetByoFields();
				input.setStep("byo_provider");
				return;
			}
			if (input.step === "byo_provider") {
				input.setStep("menu");
				input.setMenuSelected(0);
				return;
			}
			if (input.step === "codex_cli_setup") {
				input.setStep("byo_provider");
				return;
			}
			if (input.step === "hadyancode_pass_subscription") {
				input.setStep("menu");
				input.setMenuSelected(0);
				return;
			}
			if (input.step === "hadyancode_model") {
				input.setStep("menu");
				input.setMenuSelected(0);
				return;
			}
			if (input.step === "model_picker") {
				if (input.activeProviderId === "hadyancode") {
					input.setHadyanCodeModelSelected(0);
					input.setStep("hadyancode_model");
				} else {
					input.setStep("menu");
					input.setMenuSelected(0);
				}
				return;
			}
			if (input.step === "custom_model_id") {
				input.setStep("model_picker");
				return;
			}
			if (input.step === "thinking_level") {
				if (input.activeProviderId === "hadyancode") {
					input.setHadyanCodeModelSelected(0);
					input.setStep("hadyancode_model");
				} else {
					input.setStep("model_picker");
					input.loadModelsForProvider(input.activeProviderId);
				}
			}
			return;
		}

		if (input.step === "oauth_pending") {
			if (key.name === "d" && input.oauthProvider === "hadyancode") {
				input.abortOAuth();
				input.resetAuth();
				input.startDeviceCodeFlow("hadyancode");
			}
			return;
		}

		if (input.step === "device_code") return;

		if (input.step === "hadyancode_pass_subscription") {
			const total = input.hadyancodePassSubscriptionOptions.length;
			if (total === 0) return;
			if (key.name === "up" || (key.ctrl && key.name === "p")) {
				input.setHadyanCodePassSubscriptionSelected((s) =>
					s <= 0 ? total - 1 : s - 1,
				);
				return;
			}
			if (key.name === "down" || (key.ctrl && key.name === "n")) {
				input.setHadyanCodePassSubscriptionSelected((s) =>
					s >= total - 1 ? 0 : s + 1,
				);
				return;
			}
			if (key.name === "return" || key.name === "enter") {
				const option =
					input.hadyancodePassSubscriptionOptions[
						Math.min(input.hadyancodePassSubscriptionSelected, total - 1)
					];
				if (!option) return;
				if (option.value === "subscribe") {
					input.openHadyanCodePassSubscriptionPage();
				} else if (option.value === "refresh") {
					if (input.hadyancodePassSubscriptionStatus !== "loading") {
						input.refreshHadyanCodePassSubscriptionStatus();
					}
				} else if (option.value === "skip") {
					input.continueFromHadyanCodePassSubscription();
				} else if (option.value === "back") {
					input.setStep("menu");
					input.setMenuSelected(0);
				}
			}
			return;
		}

		if (input.step === "menu") {
			if (key.name === "up") {
				input.setMenuSelected((s) =>
					s <= 0 ? input.menuOptions.length - 1 : s - 1,
				);
				return;
			}
			if (key.name === "down") {
				input.setMenuSelected((s) =>
					s >= input.menuOptions.length - 1 ? 0 : s + 1,
				);
				return;
			}
			if (key.name === "return") {
				const option = input.menuOptions[input.menuSelected];
				if (!option) return;
				if (isOnboardingOAuthProviderId(option.value)) {
					input.startOAuthFlow(option.value);
				} else {
					input.setStep("byo_provider");
				}
			}
			return;
		}

		if (input.step === "byo_provider") {
			if (key.name === "up" || (key.ctrl && key.name === "p")) {
				input.providerList.moveUp();
				return;
			}
			if (key.name === "down" || (key.ctrl && key.name === "n")) {
				input.providerList.moveDown();
				return;
			}
			if (key.name === "return") {
				const item = input.providerList.selectedItem;
				if (item) input.selectProvider(item.key);
			}
			return;
		}

		if (input.step === "codex_cli_setup") {
			if (key.name === "r") {
				input.refreshCodexCliStatus();
				return;
			}
			if (key.name === "return") {
				input.saveCodexCliConfig();
			}
			return;
		}

		if (input.step === "byo_apikey") {
			if (key.name === "tab") {
				const visible = FIELD_ORDER.filter(
					(k) => input.byoFields[k] !== undefined,
				);
				if (visible.length > 1) {
					const idx = visible.indexOf(input.byoFocusedField);
					const nextIdx = key.shift
						? (idx - 1 + visible.length) % visible.length
						: (idx + 1) % visible.length;
					const next = visible[nextIdx];
					if (next) input.setByoFocusedField(next as ProviderConfigFieldKey);
				}
			}
			return;
		}

		if (input.step === "hadyancode_model") {
			const total = input.hadyancodeEntries.length;
			if (total === 0) return;
			if (key.name === "up" || (key.ctrl && key.name === "p")) {
				input.setHadyanCodeModelSelected((s) => (s <= 0 ? total - 1 : s - 1));
				return;
			}
			if (key.name === "down" || (key.ctrl && key.name === "n")) {
				input.setHadyanCodeModelSelected((s) => (s >= total - 1 ? 0 : s + 1));
				return;
			}
			if (key.name === "return") {
				const entry = input.hadyancodeEntries[input.hadyancodeModelSelected];
				if (!entry) return;
				if (entry.kind === "model") {
					input.saveHadyanCodeModelSelection(entry.model.id, entry.model.name);
				} else {
					input.setStep("model_picker");
					input.loadModelsForProvider(input.activeProviderId);
				}
			}
			return;
		}

		if (input.step === "model_picker") {
			if (key.name === "up" || (key.ctrl && key.name === "p")) {
				input.modelList.moveUp();
				return;
			}
			if (key.name === "down" || (key.ctrl && key.name === "n")) {
				input.modelList.moveDown();
				return;
			}
			if (key.name === "return") {
				input.saveModelSelection();
			}
			return;
		}

		if (input.step === "thinking_level") {
			if (key.name === "up" || (key.ctrl && key.name === "p")) {
				input.setThinkingSelected((s) =>
					s <= 0 ? THINKING_LEVELS.length - 1 : s - 1,
				);
				return;
			}
			if (key.name === "down" || (key.ctrl && key.name === "n")) {
				input.setThinkingSelected((s) =>
					s >= THINKING_LEVELS.length - 1 ? 0 : s + 1,
				);
				return;
			}
			if (key.name === "return") {
				const level = THINKING_LEVELS[input.thinkingSelected];
				if (level) input.saveThinkingLevel(level.value);
			}
		}
	});
}
