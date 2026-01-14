"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui";
import type { TestCase, TestCaseResult } from "@/lib/execution/types";

interface TestCasesPanelProps {
  testCases: TestCase[];
  testResults: TestCaseResult[] | null;
  onAddTestCase: () => void;
  onRemoveTestCase: (index: number) => void;
  onUpdateTestCase: (
    index: number,
    field: "input" | "expectedOutput",
    value: string,
  ) => void;
}

export function TestCasesPanel({
  testCases,
  testResults,
  onAddTestCase,
  onRemoveTestCase,
  onUpdateTestCase,
}: TestCasesPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--foreground-muted)]">
          Test Cases ({testCases.length})
        </span>
        <Button variant="ghost" size="sm" onClick={onAddTestCase}>
          + Add Test
        </Button>
      </div>

      {/* Test Cases List */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-4">
          {testCases.map((tc, index) => (
            <TestCaseItem
              key={index}
              index={index}
              testCase={tc}
              result={testResults?.[index]}
              onUpdate={onUpdateTestCase}
              onRemove={onRemoveTestCase}
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      {testResults && <TestSummary results={testResults} />}
    </div>
  );
}

interface TestCaseItemProps {
  index: number;
  testCase: TestCase;
  result?: TestCaseResult;
  onUpdate: (
    index: number,
    field: "input" | "expectedOutput",
    value: string,
  ) => void;
  onRemove: (index: number) => void;
}

function TestCaseItem({
  index,
  testCase,
  result,
  onUpdate,
  onRemove,
}: TestCaseItemProps) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(index, "input", e.target.value);
    },
    [index, onUpdate],
  );

  const handleOutputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(index, "expectedOutput", e.target.value);
    },
    [index, onUpdate],
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
          aria-label={`Remove test case ${index + 1}`}
        >
          ✕
        </button>
      </div>

      <div className="grid gap-2">
        <TestCaseField
          label="Input"
          value={testCase.input}
          onChange={handleInputChange}
          placeholder="Input..."
        />
        <TestCaseField
          label="Expected Output"
          value={testCase.expectedOutput || ""}
          onChange={handleOutputChange}
          placeholder="Expected output..."
        />
        {result && (
          <TestCaseActualOutput
            output={
              result.stdout ||
              result.stderr ||
              result.compileOutput ||
              "(no output)"
            }
          />
        )}
      </div>
    </div>
  );
}

interface TestCaseFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
}

function TestCaseField({
  label,
  value,
  onChange,
  placeholder,
}: TestCaseFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--foreground-muted)]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        className="textarea h-16"
        placeholder={placeholder}
      />
    </div>
  );
}

function TestCaseActualOutput({ output }: { output: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--foreground-muted)]">
        Actual Output
      </label>
      <div className="rounded border border-[var(--border)] bg-[var(--background)] p-2 font-mono text-sm">
        {output}
      </div>
    </div>
  );
}

interface TestSummaryProps {
  results: TestCaseResult[];
}

function TestSummary({ results }: TestSummaryProps) {
  const { passed, failed } = useMemo(() => {
    const passed = results.filter((r) => r.passed).length;
    return { passed, failed: results.length - passed };
  }, [results]);

  return (
    <div className="border-t border-[var(--border)] p-3">
      <span className="text-sm font-medium">
        Results: <span className="text-[var(--success)]">{passed} passed</span>
        {" / "}
        <span className="text-[var(--error)]">{failed} failed</span>
      </span>
    </div>
  );
}

export default TestCasesPanel;
