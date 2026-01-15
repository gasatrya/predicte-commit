export type PredicteCommitConfig = {
  provider: string;
  models: string[];
  ignoredFiles: string[];
  useLocal: boolean;
  localProvider: string;
  localBaseUrl: string;
  localModel: string;
  debugLogging: boolean;
};
