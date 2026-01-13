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
