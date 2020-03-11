import * as vscode from 'vscode';
import { Frame } from './models/frame';
import { FileActions } from './file-actions';

export class Recorder {
  private _frames: Frame[];
  private _disposables: vscode.Disposable[] = [];
  private _startTimeMs: number;
  private _lastEventTimeMs: number;

  public static start(context: vscode.ExtensionContext) {
    return () => {
      context.subscriptions.push(new Recorder(context));
    };
  }

  constructor(private _context: vscode.ExtensionContext) {
    this._frames = [];

    vscode.workspace.onDidChangeTextDocument(
      this._onDidChangeTextDocument,
      this,
      this._disposables,
    );

    vscode.window.onDidChangeTextEditorSelection(
      this._onDidChangeTextEditorSelection,
      this,
      this._disposables,
    );

    vscode.window.onDidChangeActiveTextEditor(
      this._onDidChangeActiveTextEditor,
      this,
      this._disposables,
    );

    // ToDo:
    // onDidChangeTextEditorVisibleRanges

    this._startTimeMs = Date.now();
    this._lastEventTimeMs = this._startTimeMs;

    this._addStartingSnapshot();

    this._disposables.push(
      vscode.commands.registerCommand('coding-recording.saveRecording', () =>
        this._saveRecording(),
      ),
    );

    vscode.window.showInformationMessage('Recording has started...');
  }

  public dispose() {
    if (this._disposables) {
      vscode.Disposable.from(...this._disposables).dispose();
    }
  }

  private _addStartingSnapshot() {
    const textEditor = vscode.window.activeTextEditor;

    if (!textEditor) {
      return;
    }

    this._frames.push({
      fileRelativePath: vscode.workspace.asRelativePath(textEditor?.document.uri.path || ''),
      selections: textEditor && textEditor.selections,
      timeSinceLastEvent: 0,
    });
  }

  private _timeSinceLastEvent() {
    const nowMs = Date.now();
    const timeSinceLastEvent = nowMs - this._lastEventTimeMs;
    this._lastEventTimeMs = nowMs;

    return timeSinceLastEvent;
  }

  private _removeSelfFromDisposables() {
    const indexSelf = this._context.subscriptions.indexOf(this);

    if (indexSelf !== -1) {
      this._context.subscriptions.splice(indexSelf, 1);
    }
  }

  private _onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
    this._frames.push({
      changes: e.contentChanges.slice(),
      content: vscode.window.activeTextEditor?.document.getText(),
      timeSinceLastEvent: this._timeSinceLastEvent(),
    });
  }

  private _onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
    this._frames.push({
      selections: e.selections.slice() || [],
      timeSinceLastEvent: this._timeSinceLastEvent(),
    });
  }

  private _onDidChangeActiveTextEditor(textEditor: vscode.TextEditor | undefined) {
    this._frames.push({
      fileRelativePath: vscode.workspace.asRelativePath(textEditor?.document.uri.path || ''),
      selections: textEditor && textEditor.selections,
      timeSinceLastEvent: this._timeSinceLastEvent(),
    });
  }

  private async _saveRecording() {
    await FileActions.save(this._frames);

    this.dispose();
    this._removeSelfFromDisposables();
  }
}
