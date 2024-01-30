import escapeHtml from "escape-html";

export function getWebviewContent(results: Array<{ file: string, line: number, text: string }>, keyword: string) {
    let resultItems = "";

    if (results != null) {
        resultItems = results.map((result, index) => {
            let first_element_active = index == 0
                ? "class=\"active\""
                : ""

            return `
            <div ${first_element_active} file="${escapeHtml(result.file)}" lineNumber="${escapeHtml(result.line.toString())}">
                <b ${first_element_active}>${escapeHtml(result.file)}"</b> (Line ${result.line}): ${escapeHtml(result.text)}
            </div>
        `;
        }).join('');
    }

    return `
    ${head_block}
    <body>
        ${css}
        <input type="text" id="keywordInput" placeholder="Search" value="${keyword}" />
        <h2>Keyword [<span id="keyword">${escapeHtml(keyword)}</span>]</h2>
        <div id="resultItems">${resultItems}</div>
        ${script_block}
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
    </head>
`

const script_block = `
    <script>
        const vscode = acquireVsCodeApi();

        const keywordInput = document.getElementById('keywordInput');
        keywordInput.focus();
        keywordInput.selectionStart = keywordInput.selectionEnd = keywordInput.value.length;
        keywordInput.addEventListener('input', () => {
            vscode.postMessage({ command: 'updateResults', keyword: keywordInput.value });
        });

        const resultItems = document.getElementById('resultItems');
        let activeIndex = 0;

        resultItems.addEventListener('click', (event) => {
            const target = event.target;

            if (target.tagName === 'DIV') {
                const filePath = target.getAttribute('file');
                const lineNumber = target.getAttribute('lineNumber');

                vscode.postMessage({ command: 'openFile', filePath: filePath, lineNumber: lineNumber });
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                const divs = document.querySelectorAll('#resultItems div');
                const activeDiv = document.querySelector('#resultItems div.active');

                if (activeDiv) {
                    activeIndex = Array.from(divs).indexOf(activeDiv);
                    activeDiv.classList.remove('active');
                }

                if (event.key === 'ArrowUp' && activeIndex > 0) {
                    activeIndex--;
                } else if (event.key === 'ArrowDown' && activeIndex < divs.length - 1) {
                    activeIndex++;
                }

                divs[activeIndex].classList.add('active');
                vscode.postMessage({ command: 'arrowKeyPress', key: event.key });
            } else if (event.key === 'Enter') {
                const activeDiv = document.querySelector('#resultItems div.active');

                if (activeDiv) {
                    const filePath = activeDiv.getAttribute('file');
                    const lineNumber = activeDiv.getAttribute('lineNumber');
                    vscode.postMessage({ command: 'openFile', filePath: filePath, lineNumber: lineNumber });
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

    #resultItems {
        color: gray;
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

</style>
    `
