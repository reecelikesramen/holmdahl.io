import { render } from "preact"
 import { useState } from "preact/hooks"
 import CodeMirror from "@uiw/react-codemirror"
 import { json } from "@codemirror/lang-json"

 function JsonEditor() {
   const [value, setValue] = useState('{\n  "hello": "world"\n}')

   return (
     <div style={{ maxWidth: "800px", margin: "20px auto" }}>
       <h2>JSON Editor</h2>
       <CodeMirror
         value={value}
         height="400px"
         extensions={[json()]}
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