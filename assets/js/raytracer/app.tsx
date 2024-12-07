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
    // Get the line number from the error message
    const match = e.message.match(/at position (\d+)/)
    if (match) {
      const pos = parseInt(match[1])
      diagnostics.push({
        from: pos,
        to: pos + 1,
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
			 {/* Hide output for now */}
       {/* <pre style={{ marginTop: "20px" }}>
         {(() => {
           try {
             return JSON.stringify(JSON.parse(value), null, 2)
           } catch (e) {
             return `Invalid JSON: ${e.message}`
           }
         })()}
       </pre> */}
     </div>
   )
 }

 render(<JsonEditor />, document.getElementById("editor")!)
