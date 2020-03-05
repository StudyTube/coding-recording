import * as vscode from 'vscode';
import {
  SerializedPosition,
  SerializedSelection,
  SerializedChangeEvent,
  SerializedFrame,
} from './models/serialized';
import { Frame } from './models/frame';

function deserializePosition(serialized: SerializedPosition): vscode.Position {
  return new vscode.Position(serialized.line, serialized.character);
}

function deserializeRange([start, stop]: SerializedPosition[]): vscode.Range {
  return new vscode.Range(deserializePosition(start), deserializePosition(stop));
}

function deserializeSelection(serialized: SerializedSelection): vscode.Selection {
  return new vscode.Selection(
    deserializePosition(serialized.anchor),
    deserializePosition(serialized.active),
  );
}

function deserializeChangeEvent(
  serialized: SerializedChangeEvent,
): vscode.TextDocumentContentChangeEvent {
  return {
    ...serialized,
    range: deserializeRange(serialized.range),
  };
}

export function deserializeFrame(serialized: SerializedFrame): Frame {
  return {
    ...serialized,
    changes: serialized.changes && serialized.changes.map(deserializeChangeEvent),
    selections: serialized.selections && serialized.selections.map(deserializeSelection),
  };
}
