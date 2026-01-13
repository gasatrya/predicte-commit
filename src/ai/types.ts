export type GenerateRequest = {
	systemPrompt: string;
	userPrompt: string;
};

export type GenerateResult = {
	text: string;
	providerId: string;
	model?: string;
};

export interface ProviderClient {
	readonly id: string;
	generate(req: GenerateRequest): Promise<GenerateResult>;
}
