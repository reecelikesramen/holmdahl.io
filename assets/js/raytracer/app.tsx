import { render } from "preact"
import { useState, useEffect } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
import { json5, json5ParseLinter } from "codemirror-json5"
import { linter, Diagnostic } from "@codemirror/lint"
import * as JSON5 from "json5"

// const jsonLinter = linter((view) => {
//   const diagnostics: Diagnostic[] = []
//   const text = view.state.doc.toString()
  
//   try {
//     JSON5.parse(text)
//   } catch (e) {
//     if (e.lineNumber && e.columnNumber) {
//       // Convert line/column to absolute position
//       const pos = view.state.doc.line(e.lineNumber).from + e.columnNumber - 1
      
//       // Try to determine the token length for better highlighting
//       const lineContent = view.state.doc.line(e.lineNumber).text
//       const tokenMatch = lineContent.slice(e.columnNumber - 1).match(/^[^\s,\[\]{}:]+/)
//       const tokenLength = tokenMatch ? tokenMatch[0].length : 1

//       diagnostics.push({
//         from: pos,
//         to: pos + tokenLength,
//         severity: "error",
//         message: `${e.message} (line ${e.lineNumber}, column ${e.columnNumber})`
//       })
//     }
//   }
//   return diagnostics
// })

function JsonEditor() {
  const [value, setValue] = useState('{\n  "hello": "world"\n}')
  const [theme, setTheme] = useState(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const handleStorageChange = () => {
      setTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light')
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto" }}>
      <h2>JSON Editor</h2>
      <CodeMirror
        value={value}
        height="400px"
        extensions={[json5(), linter(json5ParseLinter())]}
        onChange={(val) => setValue(val)}
        theme={theme}
      />
       <pre style={{ marginTop: "20px" }}>
         {(() => {
           try {
             return JSON.stringify(JSON5.parse(value), null, 2)
           } catch (e) {
             return `Invalid JSON: ${e.message}`
           }
         })()}
       </pre>
     </div>
   )
 }

 render(<JsonEditor />, document.getElementById("editor")!)
