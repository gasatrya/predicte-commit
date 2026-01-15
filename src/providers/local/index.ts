import { postChatCompletion } from '../../ai/http';
import type { GenerateRequest, GenerateResult, ProviderClient } from '../../ai/types';
import { registerProvider } from '../../ai/registry';
import { DEFAULT_LOCAL_URL } from '../../core/constants';

export class LocalProvider implements ProviderClient {
  constructor(
    readonly id: string,
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

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

const createLocalProvider = (id: string, defaultUrl: string) => {
  return async (_context: any, config: any) => {
    let baseUrl = config.localBaseUrl;
    // If the user hasn't changed the URL (it's empty),
    // then use that provider's default.
    // Otherwise (user changed it), use what's in config.
    if (baseUrl === DEFAULT_LOCAL_URL) { // DEFAULT_LOCAL_URL is ''
      baseUrl = defaultUrl;
    }

    const model = config.models.length > 0 ? config.models[0] : config.localModel;
    return new LocalProvider(id, baseUrl, model);
  };
};

registerProvider({
  id: 'ollama',
  label: 'Ollama',
  create: createLocalProvider('ollama', 'http://localhost:11434/v1'),
});

registerProvider({
  id: 'vllm',
  label: 'Local (vLLM)',
  create: createLocalProvider('vllm', 'http://localhost:8000/v1'),
});

registerProvider({
  id: 'lmstudio',
  label: 'Local (LM Studio)',
  create: createLocalProvider('lmstudio', 'http://localhost:1234/v1'),
});
