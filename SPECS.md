# Product Spec: Mistral Commit VS Code Extension

**Version:** 1.1

## Core Concept

A privacy-focused, "Anti-Copilot" extension that generates git commit messages from staged changes using Mistral AI's free tier.

---

## 1. User Experience (UX)

### The Workflow

**Stage Changes:** User adds files to the "Staged Changes" list in VS Code.

**Trigger:**

- **Primary:** Click the "Sparkle" icon in the Source Control Management (SCM) title bar.
- **Secondary:** Command Palette > Mistral Commit: Generate Message.

**Repo Selection (Multi-Root Support):**

- If triggered via SCM button: Automatically targets that specific repo.
- If triggered via Command Palette:
  - Defaults to the repo containing the currently active file.
  - If ambiguous (no file open, multiple repos), prompts user to select a repo via Quick Pick.

**Processing:**

1. Extension shows "Generating..." status.
2. Extension filters out ignored files (e.g., package-lock.json) to prevent token bloat.
3. Extension builds a bounded diff payload (caps + truncation markers).
4. Extension calls the configured AI provider (cloud or local), attempting models in priority order as needed.

**Output:**

- The generated message is typed directly into the SCM Input Box for the correct repo.
- User reviews and commits.

### Edge Cases (The "Unhappy Path")

| Case                     | Behavior                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| No API Key / Invalid Key | Notification with actions: "Set Mistral Key" and "Open Settings"                                                        |
| Nothing Staged           | Info notification: "No staged changes found in [Repo Name]."                                                            |
| Monster Diff             | If the filtered diff is still too large, apply truncation policy (per-file + total caps) and include truncation markers |
| API Failure              | If all models in the chain fail due to transient/unreachable errors, show error: "Mistral API unreachable."             |

---

## 2. Technical Architecture

### A. Data Flow (Filter-First Strategy)

1. **Identify Repository:** Resolve target repo using the Selection Logic (Context > Active Editor > QuickPick).
2. **Get Staged Resources:** Retrieve `repository.state.indexChanges`.
3. **The "Ignore" Filter:**
   - Iterate through staged files
   - Convert each file URI to a **repo-relative, POSIX-normalized** path
   - Check repo-relative paths against `predicteCommit.ignoredFiles` using minimatch
   - Result: A clean list of files (e.g., keeps index.js, drops package-lock.json)
4. **Fetch Diffs:** Retrieve staged diffs only for the allowed files.
5. **Bound Payload:** Apply truncation caps (per-file + total) and add truncation markers if needed.
6. **Construct Payload:** Combine the bounded diff with the System Prompt.

```typescript
// 1. Get all staged files
const stagedResources = repository.state.indexChanges;

// 2. Filter ignored files using minimatch
import { minimatch } from 'minimatch';
import * as path from 'path';

const ignorePatterns = vscode.workspace
  .getConfiguration('predicteCommit')
  .get<string[]>('ignoredFiles', []);

function toRepoRelativePosixPath(repoRootFsPath: string, fileFsPath: string): string {
  const rel = path.relative(repoRootFsPath, fileFsPath);
  return rel.split(path.sep).join('/');
}

const validResources = stagedResources.filter((resource) => {
  const filePathRel = toRepoRelativePosixPath(repository.rootUri.fsPath, resource.uri.fsPath);
  return !ignorePatterns.some((pattern) => minimatch(filePathRel, pattern, { matchBase: true }));
});

// 3. Get diffs ONLY for valid files
const diffs = await Promise.all(
  validResources.map(async (resource) => {
    return await getStagedDiff(repository, resource.uri);
  }),
);

const fullDiff = diffs.join('\n');

// 4. Apply truncation caps before sending to the provider
const boundedDiff = applyDiffCaps(fullDiff);
```

**Staged Diff Retrieval (Robust Strategy):**

- Prefer using the VS Code Git extension API to retrieve diffs when available.
- If the API does not support per-file staged diffs reliably in the current environment, fallback to running:
  - `git diff --cached -- <repo-relative-path>`

This avoids relying on a single method signature (which can vary) and handles `fsPath` vs `path` differences across platforms.

### B. The "Smart Switch" AI Client

The client iterates through a priority list to handle rate limits or free-tier unavailability.

**Endpoint:** `https://api.mistral.ai/v1/chat/completions`

**Priority Chain (Default):**

1. `devstral-latest` (Primary: Newest free research model)
2. `devstral-small-latest` (Fallback 1: Faster, lighter)

**Retry Logic:**

1. Try each model in order.
2. If transient failure (HTTP `429, 502, 503, 504` or network/timeout) -> Log warning, try next model.
3. If auth/config failure (HTTP `401/403` invalid/missing key, or HTTP `400` bad request) -> Surface actionable error (do not continue model chain).
4. If all models fail due to transient errors -> Throw error.

```typescript
// Define your priority list
const MODEL_PRIORITY = predicteCommit.modelPriority;

async function generateCommitMessageWithFallback(diff: string, apiKey: string) {
  let lastError = null;

  for (const modelId of MODEL_PRIORITY) {
    try {
      console.log(`Trying model: ${modelId}...`);
      const message = await callMistralApi(modelId, diff, apiKey);
      return message;
    } catch (error) {
      console.warn(`Model ${modelId} failed:`, error);
      lastError = error;
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError.message}`);
}

async function callMistralApi(model: string, diff: string, apiKey: string) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a git commit message generator...' },
        { role: 'user', content: `Diff:\n${diff}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### C. Local Fallback (Privacy Mode)

- **Trigger:** `predicteCommit.useLocal = true`
- **Base URL:** `http://localhost:11434/v1` (Standard Ollama)
- **Endpoint:** `${predicteCommit.localBaseUrl}/chat/completions`
- **Model:** Uses `predicteCommit.localModel` setting

---

## 3. Configuration (Settings)

Add these to package.json:

| Setting ID                     | Type       | Default                                        | Description                                                  |
| ------------------------------ | ---------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `predicteCommit.modelPriority` | `string[]` | `["devstral-latest", "devstral-small-latest"]` | Order of models to attempt                                   |
| `predicteCommit.ignoredFiles`  | `string[]` | `["*-lock.json", "*.svg", "dist/**"]`          | Glob patterns to exclude from the diff context               |
| `predicteCommit.useLocal`      | `boolean`  | `false`                                        | Use local Ollama instance instead of cloud API               |
| `predicteCommit.localBaseUrl`  | `string`   | `http://localhost:11434/v1`                    | Base URL for local AI provider (POST to `/chat/completions`) |
| `predicteCommit.localModel`    | `string`   | `mistral`                                      | Model name for local usage                                   |

> **Security Note:** API Key is stored in `vscode.SecretStorage`, NOT in `settings.json`.

### Commands

| Command ID                       | Description                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `predicteCommit.generateMessage` | Generate commit message from staged changes                    |
| `predicteCommit.setApiKey`       | Prompt for Mistral API key and store in `vscode.SecretStorage` |

---

## 4. Implementation Details

### Git Service Logic (Multi-Repo Handling)

```typescript
import * as vscode from 'vscode';
import { GitExtension, Repository } from './git'; // Typings

export async function getTargetRepository(
  git: GitExtension,
  contextArg?: any,
): Promise<Repository | undefined> {
  // 1. Context Click (SCM View)
  if (contextArg && contextArg.rootUri) {
    return git
      .getAPI(1)
      .repositories.find((r) => r.rootUri.toString() === contextArg.rootUri.toString());
  }

  // 2. Active Editor
  if (vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri;
    const repo = git.getAPI(1).getRepository(uri);
    if (repo) return repo;
  }

  // 3. Single Repo Default
  if (git.getAPI(1).repositories.length === 1) {
    return git.getAPI(1).repositories[0];
  }

  // 4. Quick Pick (Ambiguous State)
  const repos = git.getAPI(1).repositories;
  if (repos.length > 0) {
    const picked = await vscode.window.showQuickPick(
      repos.map((r) => ({
        label: r.rootUri.fsPath.split('/').pop() || 'Repo',
        repo: r,
      })),
      { placeHolder: 'Select a repository' },
    );
    return picked?.repo;
  }

  return undefined;
}
```

### Writing Output to the Correct SCM Input

- Always set the message on the resolved target repository:
  - `targetRepo.inputBox.value = generatedMessage`

This ensures multi-root setups write to the correct SCM input box.

### Prompt Engineering

**System Prompt:**

> You are an expert developer.
>
> **Task:** Write a concise git commit message for the provided code diff.
>
> **Rules:**
>
> 1. Use the Conventional Commits format (e.g., 'feat: add user login', 'fix: resolve timeout').
> 2. The subject line must be under 50 characters.
> 3. If the diff is complex, add a bulleted body description.
> 4. Do NOT output markdown code blocks. Output ONLY the raw commit message text.
> 5. If the diff is empty or trivial, reply with a short error message.

---

## 5. Payload Bounding / Truncation Policy

To prevent provider payload errors and reduce token usage, apply caps after ignore-filtering:

- **Per-file cap:** e.g. 8,000 characters of diff content per file
- **Total cap:** e.g. 32,000 characters across all included diffs

If truncation occurs, insert an explicit marker:

- `...TRUNCATED...`

When over budget, prefer:

1. Keeping file headers and change context
2. Truncating large hunks while preserving readability

---

## 6. Validation Plan

| Check                   | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Multi-Repo Check        | Open 2 repos. Edit file in Repo B. Click button in Repo A. Ensure message appears in Repo A's box.                |
| Monster Check           | Stage package-lock.json. Verify "Generating..." finishes quickly (proving file was skipped).                      |
| Fallback Check          | Enter an invalid model name as the first item in modelPriority. Ensure extension succeeds using the second model. |
| Auth Failure Check      | Use missing/invalid key. Verify user gets a key-related error and the model chain is not attempted.               |
| Truncation Marker Check | Stage a very large diff. Verify truncation occurs with `...TRUNCATED...` markers and the request still succeeds.  |
| Ignore Matching Check   | Use `dist/**` and `*-lock.json` patterns; confirm matching is against repo-relative POSIX paths.                  |
