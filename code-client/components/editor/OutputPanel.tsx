"use client";

import { useMemo } from "react";
import type { ExecutionResult } from "@/lib/execution/types";

interface OutputPanelProps {
  output: ExecutionResult | null;
}

export function OutputPanel({ output }: OutputPanelProps) {
  const statusInfo = useMemo(() => {
    if (!output) return null;
    return {
      color: getStatusColor(output.statusId),
      memoryMB: (output.memory / 1024).toFixed(1),
    };
  }, [output]);

  return (
    <div className="flex flex-1 flex-col">
      <PanelHeader title="Output" statusInfo={statusInfo} output={output} />
      <OutputContent output={output} />
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  statusInfo: { color: string; memoryMB: string } | null;
  output: ExecutionResult | null;
}

function PanelHeader({ title, statusInfo, output }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
      <span className="text-xs font-medium text-[var(--foreground-muted)]">
        {title}
      </span>
      {output && statusInfo && (
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium" style={{ color: statusInfo.color }}>
            {output.status}
          </span>
          <span className="text-[var(--foreground-muted)]">
            {output.time}s | {statusInfo.memoryMB} MB
          </span>
        </div>
      )}
    </div>
  );
}

function OutputContent({ output }: { output: ExecutionResult | null }) {
  if (!output) {
    return (
      <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
        <span className="text-[var(--foreground-muted)]">
          Run your code to see output...
        </span>
      </div>
    );
  }

  const { statusId, compileOutput, stderr, output: stdout, status } = output;
  console.log(output);
  // 1. Compilation Error (Status 6)
  if (statusId === 6) {
    const errorContent = compileOutput || stderr || stdout || "Compilation failed (no details available)";
    return (
      <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
        <OutputSection
          title="Compilation Error"
          content={errorContent}
          isError
        />
      </div>
    );
  }

  // 2. Runtime Errors (Status >= 7)
  // Judge0 status 3 is Accepted.
  if (statusId >= 7) {
    const errorContent = stderr || stdout || compileOutput || "Runtime error (no details available)";
    return (
      <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
        <OutputSection 
          title={status || "Runtime Error"} 
          content={errorContent} 
          isError 
        />
      </div>
    );
  }

  // 3. Accepted or other non-error statuses (Status 3, etc)
  const content = stdout || stderr || compileOutput; 
  
  if (content) {
    return (
      <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
        <pre className="whitespace-pre-wrap text-[var(--foreground)]">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--background-secondary)] p-3 font-mono text-sm">
      <span className="text-[var(--foreground-muted)]">No output</span>
    </div>
  );
}

interface OutputSectionProps {
  title: string;
  content: string;
  isError?: boolean;
}

function OutputSection({ title, content, isError }: OutputSectionProps) {
  return (
    <div className={isError ? "text-[var(--error)]" : ""}>
      <div className="mb-1 font-semibold">{title}:</div>
      <pre className="whitespace-pre-wrap">{content}</pre>
    </div>
  );
}

function getStatusColor(statusId: number): string {
  if (statusId === 3) return "var(--success)";
  if (statusId === 4 || statusId >= 7) return "var(--error)";
  if (statusId === 5 || statusId === 6) return "var(--warning)";
  return "var(--foreground-muted)";
}

export default OutputPanel;
