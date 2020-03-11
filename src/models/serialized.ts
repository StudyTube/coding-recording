import * as vscode from 'vscode';

export interface SerializedPosition {
  line: number;
  character: number;
}

export interface SerializedChangeEvent {
  range: SerializedPosition[];
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

export interface SerializedSelection {
  start: SerializedPosition;
  end: SerializedPosition;
  active: SerializedPosition;
  anchor: SerializedPosition;
}

export interface SerializedFrame {
  timeSinceLastEvent: number;
  changes?: SerializedChangeEvent[];
  selections?: SerializedSelection[];
  fileName?: string;
  uri?: vscode.Uri;
}
