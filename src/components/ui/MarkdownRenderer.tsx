import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mb-3 mt-4 text-lg font-semibold text-vscode-fg first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mb-2 mt-4 text-base font-semibold text-vscode-fg first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mb-2 mt-3 text-sm font-semibold text-vscode-fg first:mt-0",
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("my-2 text-sm leading-relaxed text-vscode-fg", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "text-vscode-accent underline-offset-2 hover:underline",
        className
      )}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "my-2 list-disc space-y-1 pl-5 text-sm text-vscode-fg",
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "my-2 list-decimal space-y-1 pl-5 text-sm text-vscode-fg",
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "my-3 border-l-2 border-vscode-border pl-3 text-sm italic text-vscode-fg-muted",
        className
      )}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className?.includes("language-");
    if (isInline) {
      return (
        <code
          className={cn(
            "rounded bg-vscode-bg-elevated px-1.5 py-0.5 font-mono text-[12px] text-vscode-info",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn("font-mono text-[12px] text-vscode-fg", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-3 overflow-x-auto rounded-md border border-vscode-border-subtle bg-vscode-panel p-3 font-mono text-[12px] leading-relaxed text-vscode-fg",
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("my-4 border-vscode-border-subtle", className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("font-semibold text-vscode-fg", className)}
      {...props}
    />
  ),
  em: ({ className, ...props }) => (
    <em className={cn("italic text-vscode-fg", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className={cn(
          "min-w-full border-collapse text-sm text-vscode-fg",
          className
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border border-vscode-border-subtle bg-vscode-bg-elevated px-2 py-1 text-left text-xs font-semibold",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border border-vscode-border-subtle px-2 py-1 align-top",
        className
      )}
      {...props}
    />
  ),
};

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn("max-w-none text-vscode-fg", className)}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
