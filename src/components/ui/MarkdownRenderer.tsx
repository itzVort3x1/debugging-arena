"use client";

import Markdown from "react-markdown";
import { cn } from "@/lib/utils";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      <Markdown
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-lg font-semibold text-vscode-fg mt-2"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-base font-semibold text-vscode-fg mt-4"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-sm font-semibold text-vscode-fg mt-3"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="text-vscode-fg" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-vscode-accent hover:underline"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: ({ className: cls, ...props }) => {
            const isFenced = typeof cls === "string" && cls.startsWith("language-");
            if (isFenced) {
              return <code className={cn("block", cls)} {...props} />;
            }
            return (
              <code
                className="px-1 py-0.5 rounded bg-vscode-bg-elevated text-vscode-info text-xs font-mono"
                {...props}
              />
            );
          },
          pre: ({ ...props }) => (
            <pre
              className="bg-vscode-bg-elevated border border-vscode-border rounded p-3 overflow-x-auto text-xs font-mono"
              {...props}
            />
          ),
          ul: ({ ...props }) => (
            <ul
              className="list-disc list-inside space-y-1 text-vscode-fg"
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <ol
              className="list-decimal list-inside space-y-1 text-vscode-fg"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-2 border-vscode-accent pl-3 text-vscode-fg-muted italic"
              {...props}
            />
          ),
          hr: ({ ...props }) => (
            <hr className="border-vscode-border" {...props} />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
