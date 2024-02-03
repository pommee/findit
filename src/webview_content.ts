import escapeHtml from "escape-html";
import * as vscode from "vscode";
import { readLinesAroundLineNumber } from "./extension";
import { build_file_list } from "./helpers";

export function getWebviewContent(
  results: Array<{
    file: vscode.Uri;
    line: number;
    text: string;
  }>,
  keyword: string,
  panel: vscode.WebviewPanel
) {
  let resultItems = "";
  let codePreviewResultItems = "";

  resultItems = build_file_list(results, 0);

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case "arrowKeyPress":
        try {
          let codePreview = await readLinesAroundLineNumber(
            message.filePath,
            Number(message.lineNumber)
          );
          if (codePreview != null) {
            codePreviewResultItems = codePreview
              .map((result) => {
                return `
                <div class="codePreviewLine">
                  ${escapeHtml(result.text)}
                </div>
              `;
              })
              .join("");
            resultItems = build_file_list(results, message.activeIndex);

            panel.webview.html = html(
              keyword,
              resultItems,
              codePreviewResultItems
            );
          }
        } catch (error: any) {
          console.error(error);
        }
        return;
    }
  }, undefined);

  return html(keyword, resultItems, codePreviewResultItems);
}

function html(
  keyword: string,
  resultItems: string,
  codePreviewResultItems: string
) {
  return `
    ${head_block}
    <body>
        ${css}
        <input type="text" id="keywordInput" placeholder="Search" value="${keyword}" />
        <h2>Keyword [<span id="keyword">${escapeHtml(keyword)}</span>]</h2>
        <div id="resultItems">${resultItems}</div>
        <div id="resultCodePreview">${codePreviewResultItems}</div>
        ${script_block}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

        <script>
        document.querySelectorAll('div.codePreviewLine').forEach(el => {
          hljs.highlightElement(el);
        });
        </script>

    </body>
    </html>

`;
}

export function init() {
  return `
    ${head_block}
    <body>
        ${css}
        <input type="text" id="keywordInput" placeholder="Search" value="" />
        ${script_block}
    </body>
    </html>

`;
}

const head_block = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content = "width=device-width, initial-scale=1.0">
        <title>Find It Results </title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
    </head>
`;

const script_block = `
    <script>
    const vscode = acquireVsCodeApi();

    const keywordInput = document.getElementById("keywordInput");
    keywordInput.focus();
    keywordInput.selectionStart = keywordInput.selectionEnd =
    keywordInput.value.length;
    keywordInput.addEventListener("input", () => {
    vscode.postMessage({ command: "updateResults", keyword: keywordInput.value });
    });

    const resultItems = document.getElementById("resultItems");
    let activeIndex = 0;

    resultItems.addEventListener("click", (event) => {
    const target = event.target;

    if (target.tagName === "DIV") {
        const filePath = target.getAttribute("file");
        const lineNumber = target.getAttribute("lineNumber");

        vscode.postMessage({
        command: "openFile",
        filePath: filePath,
        lineNumber: lineNumber,
        });
    }
    });

    document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const divs = document.querySelectorAll("#resultItems div");
        const activeDiv = document.querySelector("#resultItems div.active");

        if (activeDiv) {
        activeIndex = Array.from(divs).indexOf(activeDiv);
        activeDiv.classList.remove("active");
        }

        if (event.key === "ArrowUp" && activeIndex > 0) {
        activeIndex--;
        } else if (event.key === "ArrowDown" && activeIndex < divs.length - 1) {
        activeIndex++;
        }

        divs[activeIndex].classList.add("active");

        const filePath = divs[activeIndex].getAttribute("file");
        const lineNumber = divs[activeIndex].getAttribute("lineNumber");

        vscode.postMessage({ 
            command: "arrowKeyPress", 
            key: event.key, 
            filePath: filePath,
            lineNumber: lineNumber,
            activeIndex: activeIndex, });
    } else if (event.key === "Enter") {
        const activeDiv = document.querySelector("#resultItems div.active");

        if (activeDiv) {
        vscode.postMessage({
            command: "openFile",
            filePath: filePath,
            lineNumber: lineNumber,
        });
        }
    }
    });
    </script>
`;

const css = `
<style>

    * {
        font-family: monospace, monospace;
    }

    div {
        font-size: 1vw;
    }

    div:hover {
        color: white;
    }

    .active {
        color: white;
    }

    #keywordInput {
        height: 1.5em;
        font-size: 22px;
        margin-top: 20px;
    }

    #resultItems {
        color: gray;
    }

    #resultCodePreview {
      padding-top: 10px;
      padding-bottom: 10px;
      padding-left: 5px;
      padding-right: 5px;
      margin-top: 20px;
    }

    .hljs {
      background-color: #171717;
    }

    .codePreviewLine {
      color: gray;
    }

</style>
    `;
