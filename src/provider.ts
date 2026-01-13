import { TRUNCATION_MARKER } from './config';

type ChatCompletionRequest = {
	model: string;
	messages: Array<{ role: 'system' | 'user'; content: string }>;
};

export type ProviderConfig =
	| { kind: 'cloud'; apiKey: string; modelPriority: string[] }
	| { kind: 'local'; baseUrl: string; model: string };

export class ProviderError extends Error {
	readonly status?: number;
	constructor(message: string, status?: number) {
		super(message);
		this.status = status;
	}
}

export function isTransientStatus(status: number): boolean {
	return status === 429 || status === 502 || status === 503 || status === 504;
}

export function isAuthOrConfigStatus(status: number): boolean {
	return status === 400 || status === 401 || status === 403;
}

function withTimeout(ms: number): AbortController {
	const controller = new AbortController();
	setTimeout(() => controller.abort(), ms).unref?.();
	return controller;
}

async function postChatCompletion(url: string, apiKey: string | undefined, body: ChatCompletionRequest): Promise<string> {
	const controller = withTimeout(30_000);
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	let res: Response;
	try {
		res = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: controller.signal
		});
	} catch (e) {
		throw new ProviderError(e instanceof Error ? e.message : 'Network error');
	}

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new ProviderError(`API Error: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`, res.status);
	}

	const data = (await res.json()) as unknown;
	const obj = data as { choices?: Array<{ message?: { content?: unknown } }> };
	const content = obj.choices?.[0]?.message?.content;
	if (typeof content !== 'string' || content.trim().length === 0) {
		throw new ProviderError('API Error: Empty response content');
	}
	return content.trim();
}

export async function generateCommitMessage(provider: ProviderConfig, systemPrompt: string, boundedDiff: string): Promise<string> {
	const userContent = `Diff:\n${boundedDiff || TRUNCATION_MARKER}`;

	if (provider.kind === 'local') {
		const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
		return await postChatCompletion(url, undefined, {
			model: provider.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent }
			]
		});
	}

	const url = 'https://api.mistral.ai/v1/chat/completions';
	let lastErr: ProviderError | undefined;

	for (const model of provider.modelPriority) {
		try {
			return await postChatCompletion(url, provider.apiKey, {
				model,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userContent }
				]
			});
		} catch (e) {
			const err = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : 'Provider error');
			lastErr = err;
			if (err.status !== undefined) {
				if (isAuthOrConfigStatus(err.status)) {
					throw err;
				}
				if (!isTransientStatus(err.status)) {
					throw err;
				}
				continue;
			}
			// Network/timeout: treat as transient and try next model.
			continue;
		}
	}

	throw lastErr ?? new ProviderError('All AI models failed.');
}
