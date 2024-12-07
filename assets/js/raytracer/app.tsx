import { render } from "preact"
import { useState } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { linter, Diagnostic } from "@codemirror/lint"

const jsonLinter = linter((view) => {
  const diagnostics: Diagnostic[] = []
  const text = view.state.doc.toString()
  
  try {
    JSON.parse(text)
  } catch (e) {
    // Look for Invalid JSON errors
    console.log(e.message);

    // First try to get position from error message
    let match = e.message.match(/at position (\d+)/)
    if (match) {
      const pos = parseInt(match[1])
      diagnostics.push({
        from: pos,
        to: pos + 1,
        severity: "error",
        message: e.message
      })
    }

    // Then try to extract the problematic token/text
    match = e.message.match(/Unexpected token '(.+?)', ..."(.+?)" is not valid JSON/s)
    if (match) {
      // Try the longer match first (match[2])
			console.log(match)
      let problemText = match[2]
      let pos = problemText ? text.indexOf(problemText) : -1
      
      // Fall back to single token match if needed
      if (pos === -1 && match[1]) {
        problemText = match[1]
        pos = text.indexOf(problemText)
      }

      if (pos !== -1) {
        diagnostics.push({
          from: pos,
          to: pos + problemText.length,
          severity: "error",
          message: `Unexpected token '${problemText}'`
        })
      }
    }
  }
  return diagnostics
})

function JsonEditor() {
  const [value, setValue] = useState('{\n  "hello": "world"\n}')

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto" }}>
      <h2>JSON Editor</h2>
      <CodeMirror
        value={value}
        height="400px"
        extensions={[json(), jsonLinter]}
        onChange={(val) => setValue(val)}
        theme="dark"
      />
       <pre style={{ marginTop: "20px" }}>
         {(() => {
           try {
             return JSON.stringify(JSON.parse(value), null, 2)
           } catch (e) {
             return `Invalid JSON: ${e.message}`
           }
         })()}
       </pre>
     </div>
   )
 }

 render(<JsonEditor />, document.getElementById("editor")!)
