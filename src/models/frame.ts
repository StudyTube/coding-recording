import * as vscode from 'vscode';

export interface Frame {
  timeSinceLastEvent: number;
  selections?: vscode.Selection[];
  changes?: vscode.TextDocumentContentChangeEvent[];
  content?: string;
  fileRelativePath?: string;
}
