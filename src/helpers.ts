import escapeHtml from "escape-html";
import * as vscode from "vscode";

export function build_file_list(
  results: Array<{
    file: vscode.Uri;
    line: number;
    text: string;
  }>,
  activeIndex: number
) {
  let resultItems = "";

  if (results != null) {
    resultItems = results
      .map((result, index) => {
        const isActive = index === activeIndex ? "active" : "";
        return `
          <div class="${isActive}" 
          file="${escapeHtml(result.file.fsPath)}" 
          lineNumber="${escapeHtml(result.line.toString())}">
          <b>
          ${escapeHtml(result.file.fsPath)}
          </b> 
          (Line ${result.line}): ${escapeHtml(result.text)}
          </div>
      `;
      })
      .join("");
  }

  return resultItems;
}
