import { minimatch } from 'minimatch';

export function isIgnored(repoRelPosixPath: string, ignorePatterns: string[]): boolean {
	return ignorePatterns.some(pattern => minimatch(repoRelPosixPath, pattern, { matchBase: true }));
}
