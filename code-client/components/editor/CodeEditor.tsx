"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirrorEditor = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--background-secondary)]">
      <div className="text-[var(--foreground-muted)]">Loading editor...</div>
    </div>
  ),
});

// Language extensions (loaded dynamically)
const langExtensions: Record<number, () => Promise<{ default: unknown }>> = {
  71: () => import("@codemirror/lang-python").then((m) => ({ default: m.python() })),
  63: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript() })),
  54: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  62: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript() })),
  74: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript({ typescript: true }) })),
  73: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  60: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
};

// CodeMirror basic setup
const CODEMIRROR_BASIC_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
} as const;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  languageId: number;
  className?: string;
}

/**
 * CodeMirror-based code editor component with language support
 */
export function CodeEditor({
  value,
  onChange,
  languageId,
  className = "",
}: CodeEditorProps) {
  const [langExt, setLangExt] = useState<unknown>(null);

  // Load language extension when languageId changes
  useEffect(() => {
    let cancelled = false;

    const loadLang = async () => {
      const loader = langExtensions[languageId];
      if (loader) {
        try {
          const ext = await loader();
          if (!cancelled) {
            setLangExt(ext.default);
          }
        } catch {
          console.error("Failed to load language extension");
        }
      }
    };

    loadLang();

    return () => {
      cancelled = true;
    };
  }, [languageId]);

  // Memoize extensions array
  const extensions = useMemo(
    () => (langExt ? [langExt as never] : []),
    [langExt]
  );

  return (
    <div className={`flex-1 overflow-hidden ${className}`}>
      <CodeMirrorEditor
        value={value}
        onChange={onChange}
        height="100%"
        theme="dark"
        extensions={extensions}
        className="h-full"
        basicSetup={CODEMIRROR_BASIC_SETUP}
      />
    </div>
  );
}

export default CodeEditor;
