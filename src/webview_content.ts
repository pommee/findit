import escapeHtml from "escape-html";

export function getWebviewContent(results: Array<{ file: string, line: number, text: string }>, keyword: string) {
    let resultItems;

    if (results == null) {
        resultItems = ""
    } else {
        resultItems = results.map((result) => {
            return `
            <div file="${escapeHtml(result.file)}" lineNumber="${escapeHtml(result.line.toString())}">
                <b>${escapeHtml(result.file)}"</b> (Line ${result.line}): ${escapeHtml(result.text)}
            </div>
        `;
        }).join('');
    }

    return `
    
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Find It Results</title>
    </head>
    <body>
        <input type="text" id="keywordInput" placeholder="Search" value="${keyword}" />
        
        <h2>Keyword '<span id="keyword">${escapeHtml(keyword)}</span>'</h2>
        <div id="resultItems">${resultItems}</div>

        <script>
            const vscode = acquireVsCodeApi();

            const keywordInput = document.getElementById('keywordInput');
            keywordInput.focus()
            keywordInput.selectionStart = keywordInput.selectionEnd = keywordInput.value.length;
            keywordInput.addEventListener('input', () => {
                vscode.postMessage({ command: 'updateResults', keyword: keywordInput.value });
            });

            const resultItems = document.getElementById('resultItems');

            resultItems.addEventListener('click', (event) => {
                const target = event.target;

                if (target.tagName === 'DIV') {
                    const filePath = target.getAttribute('file');
                    const lineNumber = target.getAttribute('lineNumber');

                    vscode.postMessage({ command: 'openFile', filePath: filePath, lineNumber: lineNumber, });
                }
            });
        </script>
    </body>
    </html>

`;
}
