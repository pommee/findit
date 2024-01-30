import * as vscode from 'vscode';
import * as fs from 'fs';
import { getWebviewContent } from './webview_content';

let keyword = ""

async function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('findit.find', async () => {
		const panel = vscode.window.createWebviewPanel(
			'findItResults',
			'Find It Results',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		);

		panel.webview.html = getWebviewContent([], "");

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'updateResults':
						keyword = message.keyword

						searchAndUpdateResults(message.keyword, panel.webview)
						return;
					case 'openFile':
						if (message.filePath) {
							openFile(message.filePath, message.lineNumber)
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

async function searchAndUpdateResults(keyword: string, webview: vscode.Webview) {
	const files = await vscode.workspace.findFiles('**/*');
	const results = [];

	for (const file of files) {
		const fileBuffer = fs.readFileSync(file.fsPath);

		if (isBinaryBuffer(fileBuffer)) {
			continue;
		}

		try {
			const fileResults = await searchInFile(file, keyword);
			results.push(...fileResults);
		} catch (error) {
		}
	}

	updateWebviewContent(results, webview);
	return results;
}

function updateWebviewContent(results: Array<{ file: string, line: number, text: string }>, webview: vscode.Webview) {
	webview.html = getWebviewContent(results, keyword);
}

function isBinaryBuffer(buffer: Buffer): boolean {
	const nullBytes = buffer.toString('ascii').split('\0').length - 1;
	const totalBytes = buffer.length;
	const ratio = nullBytes / totalBytes;

	return ratio > 0.2;
}

async function searchInFile(fileUri: vscode.Uri, keyword: string): Promise<Array<{ file: string, line: number, text: string }>> {
	const results: Array<{ file: string, line: number, text: string }> = [];

	const document = await vscode.workspace.openTextDocument(fileUri);

	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i).text;

		if (line.includes(keyword)) {
			results.push({
				file: fileUri.fsPath,
				line: i + 1,
				text: line.trim(),
			});
		}
	}

	return results;
}

function openFile(filePath: string, lineNumber: number) {
	vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then((doc) => {
		vscode.window.showTextDocument(doc).then((editor) => {
			if (lineNumber) {
				const position = new vscode.Position(lineNumber - 1, 0);
				editor.selection = new vscode.Selection(position, position);
				editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
			}
		});
	});
}

module.exports = {
	activate
};

