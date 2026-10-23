"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type CodeBlockLineVariant = "default" | "added" | "removed" | "highlighted";
type CodeBlockLanguage = "json";

const lineVariantClass: Record<CodeBlockLineVariant, string> = {
  default: "",
  added: "bg-[#1e2c24]",
  removed: "bg-[#2d1f22]",
  highlighted: "bg-[#242b37]",
};

const tokenClass = {
  plain: "text-[#d5dae2]",
  key: "text-[#9ab6d9]",
  string: "text-[#9ac9a8]",
  number: "text-[#cbb083]",
  literal: "text-[#bda8d6]",
  punctuation: "text-[#7c8593]",
};

function highlightJson(code: string): React.ReactNode[] {
  const pattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let counter = 0;
  let match = pattern.exec(code);

  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }

    const [full, text, colon, num, literal, punctuation] = match;

    if (text !== undefined) {
      nodes.push(
        <span
          key={counter++}
          className={colon ? tokenClass.key : tokenClass.string}
        >
          {text}
        </span>,
      );
      if (colon) {
        nodes.push(
          <span key={counter++} className={tokenClass.punctuation}>
            {colon}
          </span>,
        );
      }
    } else if (num !== undefined) {
      nodes.push(
        <span key={counter++} className={tokenClass.number}>
          {num}
        </span>,
      );
    } else if (literal !== undefined) {
      nodes.push(
        <span key={counter++} className={tokenClass.literal}>
          {literal}
        </span>,
      );
    } else if (punctuation !== undefined) {
      nodes.push(
        <span key={counter++} className={tokenClass.punctuation}>
          {punctuation}
        </span>,
      );
    } else {
      nodes.push(full);
    }

    lastIndex = match.index + full.length;
    match = pattern.exec(code);
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}

function CodeBlock({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="code-block"
      data-size={size}
      className={cn(
        "group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#2b323d] bg-[#161a21] text-[#d5dae2]",
        size === "sm" ? "text-xs" : "text-[13px]",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 border-[#2b323d] border-b bg-[#1c212a] px-3 py-1.5",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn(
        "min-w-0 truncate font-mono text-[#94a0b2] text-xs [&_svg]:pointer-events-none [&_svg]:inline-block [&_svg]:align-middle",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn("ms-auto flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

function CodeBlockCopyButton({
  value,
  className,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <>
      <button
        type="button"
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        aria-label={copied ? "Copied" : "Copy"}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md text-[#94a0b2] transition-colors hover:bg-[#2b323d] hover:text-[#eef1f5] focus-visible:outline-none focus-visible:ring-[#3d4654] focus-visible:ring-[2px]",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => {});
        }}
        {...props}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

function CodeBlockContent({
  className,
  children,
  style,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  language,
  highlightLines,
  ...props
}: React.ComponentProps<"pre"> & {
  wrap?: boolean;
  lineNumbers?: boolean;
  startLine?: number;
  language?: CodeBlockLanguage;
  highlightLines?: number[];
}) {
  const code = typeof children === "string" ? children : null;
  const lines = code === null ? null : code.replace(/\n$/, "").split("\n");
  const highlighted =
    code !== null && language === "json" ? highlightJson(code) : children;
  const perLine =
    lines !== null && (lineNumbers || highlightLines !== undefined);

  return (
    <pre
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      data-numbered={lineNumbers || undefined}
      dir="ltr"
      style={style}
      className={cn(
        "min-h-0 min-w-0 overflow-auto px-4 py-3 font-mono leading-relaxed outline-none",
        wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        className,
      )}
      {...props}
    >
      <code data-slot="code-block-code">
        {perLine && lines
          ? lines.map((line, index) => {
              const lineNumber = startLine + index;
              return (
                <CodeBlockLine
                  key={lineNumber}
                  number={lineNumbers ? lineNumber : undefined}
                  variant={
                    highlightLines?.includes(lineNumber)
                      ? "highlighted"
                      : "default"
                  }
                >
                  {language === "json" ? highlightJson(line) : line}
                </CodeBlockLine>
              );
            })
          : highlighted}
      </code>
    </pre>
  );
}

function CodeBlockLine({
  className,
  variant = "default",
  number,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: CodeBlockLineVariant;
  number?: number;
}) {
  const empty =
    children === undefined ||
    children === null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0);

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn("block", lineVariantClass[variant], className)}
      {...props}
    >
      {number !== undefined ? (
        <span
          aria-hidden
          className="mr-4 inline-block w-8 select-none text-right text-[#5f6875]"
        >
          {number}
        </span>
      ) : null}
      {empty ? "\n" : children}
    </span>
  );
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn(
        "flex min-w-0 shrink-0 items-center border-[#2b323d] border-t px-3 py-1.5",
        className,
      )}
      {...props}
    />
  );
}

export {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
};
