import * as vscode from 'vscode';

interface Settings {
  [key: string]: any;
}

const disableAutocompleteSettings: Settings = {
  'editor.quickSuggestions': {
    other: false,
    comments: false,
    strings: false,
  },
  'editor.suggest.snippetsPreventQuickSuggestions': false,
  'editor.acceptSuggestionOnEnter': 'off',
  'editor.acceptSuggestionOnCommitCharacter': false,
  'editor.suggestOnTriggerCharacters': false,
  'editor.wordBasedSuggestions': false,
  'editor.autoClosingBrackets': 'never',
  'editor.autoClosingQuotes': 'never',
  'editor.autoSurround': 'never',
  'editor.formatOnPaste': false,
  'editor.formatOnSave': false,
  'editor.formatOnType': false,
  'html.autoClosingTags': false,
  'javascript.autoClosingTags': false,
  'typescript.autoClosingTags': false,
  'auto-close-tag.enableAutoCloseTag': false,
};

export class SettingsManager {
  private static _backupSettings: Settings;
  private static _shouldRemoveWorkspaceSettingsFileOnRestore = false;
  private static _shouldRemoveVscodeDirOnRestore = false;
  private static _settingsFileBackup: Uint8Array;

  private static readonly _WORKSPACE_SETTINGS_FILE_NAME = '/.vscode/settings.json';
  private static readonly _VSCODE_DIR_NAME = '/.vscode';

  public static async disableAutocomplete() {
    const vscodeSettings = await vscode.workspace.getConfiguration('');
    this._backupSettings = {};

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(this._getVscodeDirName));
    } catch {
      this._shouldRemoveVscodeDirOnRestore = true;
    }

    if (!this._shouldRemoveVscodeDirOnRestore) {
      try {
        this._settingsFileBackup = await vscode.workspace.fs.readFile(
          vscode.Uri.file(this._getWorkspaceSettingsFileName),
        );
      } catch {
        this._shouldRemoveWorkspaceSettingsFileOnRestore = true;
      }
    }

    await Promise.all(
      Object.keys(disableAutocompleteSettings)
        .filter((key) => vscodeSettings.get(key))
        .map((key) => {
          this._backupSettings[key] = vscodeSettings.get(key);

          return vscodeSettings.update(
            key,
            disableAutocompleteSettings[key],
            vscode.ConfigurationTarget.Workspace,
          );
        }),
    );
  }

  public static async restore() {
    const vscodeSettings = vscode.workspace.getConfiguration('');

    await Promise.all(
      Object.keys(this._backupSettings).map((key) =>
        vscodeSettings.update(key, this._backupSettings[key]),
      ),
    );

    if (this._shouldRemoveVscodeDirOnRestore) {
      return vscode.workspace.fs.delete(vscode.Uri.file(this._getVscodeDirName), {
        recursive: true,
      });
    }

    if (this._shouldRemoveWorkspaceSettingsFileOnRestore) {
      return vscode.workspace.fs.delete(vscode.Uri.file(this._getWorkspaceSettingsFileName));
    }

    if (this._settingsFileBackup) {
      return vscode.workspace.fs.writeFile(
        vscode.Uri.file(this._getWorkspaceSettingsFileName),
        this._settingsFileBackup,
      );
    }
  }

  private static get _getWorkspaceSettingsFileName() {
    return vscode.workspace.rootPath + this._WORKSPACE_SETTINGS_FILE_NAME;
  }

  private static get _getVscodeDirName() {
    return vscode.workspace.rootPath + this._VSCODE_DIR_NAME;
  }
}
