"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui";
import { PlayIcon } from "@/components/icons";
import {
  EditorHeader,
  CodeEditor,
  InputPanel,
  OutputPanel,
  TestCasesPanel,
} from "@/components/editor";
import {
  LANGUAGES,
  type ExecutionResult,
  type TestCase,
  type TestCaseResult,
} from "@/lib/execution/types";

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

const INITIAL_TEST_CASES: TestCase[] = [{ input: "5", expectedOutput: "10" }];

type ViewMode = "standard" | "testcases";

export default function EditorPage() {
  const router = useRouter();
  const { user, token, isLoading, isGuest, logout } = useAuth();

  const [code, setCode] = useState("");
  const [languageId, setLanguageId] = useState(71);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [testCases, setTestCases] = useState<TestCase[]>(INITIAL_TEST_CASES);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    const template = CODE_TEMPLATES[languageId];
    if (template) {
      setCode(template);
    }
  }, [languageId]);

  const requestHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const languageList = useMemo(
    () =>
      Object.entries(LANGUAGES).map(([id, lang]) => ({
        id: Number(id),
        name: lang.name,
      })),
    [],
  );

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
      setOutput(
        data.success && data.result
          ? data.result
          : createErrorResult(data.error || "Execution failed"),
      );
    } catch (error) {
      console.error("Execution error:", error);
      setOutput(createErrorResult("Network error. Please try again."));
    } finally {
      setIsRunning(false);
    }
  }, [code, languageId, stdin, requestHeaders]);

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
      }
    } catch (error) {
      console.error("Test execution error:", error);
    } finally {
      setIsRunningTests(false);
    }
  }, [code, languageId, testCases, requestHeaders]);

  const handleRunClick = useCallback(() => {
    if (viewMode === "standard") {
      handleRun();
    } else {
      handleRunTests();
    }
  }, [viewMode, handleRun, handleRunTests]);

  const handleAddTestCase = useCallback(() => {
    setTestCases((prev) => [...prev, { input: "", expectedOutput: "" }]);
  }, []);

  const handleRemoveTestCase = useCallback((index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateTestCase = useCallback(
    (index: number, field: "input" | "expectedOutput", value: string) => {
      setTestCases((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [],
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleSignup = useCallback(() => {
    router.push("/");
  }, [router]);

  const isExecuting = isRunning || isRunningTests;
  const runButtonLabel = viewMode === "standard" ? "Run" : "Run Tests";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
          <Spinner size="md" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--background)]">
      {/* Header */}
      <EditorHeader
        languageId={languageId}
        onLanguageChange={setLanguageId}
        onRun={handleRunClick}
        isRunning={isExecuting}
        runButtonLabel={runButtonLabel}
        languages={languageList}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        user={user}
        isGuest={isGuest}
        onLogout={handleLogout}
        onSignup={handleSignup}
        runIcon={<PlayIcon />}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor Panel */}
        <div className="flex w-1/2 flex-col border-r border-[var(--border)]">
          <CodeEditor value={code} onChange={setCode} languageId={languageId} />
        </div>

        {/* Right Panel */}
        <div className="flex w-1/2 flex-col">
          {viewMode === "standard" ? (
            <>
              <InputPanel value={stdin} onChange={setStdin} />
              <OutputPanel output={output} />
            </>
          ) : (
            <TestCasesPanel
              testCases={testCases}
              testResults={testResults}
              onAddTestCase={handleAddTestCase}
              onRemoveTestCase={handleRemoveTestCase}
              onUpdateTestCase={handleUpdateTestCase}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function createErrorResult(message: string): ExecutionResult {
  return {
    stdout: null,
    stderr: message,
    compile_output: null,
    time: "0.00",
    memory: 0,
    status: { id: 13, description: "Internal Error" },
  };
}
