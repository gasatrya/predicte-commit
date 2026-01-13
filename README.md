# Predicte Commit

> This extension is for user who doesn't need AI chat app but still want the magic of AI autocomplete.

**Predicte Commit** analyzes your staged changes and generates concise, descriptive commit messages using AI (Mistral or local LLMs).

## Features

- **Zero-Friction**: One click or command to fill your commit message box.
- **Privacy-Aware**: Content filtering and explicit file ignores.
- **Flexible Providers**: Use **Mistral AI** (cloud) or your own **Local Ollama** instance.
- **Smart Truncation**: Automatically handles large diffs to stay within context windows.

## How it works

1. Stage your changes in VS Code's Source Control view.
2. Click the **Sparkle Icon** $(sparkle) in the Source Control title bar (or run "Generate Message").
3. Review the generated commit message in the input box.

## Extension Settings

This extension contributes the following settings:

- `predicteCommit.provider`: Select AI provider (`mistral` or `local`).
- `predicteCommit.ignoredFiles`: Glob patterns to exclude from analysis (e.g. `*-lock.json`, `dist/**`).
- `predicteCommit.modelPriority`: List of Mistral models to try in order (e.g. `codestral-latest`).
- `predicteCommit.localBaseUrl`: URL for local provider (default `http://localhost:11434/v1`).
- `predicteCommit.localModel`: Model name for local provider.

## Requirements

- **Mistral Provider**: Requires a valid API Key. You will be prompted to enter it on first use.
- **Local Provider**: Requires an OpenAI-compatible endpoint (like Ollama) running locally.
