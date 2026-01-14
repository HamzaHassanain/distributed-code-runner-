"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, type ExecutionResult, type TestCase, type TestCaseResult } from "@/lib/execution/types";

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--background-secondary)]">
      <div className="text-[var(--foreground-muted)]">Loading editor...</div>
    </div>
  ),
});

// Language extensions (loaded dynamically) - defined outside component to avoid recreation
const langExtensions: Record<number, () => Promise<{ default: unknown }>> = {
  71: () => import("@codemirror/lang-python").then((m) => ({ default: m.python() })),
  63: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript() })),
  54: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  62: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript() })),
  74: () => import("@codemirror/lang-javascript").then((m) => ({ default: m.javascript({ typescript: true }) })),
  73: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
  60: () => import("@codemirror/lang-cpp").then((m) => ({ default: m.cpp() })),
};

// Default code templates - defined outside component
const CODE_TEMPLATES: Record<number, string> = {
  71: `# Python 3
def main():
    n = int(input())
    print(n * 2)

if __name__ == "__main__":
    main()
`,
  63: `// JavaScript (Node.js)
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  const n = parseInt(line);
  console.log(n * 2);
  rl.close();
});
`,
  54: `// C++ 17
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    int n;
    cin >> n;
    cout << n * 2 << endl;
    
    return 0;
}
`,
  62: `// Java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n * 2);
    }
}
`,
  74: `// TypeScript
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line: string) => {
  const n: number = parseInt(line);
  console.log(n * 2);
  rl.close();
});
`,
};

// CodeMirror basic setup - memoized outside component
const CODEMIRROR_BASIC_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
} as const;

// Helper function - defined outside component
const getStatusColor = (statusId: number): string => {
  if (statusId === 3) return "var(--success)";
  if (statusId === 4 || statusId >= 7) return "var(--error)";
  if (statusId === 5 || statusId === 6) return "var(--warning)";
  return "var(--foreground-muted)";
};

type ViewMode = "standard" | "testcases";

// Memoized Spinner Component
const Spinner = memo(function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
});

// Memoized Play Icon
const PlayIcon = memo(function PlayIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
});

// Memoized TestCase Item Component
interface TestCaseItemProps {
  testCase: TestCase;
  index: number;
  result?: TestCaseResult;
  onUpdate: (index: number, field: "input" | "expectedOutput", value: string) => void;
  onRemove: (index: number) => void;
}

const TestCaseItem = memo(function TestCaseItem({
  testCase,
  index,
  result,
  onUpdate,
  onRemove,
}: TestCaseItemProps) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(index, "input", e.target.value);
    },
    [index, onUpdate]
  );

  const handleOutputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(index, "expectedOutput", e.target.value);
    },
    [index, onUpdate]
  );

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          Test {index + 1}
          {result && (
            <span
              className={`ml-2 ${
                result.passed ? "text-[var(--success)]" : "text-[var(--error)]"
              }`}
            >
              {result.passed ? "✓ Passed" : "✗ Failed"}
            </span>
          )}
        </span>
        <button
          onClick={handleRemove}
          className="text-[var(--foreground-muted)] hover:text-[var(--error)]"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-2">
        <div>
          <label className="mb-1 block text-xs text-[var(--foreground-muted)]">
            Input
          </label>
          <textarea
            value={testCase.input}
            onChange={handleInputChange}
            className="textarea h-16"
            placeholder="Input..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--foreground-muted)]">
            Expected Output
          </label>
          <textarea
            value={testCase.expectedOutput || ""}
            onChange={handleOutputChange}
            className="textarea h-16"
            placeholder="Expected output..."
          />
        </div>
        {result && (
          <div>
            <label className="mb-1 block text-xs text-[var(--foreground-muted)]">
              Actual Output
            </label>
            <div className="rounded border border-[var(--border)] bg-[var(--background)] p-2 font-mono text-sm">
              {result.stdout || result.stderr || result.compile_output || "(no output)"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Memoized Output Panel Component
interface OutputPanelProps {
  output: ExecutionResult | null;
}

const OutputPanel = memo(function OutputPanel({ output }: OutputPanelProps) {
  const statusColor = useMemo(
    () => (output ? getStatusColor(output.status.id) : undefined),
    [output]
  );

  const memoryDisplay = useMemo(
    () => (output ? (output.memory / 1024).toFixed(1) : undefined),
    [output]
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--foreground-muted)]">Output</span>
        {output && (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium" style={{ color: statusColor }}>
              {output.status.description}
            </span>
            <span className="text-[var(--foreground-muted)]">
              {output.time}s | {memoryDisplay} MB
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
        {output ? (
          <>
            {output.compile_output && (
              <div className="text-[var(--error)]">
                <div className="mb-1 font-semibold">Compilation Error:</div>
                <pre className="whitespace-pre-wrap">{output.compile_output}</pre>
              </div>
            )}
            {output.stderr && (
              <div className="text-[var(--error)]">
                <div className="mb-1 font-semibold">Error:</div>
                <pre className="whitespace-pre-wrap">{output.stderr}</pre>
              </div>
            )}
            {output.stdout && (
              <pre className="whitespace-pre-wrap text-[var(--foreground)]">
                {output.stdout}
              </pre>
            )}
            {!output.stdout && !output.stderr && !output.compile_output && (
              <span className="text-[var(--foreground-muted)]">No output</span>
            )}
          </>
        ) : (
          <span className="text-[var(--foreground-muted)]">
            Run your code to see output...
          </span>
        )}
      </div>
    </div>
  );
});

// Memoized Test Summary Component
interface TestSummaryProps {
  results: TestCaseResult[];
}

const TestSummary = memo(function TestSummary({ results }: TestSummaryProps) {
  const { passed, failed } = useMemo(() => {
    const passed = results.filter((r) => r.passed).length;
    return { passed, failed: results.length - passed };
  }, [results]);

  return (
    <div className="border-t border-[var(--border)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Results:{" "}
          <span className="text-[var(--success)]">{passed} passed</span>
          {" / "}
          <span className="text-[var(--error)]">{failed} failed</span>
        </span>
      </div>
    </div>
  );
});

export default function EditorPage() {
  const router = useRouter();
  const { user, token, isLoading, isGuest, logout } = useAuth();

  // Editor state
  const [code, setCode] = useState("");
  const [languageId, setLanguageId] = useState(71);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Test cases state
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "5", expectedOutput: "10" },
  ]);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Language extension state
  const [langExt, setLangExt] = useState<unknown>(null);

  // Memoized language options for select
  const languageOptions = useMemo(
    () =>
      Object.entries(LANGUAGES).map(([id, lang]) => (
        <option key={id} value={id}>
          {lang.name}
        </option>
      )),
    []
  );

  // Memoized extensions array for CodeMirror
  const extensions = useMemo(
    () => (langExt ? [langExt as never] : []),
    [langExt]
  );

  // Load template on language change
  useEffect(() => {
    const template = CODE_TEMPLATES[languageId];
    if (template) {
      setCode(template);
    }
  }, [languageId]);

  // Load language extension
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

  // Memoized request headers
  const requestHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Execute code (single run) - memoized with useCallback
  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ code, languageId, stdin }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setOutput(data.result);
      } else {
        setOutput({
          stdout: null,
          stderr: data.error || "Execution failed",
          compile_output: null,
          time: "0.00",
          memory: 0,
          status: { id: 13, description: "Internal Error" },
        });
      }
    } catch (error) {
      console.error("Execution error:", error);
      setOutput({
        stdout: null,
        stderr: "Network error. Please try again.",
        compile_output: null,
        time: "0.00",
        memory: 0,
        status: { id: 13, description: "Internal Error" },
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, languageId, stdin, requestHeaders]);

  // Run test cases - memoized with useCallback
  const handleRunTests = useCallback(async () => {
    setIsRunningTests(true);
    setTestResults(null);

    try {
      const response = await fetch("/api/execute/batch", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ code, languageId, testCases }),
      });

      const data = await response.json();
      if (data.success && data.results) {
        setTestResults(data.results);
      } else {
        console.error("Test execution failed:", data.error);
      }
    } catch (error) {
      console.error("Test execution error:", error);
    } finally {
      setIsRunningTests(false);
    }
  }, [code, languageId, testCases, requestHeaders]);

  // Memoized run handler based on view mode
  const handleRunClick = useCallback(() => {
    if (viewMode === "standard") {
      handleRun();
    } else {
      handleRunTests();
    }
  }, [viewMode, handleRun, handleRunTests]);

  // Add test case - memoized
  const handleAddTestCase = useCallback(() => {
    setTestCases((prev) => [...prev, { input: "", expectedOutput: "" }]);
  }, []);

  // Remove test case - memoized
  const handleRemoveTestCase = useCallback((index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update test case - memoized
  const handleUpdateTestCase = useCallback(
    (index: number, field: "input" | "expectedOutput", value: string) => {
      setTestCases((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  // Handle language change - memoized
  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setLanguageId(Number(e.target.value));
    },
    []
  );

  // Handle stdin change - memoized
  const handleStdinChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setStdin(e.target.value);
    },
    []
  );

  // Handle view mode changes - memoized
  const setStandardMode = useCallback(() => setViewMode("standard"), []);
  const setTestCasesMode = useCallback(() => setViewMode("testcases"), []);

  // Handle logout - memoized
  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  // Handle navigate to signup - memoized
  const handleNavigateToSignup = useCallback(() => {
    router.push("/");
  }, [router]);

  // Derived state
  const isExecuting = isRunning || isRunningTests;
  const runButtonText = viewMode === "standard" ? "Run" : "Run Tests";

  // Show loading while auth initializes
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--foreground-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">
            <span className="gradient-accent bg-clip-text text-transparent">
              CodeRunner
            </span>
          </h1>

          {/* Language Selector */}
          <select
            value={languageId}
            onChange={handleLanguageChange}
            className="select"
          >
            {languageOptions}
          </select>

          {/* Run Button */}
          <button
            onClick={handleRunClick}
            disabled={isExecuting}
            className="btn btn-success"
          >
            {isExecuting ? (
              <>
                <Spinner />
                Running...
              </>
            ) : (
              <>
                <PlayIcon />
                {runButtonText}
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-[var(--background-secondary)] p-0.5">
            <button
              onClick={setStandardMode}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "standard"
                  ? "bg-[var(--background-elevated)] text-[var(--foreground)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Standard
            </button>
            <button
              onClick={setTestCasesMode}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "testcases"
                  ? "bg-[var(--background-elevated)] text-[var(--foreground)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Test Cases
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            {isGuest ? (
              <span className="badge badge-warning">Guest Mode</span>
            ) : user ? (
              <span className="text-sm text-[var(--foreground-muted)]">
                {user.name}
              </span>
            ) : null}

            {isGuest ? (
              <button
                onClick={handleNavigateToSignup}
                className="btn btn-primary text-sm"
              >
                Sign Up
              </button>
            ) : (
              <button onClick={handleLogout} className="btn btn-ghost text-sm">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor Panel */}
        <div className="flex w-1/2 flex-col border-r border-[var(--border)]">
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={code}
              onChange={setCode}
              height="100%"
              theme="dark"
              extensions={extensions}
              className="h-full"
              basicSetup={CODEMIRROR_BASIC_SETUP}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex w-1/2 flex-col">
          {viewMode === "standard" ? (
            <>
              {/* Input */}
              <div className="flex h-1/3 flex-col border-b border-[var(--border)]">
                <div className="flex items-center border-b border-[var(--border)] px-3 py-2">
                  <span className="text-xs font-medium text-[var(--foreground-muted)]">
                    Input (stdin)
                  </span>
                </div>
                <textarea
                  value={stdin}
                  onChange={handleStdinChange}
                  placeholder="Enter input here..."
                  className="flex-1 resize-none border-0 bg-[var(--background-secondary)] p-3 font-mono text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none"
                />
              </div>

              {/* Output */}
              <OutputPanel output={output} />
            </>
          ) : (
            // Test Cases Mode
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Test Cases Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--foreground-muted)]">
                  Test Cases ({testCases.length})
                </span>
                <button
                  onClick={handleAddTestCase}
                  className="btn btn-ghost text-xs"
                >
                  + Add Test
                </button>
              </div>

              {/* Test Cases List */}
              <div className="flex-1 overflow-auto p-3">
                <div className="space-y-4">
                  {testCases.map((tc, index) => (
                    <TestCaseItem
                      key={index}
                      testCase={tc}
                      index={index}
                      result={testResults?.[index]}
                      onUpdate={handleUpdateTestCase}
                      onRemove={handleRemoveTestCase}
                    />
                  ))}
                </div>
              </div>

              {/* Test Summary */}
              {testResults && <TestSummary results={testResults} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
