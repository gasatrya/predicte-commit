import { ProviderError } from './errors';

type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
};

function withTimeout(ms: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller;
}

export async function postChatCompletion(
  url: string,
  apiKey: string | undefined,
  body: ChatCompletionRequest,
): Promise<string> {
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
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        throw new ProviderError(`Request timed out after 30s connecting to ${url}`);
      }
      const cause = (e as any).cause;
      if (cause?.code === 'ECONNREFUSED' || cause?.message?.includes('ECONNREFUSED')) {
        throw new ProviderError(`Connection refused to ${url}. Is the server running?`);
      }
      if (cause?.code === 'ENOTFOUND' || cause?.message?.includes('ENOTFOUND')) {
        throw new ProviderError(`Address not found: ${url}. Check your settings.`);
      }
      throw new ProviderError(`Network error: ${e.message}`);
    }
    throw new ProviderError('Network error');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(
      `API Error: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`,
      res.status,
    );
  }

  const data = (await res.json()) as unknown;
  const obj = data as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = obj.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new ProviderError('API Error: Empty response content');
  }
  return content.trim();
}
