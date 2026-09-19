# HadyanCode API

The HadyanCode extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/hadyancode.d.ts` to your extension's source directory.
2. Include `hadyancode.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const hadyancodeExtension = vscode.extensions.getExtension<HadyanCodeAPI>("saoudrizwan.claude-dev")

    if (!hadyancodeExtension?.isActive) {
    	throw new Error("HadyanCode extension is not activated")
    }

    const hadyancode = hadyancodeExtension.exports

    if (hadyancode) {
    	// Now you can use the API

    	// Start a new task with an initial message
    	await hadyancode.startNewTask("Hello, HadyanCode! Let's make a new project...")

    	// Start a new task with an initial message and images
    	await hadyancode.startNewTask("Use this design language", ["data:image/webp;base64,..."])

    	// Send a message to the current task
    	await hadyancode.sendMessage("Can you fix the @problems?")

    	// Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
    	await hadyancode.pressPrimaryButton()

    	// Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
    	await hadyancode.pressSecondaryButton()
    } else {
    	console.error("HadyanCode API is not available")
    }
    ```

    **Note:** To ensure that the `saoudrizwan.claude-dev` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "saoudrizwan.claude-dev"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `hadyancode.d.ts` file.
