import * as vscode from 'vscode';
import { deserializeFrame } from './deserialize';
import { SerializedFrame } from './models/serialized';
import { Frame } from './models/frame';

const DEFAULT_RELATIVE_PATH = '/.coding-recording';
const DEFAULT_RELATIVE_FILENAME = DEFAULT_RELATIVE_PATH + '/recording.json';

export class FileActions {
  public static async save(frames: Frame[]) {
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.file(vscode.workspace.rootPath + DEFAULT_RELATIVE_PATH),
    );

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(vscode.workspace.rootPath + DEFAULT_RELATIVE_FILENAME),
      saveLabel: 'Save your coding',
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(frames), 'utf8'));

      vscode.window.showInformationMessage('Saved!');
    }
  }

  public static async open(): Promise<Frame[] | null> {
    const fileUri = await vscode.window.showOpenDialog({
      defaultUri: vscode.Uri.file(vscode.workspace.rootPath + DEFAULT_RELATIVE_FILENAME),
      openLabel: 'Open JSON with a coding record',
    });

    if (!fileUri) {
      return null;
    }

    const framesUint8Array = await vscode.workspace.fs.readFile(fileUri[0]);

    const serializedFrames = JSON.parse(
      Buffer.from(framesUint8Array).toString('utf8'),
    ) as SerializedFrame[];

    const frames = serializedFrames.map(deserializeFrame);

    return frames;
  }
}
