import { render } from "preact"
import { useState } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { linter, Diagnostic } from "@codemirror/lint"
import { parse as parseJson } from "@humanwhocodes/parse-json"

const jsonLinter = linter((view) => {
  const diagnostics: Diagnostic[] = []
  const text = view.state.doc.toString()
  
  try {
    parseJson(text)
  } catch (e) {
    if (e.line && e.column) {
      // Convert line/column to absolute position
      const pos = view.state.doc.line(e.line).from + e.column - 1
      
      // Try to determine the token length for better highlighting
      const lineContent = view.state.doc.line(e.line).text
      const tokenMatch = lineContent.slice(e.column - 1).match(/^[^\s,\[\]{}:]+/)
      const tokenLength = tokenMatch ? tokenMatch[0].length : 1

      diagnostics.push({
        from: pos,
        to: pos + tokenLength,
        severity: "error",
        message: e.message
      })
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
