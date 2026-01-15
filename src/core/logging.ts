import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Predicte Commit');
  }
  return channel;
}

export function logDebug(enabled: boolean, lines: string[]): void {
  if (!enabled) {
    return;
  }
  const ch = getOutputChannel();
  for (const line of lines) {
    ch.appendLine(line);
  }
}
