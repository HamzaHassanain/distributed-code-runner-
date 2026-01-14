"use client";

import { useEffect, useState, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";

const CodeMirrorEditor = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--background-secondary)]">
      <div className="text-[var(--foreground-muted)]">Loading editor...</div>
    </div>
  ),
});

const langExtensions: Record<number, () => Promise<{ default: unknown }>> = {
  71: () =>
    import("@codemirror/lang-python").then((m) => ({ default: m.python() })),
  63: () =>
    import("@codemirror/lang-javascript").then((m) => ({
      default: m.javascript(),
    })),
  54: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  62: () =>
    import("@codemirror/lang-javascript").then((m) => ({
      default: m.javascript(),
    })),
  74: () =>
    import("@codemirror/lang-javascript").then((m) => ({
      default: m.javascript({ typescript: true }),
    })),
  73: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  60: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
};

const CODEMIRROR_BASIC_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
} as const;

export interface CodeEditorHandle {
  getValue: () => string;
  setValue: (value: string) => void;
}

interface CodeEditorProps {
  initialValue?: string;
  languageId: number;
  className?: string;
  onChange?: (value: string) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ initialValue = "", languageId, className = "", onChange }, ref) => {
    const [value, setValue] = useState(initialValue);
    const [langExt, setLangExt] = useState<unknown>(null);
    const valueRef = useRef(value);

    // Keep ref in sync with state for access in generic ways if needed.
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      setValue: (newValue: string) => {
        setValue(newValue);
        valueRef.current = newValue;
      },
    }));

    const handleChange = (val: string) => {
      setValue(val);
      onChange?.(val);
    };

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

    const extensions = useMemo(
      () => (langExt ? [langExt as never] : []),
      [langExt],
    );

    return (
      <div className={`flex-1 overflow-hidden ${className}`}>
        <CodeMirrorEditor
          value={value}
          onChange={handleChange}
          height="100%"
          theme="dark"
          extensions={extensions}
          className="h-full"
          basicSetup={CODEMIRROR_BASIC_SETUP}
        />
      </div>
    );
  },
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
