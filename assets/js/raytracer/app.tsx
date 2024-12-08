import { render } from "preact"
import { useState, useEffect } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
import { json5, json5ParseLinter } from "codemirror-json5"
import { linter, Diagnostic } from "@codemirror/lint"
import * as JSON5 from "json5"
import defaultScene from "./scenes/cornell_room_quad.json?raw"
import init, { RayTracer, initThreadPool } from "./pkg/raytracer_wasm.js"
import { threads } from "wasm-feature-detect"

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

function RaytracerApp() {
  const [sceneCode, setSceneCode] = useState(defaultScene)
  const [theme, setTheme] = useState(localStorage.getItem('pref-theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.body.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // Initial check
    checkTheme()
    
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto" }}>
      <h2>JSON Editor</h2>
      <CodeMirror
        value={sceneCode}
        height="400px"
        extensions={[json5(), linter(json5ParseLinter())]}
        onChange={(val) => {
					try {
						let json = JSON5.parse(val)
						setSceneCode(JSON5.stringify(json, null, 2))
					} catch (e) {
						console.error(e)
					}
				}}
        theme={theme}
      />
       <pre style={{ marginTop: "20px" }}>
         {(() => {
           try {
             return JSON.stringify(JSON5.parse(sceneCode), null, 2)
           } catch (e) {
             return `Invalid JSON: ${e.message}`
           }
         })()}
       </pre>
     </div>
   )
 }

 render(<RaytracerApp />, document.getElementById("app")!)
