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

const initializeExample = `{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": { "name": "claude-desktop", "version": "0.12.0" }
  }
}`;

type LifecyclePhase = {
  phase: string;
  detail: string;
};

const lifecycle: LifecyclePhase[] = [
  {
    phase: "Spawn",
    detail: `For a \`command\` entry the client starts the process from \`command\` and \`args\` and connects to its \`stdin\`/\`stdout\`. Only \`JSON-RPC\` may be written to \`stdout\`; logs go to \`stderr\`. For a \`url\` entry the client opens a \`Streamable HTTP\` connection instead, and carries the \`Mcp-Session-Id\` from the \`initialize\` response on later requests.`,
  },
  {
    phase: "Initialize",
    detail: `One \`initialize\` request, one result, one \`notifications/initialized\`. Both sides agree on a \`protocolVersion\` and exchange \`capabilities\`. Until the handshake completes, neither side sends requests other than \`ping\`.`,
  },
  {
    phase: "Operate",
    detail: `Discovery first: \`tools/list\`, \`resources/list\`, \`prompts/list\`, each paginated with \`cursor\`. Then calls: \`tools/call\`, \`resources/read\`, \`prompts/get\`. The server may call back into the client (\`sampling/createMessage\`, \`roots/list\`, \`elicitation/create\`) only for capabilities the client declared. Either side may \`ping\`; \`notifications/progress\` reports progress, and \`list_changed\` or \`resources/updated\` says a cached list is stale.`,
  },
  {
    phase: "Shut down",
    detail: `\`stdio\` has no shutdown message: the client closes \`stdin\` and terminates the child process. \`Streamable HTTP\` ends the session with \`DELETE\` plus \`Mcp-Session-Id\`, or the server expires it; a request with an unknown id returns \`404\`, and the client must \`initialize\` again. A restart is just spawn and initialize once more.`,
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
        <div className="space-y-2 border-gray-200 border-t pt-3 text-sm">
          <p className="font-medium text-gray-900">Who provides the server</p>
          <p className="text-gray-700">
            {renderInline(
              `Normally the vendor that owns the system, because it controls the auth, the rate limits, and the API changes. GitHub maintains \`github/github-mcp-server\`, shipped as the \`ghcr.io/github/github-mcp-server\` Docker image or the remote \`https://api.githubcopilot.com/mcp/\` endpoint, and Sentry maintains \`@sentry/mcp-server\`. When a vendor has not shipped one, a community server such as \`@modelcontextprotocol/server-github\` (used above) fills the gap. Internal systems usually get a small server written by their own team.`,
            )}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Server lifecycle</h2>
        <p className="text-gray-700 text-sm">
          A server process holds one session at a time, and that session has
          four phases. The handshake is the same for every server; only the
          tools and data differ.
        </p>
        <ol className="space-y-3">
          {lifecycle.map((entry, index) => (
            <li key={entry.phase} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong className="font-medium text-gray-900">
                  {entry.phase}
                </strong>
                <span className="text-gray-700">
                  {" "}
                  - {renderInline(entry.detail)}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <CodeBlock>
          <CodeBlockHeader>
            <CodeBlockTitle>initialize request</CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={initializeExample} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent language="json">
            {initializeExample}
          </CodeBlockContent>
        </CodeBlock>
        <p className="text-gray-700 text-sm">
          {renderInline(
            `The result repeats \`protocolVersion\`, adds the server's \`capabilities\` and \`serverInfo\`, and the client finishes with \`notifications/initialized\`. If the server answers with a version the client does not support, the client closes the connection instead of guessing.`,
          )}
        </p>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">In four steps</h2>
        <p className="text-gray-700 text-sm">
          Once the session is initialized, the model drives it through the same
          open connection:
        </p>
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
