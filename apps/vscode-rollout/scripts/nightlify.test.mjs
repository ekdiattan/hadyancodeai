import { describe, expect, it } from "bun:test";
import { nightlifyPackageJson } from "./nightlify.mjs";

const fixture = {
	name: "claude-dev",
	displayName: "HadyanCode",
	publisher: "saoudrizwan",
	version: "4.0.0",
	main: "./dist/extension.js",
	contributes: {
		viewsContainers: {
			activitybar: [
				{
					id: "claude-dev-ActivityBar",
					title: "HadyanCode",
					icon: "assets/icon.svg",
				},
			],
		},
		views: {
			"claude-dev-ActivityBar": [
				{ type: "webview", id: "claude-dev.SidebarProvider" },
			],
		},
		commands: [{ command: "hadyancode.plusButtonClicked", title: "New Task" }],
		keybindings: [{ command: "hadyancode.addToChat", key: "ctrl+'" }],
		menus: {
			"view/title": [
				{
					command: "hadyancode.plusButtonClicked",
					when: "view == claude-dev.SidebarProvider",
				},
				// Mid-string references are NOT rewritten — a known limitation
				// shared with the standalone nightly's publish-nightly.mjs.
				{ command: "hadyancode.addToChat", when: "config.hadyancode.enableExtras" },
			],
		},
		configuration: {
			title: "HadyanCode",
			properties: { "hadyancode.enableExtras": { type: "boolean" } },
		},
	},
};

describe("nightlifyPackageJson", () => {
	const pkg = JSON.parse(
		nightlifyPackageJson(JSON.stringify(fixture, null, "\t"), "4.0.1752600000"),
	);

	it("sets the nightly identity and the supplied version", () => {
		expect(pkg.name).toBe("hadyancode-nightly");
		expect(pkg.displayName).toBe("HadyanCode (Nightly)");
		expect(pkg.version).toBe("4.0.1752600000");
		expect(pkg.publisher).toBe("saoudrizwan");
	});

	it("rewrites claude-dev IDs and the hadyancode.* namespace", () => {
		expect(pkg.contributes.viewsContainers.activitybar[0].id).toBe(
			"hadyancode-nightly-ActivityBar",
		);
		expect(pkg.contributes.viewsContainers.activitybar[0].title).toBe(
			"HadyanCode (Nightly)",
		);
		expect(Object.keys(pkg.contributes.views)).toEqual([
			"hadyancode-nightly-ActivityBar",
		]);
		expect(pkg.contributes.views["hadyancode-nightly-ActivityBar"][0].id).toBe(
			"hadyancode-nightly.SidebarProvider",
		);
		expect(pkg.contributes.commands[0].command).toBe(
			"hadyancode-nightly.plusButtonClicked",
		);
		expect(pkg.contributes.keybindings[0].command).toBe(
			"hadyancode-nightly.addToChat",
		);
		expect(Object.keys(pkg.contributes.configuration.properties)).toEqual([
			"hadyancode-nightly.enableExtras",
		]);
	});

	it("rewrites when-clauses that start with a rewritten ID, but not mid-string references", () => {
		const [gated, midString] = pkg.contributes.menus["view/title"];
		expect(gated.when).toBe("view == hadyancode-nightly.SidebarProvider");
		// Documented limitation: `config.hadyancode.` does not match the `"hadyancode.`
		// pattern, so it survives unrewritten (matches publish-nightly.mjs).
		expect(midString.when).toBe("config.hadyancode.enableExtras");
	});

	it("requires a version", () => {
		expect(() => nightlifyPackageJson("{}", undefined)).toThrow(/version/);
	});
});
