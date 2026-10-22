import type { ReactNode } from "react";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";

const INLINE_CODE_CLASS =
  "rounded-sm bg-[#232a36] px-1 py-0.5 font-mono text-[0.9em] text-[#dde3ec]";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const segments = text.split(/`([^`]+)`/g);
  let key = 0;

  segments.forEach((segment, index) => {
    if (!segment) {
      return;
    }
    if (index % 2 === 1) {
      nodes.push(
        <code key={key++} className={INLINE_CODE_CLASS}>
          {segment}
        </code>,
      );
      return;
    }
    nodes.push(segment);
  });

  return nodes;
}

const comparison = [
  {
    without:
      "The developer copies the ticket and the stack trace into the chat, then opens the file by hand and pastes the relevant lines.",
    with: "The assistant fetches the ticket, the trace, and the file itself, in one turn.",
  },
  {
    without:
      "Or Claude Desktop, Cursor, and VS Code Copilot Chat each ship their own GitHub client, their own Sentry client, and their own PostgreSQL client. Three apps times three systems is nine integrations, each written and maintained separately.",
    with: "GitHub, Sentry, and PostgreSQL each expose one MCP server. Claude Desktop, Cursor, and VS Code Copilot Chat all use the same three servers, so each system is integrated once.",
  },
  {
    without:
      "You paste the stack trace into the chat. That pasted copy never changes. If the ticket gets a new comment an hour later, or someone pushes a fix, the assistant cannot see it and keeps working from the old text.",
    with: "Every tool call reads the ticket, the code, and the database at that moment, so a new comment or a pushed fix shows up on the next call.",
  },
];

const mcpConfigExample = `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<GITHUB_TOKEN>" }
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": { "SENTRY_AUTH_TOKEN": "<SENTRY_TOKEN>" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"]
    }
  }
}`;

type Actor = {
  who: string;
  does: string;
  config?: string;
};

const actors: Actor[] = [
  {
    who: "Developer",
    does: `Adds three entries to the MCP config file of Claude Desktop, Cursor, or VS Code (for example \`.mcp.json\`), each with a \`command\`, its \`args\`, and a token: \`github\`, \`sentry\`, \`filesystem\`. Then asks the question and clicks Allow when the assistant wants to open the PR.`,
    config: mcpConfigExample,
  },
  {
    who: "Claude Desktop, Cursor, VS Code Copilot Chat",
    does: `Reads the three entries from its MCP config, then runs each entry's \`command\` and \`args\` as a child process: \`npx -y @modelcontextprotocol/server-github\`, \`npx -y @sentry/mcp-server\`, and \`npx -y @modelcontextprotocol/server-filesystem\`. It sends \`initialize\`, \`tools/list\`, and every \`tools/call\` to that process over \`stdin/stdout\` as \`JSON-RPC\`, and stops the three processes when the app quits. An entry with a \`url\` instead of a \`command\` is reached over HTTP, so nothing is spawned for it.`,
  },
  {
    who: "MCP server",
    does: "One separate local process per system: the GitHub server, the Sentry server, the filesystem server. Each holds a single credential and calls a single API.",
  },
  {
    who: "Model",
    does: `Picks the next tool from the list it was given: \`get_issue\`, then \`get_event\`, then \`read_file\`, then \`create_pull_request\`. It sees only the arguments it sends and the results that come back.`,
  },
];

const steps = [
  {
    call: `\`get_issue(repo="shop", number=412)\``,
    result: "The ticket text, including a Sentry event id.",
  },
  {
    call: `\`get_event(eventId="b3f1...")\``,
    result: "The stack trace. Top frame: checkout.ts line 142.",
  },
  {
    call: `\`read_file(path="apps/api/src/orders/checkout.ts")\``,
    result: "The failing code.",
  },
  {
    call: "`create_pull_request(...)`",
    result: "A PR, after the developer approves it.",
  },
];

export default function McpPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="space-y-2">
        <h1 className="font-bold text-2xl">MCP</h1>
        <p className="text-gray-600">
          Model Context Protocol. An open JSON-RPC 2.0 standard that lets an AI
          assistant call tools exposed by ordinary programs, instead of having
          you copy data into the prompt by hand.
        </p>
      </header>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">The scenario</h2>
        <p className="text-gray-700 text-sm">
          A support ticket says checkout fails for a small share of orders. The
          developer asks the assistant in their editor: &quot;Find out why and
          open a PR.&quot; To answer, the assistant needs three things it cannot
          know on its own: the ticket, the stack trace, and the code at the
          failing line.
        </p>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Why MCP</h2>
        <div className="space-y-3">
          {comparison.map((entry) => (
            <div key={entry.with} className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="rounded border border-red-200 bg-red-50 p-3 text-gray-800">
                <strong className="mr-2 font-medium text-red-700">
                  Without
                </strong>
                {entry.without}
              </p>
              <p className="rounded border border-green-200 bg-green-50 p-3 text-gray-800">
                <strong className="mr-2 font-medium text-green-700">
                  With
                </strong>
                {entry.with}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Who does what</h2>
        <ul className="space-y-2 text-sm">
          {actors.map((entry) => (
            <li key={entry.who}>
              <strong className="font-medium text-gray-900">{entry.who}</strong>
              <span className="text-gray-700">
                {" "}
                - {renderInline(entry.does)}
              </span>
              {entry.config ? (
                <CodeBlock className="mt-2">
                  <CodeBlockHeader>
                    <CodeBlockTitle>.mcp.json</CodeBlockTitle>
                    <CodeBlockActions>
                      <CodeBlockCopyButton value={entry.config} />
                    </CodeBlockActions>
                  </CodeBlockHeader>
                  <CodeBlockContent language="json">
                    {entry.config}
                  </CodeBlockContent>
                </CodeBlock>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">In four steps</h2>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.call} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                {renderInline(step.call)}
                <span className="text-gray-700"> - {step.result}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">The point</h2>
        <p className="text-gray-700 text-sm">
          The model never holds a token and never touches GitHub directly. Each
          server holds one credential and exposes one narrow capability. Write
          that capability once and any of these apps can use it, with the
          developer approving whatever changes state.
        </p>
      </section>
    </main>
  );
}
