import * as path from 'path';

export function toRepoRelativePosixPath(repoRootFsPath: string, fileFsPath: string): string {
	const rel = path.relative(repoRootFsPath, fileFsPath);
	return rel.split(path.sep).join('/');
}
