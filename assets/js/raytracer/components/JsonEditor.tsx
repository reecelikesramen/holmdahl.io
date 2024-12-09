import { useState, useEffect } from "preact/hooks"
import CodeMirror from "@uiw/react-codemirror"
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { json5, json5ParseLinter } from "codemirror-json5"
import { linter } from "@codemirror/lint"

export function JsonEditor({ value, onChange }) {
  const [theme, setTheme] = useState(localStorage.getItem('pref-theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.body.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    document.getElementById("theme-toggle").addEventListener("click", checkTheme)
    
    checkTheme()
  }, [])

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[json5(), linter(json5ParseLinter())]}
      onChange={onChange}
      theme={theme === 'dark' ? vscodeDark : vscodeLight}
    />
  )
}
