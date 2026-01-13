import { postChatCompletion } from '../../ai/http';
import type { GenerateRequest, GenerateResult, ProviderClient } from '../../ai/types';
import { registerProvider } from '../../ai/registry';

export class LocalProvider implements ProviderClient {
  readonly id = 'local';

  constructor(private readonly baseUrl: string, private readonly model: string) {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const text = await postChatCompletion(url, undefined, {
      model: this.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
    });
    return { text, providerId: this.id, model: this.model };
  }
}

registerProvider({
  id: 'local',
  label: 'Local (Ollama)',
  create: async (_context, config) => {
    return new LocalProvider(config.localBaseUrl, config.localModel);
  },
});
