import * as vscode from 'vscode';
import { Frame } from './models/frame';
import { SettingsManager } from './settings-manager';
import { FileActions } from './file-actions';

export class Player {
  private static _isPaused: boolean;
  private static _isStopped: boolean;
  private static _startTimeMs: number;
  private static _pauseTimeStartMs: number;
  private static _lastOpenedRelativePath: string;

  public static replay() {
    return async () => {
      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showInformationMessage('Please open workspace folder and try again');

        return;
      }

      const frames = await FileActions.open();

      // File were not selected
      if (!frames) {
        return;
      }

      // Disable autocomplete for better performance
      await SettingsManager.disableAutocomplete();
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      this._startTimeMs = Date.now();
      let estimatedCurrentTimeMs = 0;
      this._isPaused = false;
      this._isStopped = false;

      // Show bar with pause/resume/stop actions:
      this._showActionBar();

      // Play recorded frames (actions such as text, selection, open file change)
      for (const frame of frames) {
        if (this._isPaused) {
          await this._waitUntilResumed();
          await this._prepareResumingAfterPause();
        }

        if (this._isStopped) {
          break;
        }

        // Calculate and perform recorded delay to keep time synchronized with original
        estimatedCurrentTimeMs = await this._performRecordedDelay(
          frame.timeSinceLastEvent,
          estimatedCurrentTimeMs,
        );

        // Change selection or text, open file...
        await this._playStep(frame);
      }

      this._isStopped = true;
      await SettingsManager.restore();
      vscode.window.showInformationMessage('Replay has ended...');
    };
  }

  private static async _performRecordedDelay(
    timeSinceLastEvent: number,
    estimatedCurrentTimeMs: number,
  ) {
    const realExecutionTimeMs = Date.now() - this._startTimeMs;
    const delayMs = Math.max(0, timeSinceLastEvent + estimatedCurrentTimeMs - realExecutionTimeMs);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return estimatedCurrentTimeMs + timeSinceLastEvent;
  }

  private static async _prepareResumingAfterPause() {
    // Open last file as focus could be changed during pause
    await this._playStep({
      fileRelativePath: this._lastOpenedRelativePath,
    });

    // Correct start time to take off pause time from the timeline
    this._startTimeMs += Date.now() - this._pauseTimeStartMs;
  }

  private static _waitUntilResumed(): Promise<void> {
    const CHECK_RESUME_INTERVAL_MS = 100;

    return this._isPaused
      ? new Promise((resolve) => setTimeout(resolve, CHECK_RESUME_INTERVAL_MS)).then(() =>
          this._waitUntilResumed(),
        )
      : Promise.resolve();
  }

  private static _showActionBar() {
    if (this._isStopped) {
      return;
    }

    const RESUME_BUTTON = 'Resume';
    const STOP_BUTTON = 'Stop';
    const PAUSE_BUTTON = 'Pause';

    const INFO_MESSAGE_TIMEOUT_MS = 7000;

    const message = this._isPaused
      ? ['Paused...', RESUME_BUTTON, STOP_BUTTON]
      : ['Replaying...', PAUSE_BUTTON, STOP_BUTTON];

    const delayedMessage = setTimeout(this._showActionBar.bind(this), INFO_MESSAGE_TIMEOUT_MS);

    vscode.window.showInformationMessage(message[0], ...message.slice(1)).then((action) => {
      if (action === PAUSE_BUTTON && !this._isStopped) {
        this._isPaused = true;
        this._pauseTimeStartMs = Date.now();
        clearTimeout(delayedMessage);
        this._showActionBar();
      }

      if (action === STOP_BUTTON) {
        this._isPaused = false;
        this._isStopped = true;
        clearTimeout(delayedMessage);
      }

      if (action === RESUME_BUTTON) {
        this._isPaused = false;
        clearTimeout(delayedMessage);
        this._showActionBar();
      }
    });
  }

  private static async _playStep(frame: Partial<Frame>) {
    let textEditor: vscode.TextEditor | undefined;
    const { changes, selections, content, fileRelativePath } = frame;

    if (fileRelativePath) {
      this._lastOpenedRelativePath = fileRelativePath;
      const basePath = vscode.workspace.workspaceFolders![0].uri.path;
      const path = `${basePath}/${fileRelativePath}`;
      const document = await vscode.workspace.openTextDocument(path);
      textEditor = await vscode.window.showTextDocument(document);
    } else {
      textEditor = vscode.window.activeTextEditor;
    }

    if (!textEditor) {
      console.error('Error: cannot locate activeTextEditor');

      return;
    }

    if (changes && changes.length) {
      await this._applyContentChanges(changes, textEditor);
    }

    // This is useful for cases when real content has been modified by some
    // formatter or autocompletion (despite of our try to switch them off)
    if (content && content !== textEditor.document.getText()) {
      await this._updateContent(content, textEditor);
    }

    if (selections && selections.length) {
      this._updateSelections(selections, textEditor);
    }
  }

  private static async _updateContent(content: string, textEditor: vscode.TextEditor) {
    await textEditor.edit((editBuilder) => {
      const lineCount = textEditor.document.lineCount;
      const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lineCount, 0));

      editBuilder.delete(range);
      editBuilder.insert(new vscode.Position(0, 0), content);
    });
  }

  private static _updateSelections(selections: vscode.Selection[], textEditor: vscode.TextEditor) {
    textEditor.selections = selections;

    // Move scroll focus if needed
    const { start, end } = textEditor.selections[0];

    textEditor.revealRange(
      new vscode.Range(start, end),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
  }

  private static _applyContentChanges(
    changes: vscode.TextDocumentContentChangeEvent[],
    textEditor: vscode.TextEditor,
  ) {
    return textEditor.edit((editBuilder) =>
      changes.forEach((change) => this._applyContentChange(change, editBuilder)),
    );
  }

  private static _applyContentChange(
    change: vscode.TextDocumentContentChangeEvent,
    editBuilder: vscode.TextEditorEdit,
  ) {
    if (change.text === '') {
      editBuilder.delete(change.range);
      return;
    }

    if (change.rangeLength === 0) {
      editBuilder.insert(change.range.start, change.text);
      return;
    }

    editBuilder.replace(change.range, change.text);
  }
}
