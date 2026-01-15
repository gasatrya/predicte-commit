export type PredicteCommitConfig = {
  provider: string;
  models: string[];
  ignoredFiles: string[];
  useLocal: boolean;
  localBaseUrl: string;
  localModel: string;
  debugLogging: boolean;
};
