import * as vscode from "vscode";
import * as fs from "fs";
import { getWebviewContent, init } from "./webview_content";

let keyword = "";

async function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("findit.find", async () => {
    const panel = vscode.window.createWebviewPanel(
      "findItResults",
      "Find It Results",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = init();

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "updateResults":
            keyword = message.keyword;
            searchAndUpdateResults(message.keyword, panel);
            return;
          case "openFile":
            if (message.filePath) {
              openFile(message.filePath, message.lineNumber);
            }
            return;
        }
      },
      undefined,
      context.subscriptions
    );

    context.subscriptions.push(panel);
  });

  context.subscriptions.push(disposable);
}

export async function searchAndUpdateResults(
  keyword: string,
  panel: vscode.WebviewPanel
) {
  const files = await vscode.workspace.findFiles("**/*");
  const results = [];

  for (const file of files) {
    const fileBuffer = fs.readFileSync(file.fsPath);

    if (isBinaryBuffer(fileBuffer)) {
      continue;
    }

    try {
      const fileResults = await searchInFile(file, keyword);
      results.push(...fileResults);
    } catch (error) {}
  }

  updateWebviewContent(results, panel);
  return results;
}

function updateWebviewContent(
  results: Array<{ file: vscode.Uri; line: number; text: string }>,
  panel: vscode.WebviewPanel
) {
  panel.webview.html = getWebviewContent(results, keyword, panel);
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const nullBytes = buffer.toString("ascii").split("\0").length - 1;
  const totalBytes = buffer.length;
  const ratio = nullBytes / totalBytes;

  return ratio > 0.2;
}

async function searchInFile(
  fileUri: vscode.Uri,
  keyword: string
): Promise<Array<{ file: vscode.Uri; line: number; text: string }>> {
  const results: Array<{ file: vscode.Uri; line: number; text: string }> = [];

  const document = await vscode.workspace.openTextDocument(fileUri);

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;

    if (line.includes(keyword)) {
      results.push({
        file: fileUri,
        line: i + 1,
        text: line.trim(),
      });
    }
  }

  return results;
}

export async function readLinesAroundLineNumber(
  fileUri: string,
  lineNumber: number
): Promise<Array<{ line: number; text: string }>> {
  const results: Array<{ line: number; text: string }> = [];

  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(fileUri)
  );

  for (let i = lineNumber - 5; i < lineNumber; i++) {
    if (i >= 0) {
      const line = document.lineAt(i).text;

      results.push({
        line: i + 1,
        text: line,
      });
    }
  }

  for (let i = lineNumber + 1; i <= lineNumber + 5; i++) {
    if (i < document.lineCount) {
      const line = document.lineAt(i).text;

      results.push({
        line: i + 1,
        text: line,
      });
    }
  }

  return results;
}

export function openFile(filePath: string, lineNumber: number) {
  vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then((doc) => {
    vscode.window.showTextDocument(doc).then((editor) => {
      if (lineNumber) {
        const position = new vscode.Position(lineNumber - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    });
  });
}

module.exports = {
  activate,
};
