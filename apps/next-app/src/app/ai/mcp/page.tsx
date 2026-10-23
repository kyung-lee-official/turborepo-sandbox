import type { ReactNode } from "react";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { Mermaid } from "@/components/ui/mermaid";

const INLINE_CODE_CLASS =
  "rounded-sm bg-[#2b323d] px-1 py-0.5 font-mono text-[0.9em] text-[#dde3ec]";

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

const communicationChain = `flowchart TB
  dev["Developer"]
  client["MCP client<br/>Claude Desktop / Cursor / VS Code"]
  model["Model API"]

  subgraph machine["Your machine"]
    direction LR
    gh["GitHub server<br/>lists get_issue, create_pull_request"]
    sx["Sentry server<br/>lists get_event"]
    fs["Filesystem server<br/>lists read_file"]
  end

  subgraph remote["Remote services"]
    direction LR
    ghapi["GitHub API"]
    sxapi["Sentry API"]
  end
  disk["Repository on disk"]

  dev -->|"asks"| client
  client -->|"tools/list"| gh
  client -->|"tools/list"| sx
  client -->|"tools/list"| fs
  client -->|"prompt + tool schemas"| model
  model -.->|"tools/call name + args"| client
  client -->|"tools/call get_issue"| gh
  client -->|"tools/call get_event"| sx
  client -->|"tools/call read_file"| fs
  gh -->|"REST /issues/412"| ghapi
  sx -->|"REST /events/{id}"| sxapi
  fs -->|"read / write"| disk`;

const callFlow = [
  `The developer saves three entries in Claude Desktop's \`claude_desktop_config.json\` on macOS: \`github\`, \`sentry\`, and \`filesystem\`, each with a \`command\`, its \`args\`, and a token. Nothing else is installed.`,
  `The developer launches Claude Desktop. It starts one child process per entry and connects to each one's \`stdin\`/\`stdout\`: \`npx -y @modelcontextprotocol/server-github\`, \`npx -y @sentry/mcp-server\`, and \`npx -y @modelcontextprotocol/server-filesystem ./\`.`,
  `For each process Claude Desktop sends \`initialize\` with \`protocolVersion\`, its \`capabilities\`, and \`clientInfo\`; the server answers with its own version, capabilities, and \`serverInfo\`; Claude Desktop then sends \`notifications/initialized\`.`,
  `Claude Desktop sends \`tools/list\` to each server. GitHub answers with \`get_issue\` and \`create_pull_request\`, Sentry with \`get_event\`, and the filesystem server with \`read_file\`; four schemas in total.`,
  `The developer opens a new chat in Claude Desktop and types exactly: "Checkout fails for a small share of orders. Find out why and open a PR."`,
  `Claude Desktop sends that prompt plus the four tool schemas to the model over HTTPS.`,
  `The model answers with a tool call: \`get_issue\` with \`{ "repo": "shop", "number": 412 }\`. Claude Desktop sends \`tools/call\` to the GitHub server; the call only reads, so there is no approval prompt.`,
  `The GitHub server calls \`GET /repos/shop/issues/412\` with \`GITHUB_PERSONAL_ACCESS_TOKEN\`, gets the ticket text (it names Sentry event \`b3f1...\`) and returns it as the tool result.`,
  `Claude Desktop appends that result and calls the model again. The model answers with \`get_event\` and \`{ "eventId": "b3f1..." }\`; Claude Desktop routes \`tools/call\` to the Sentry server, which calls \`GET /api/0/projects/shop/events/b3f1...\` with \`SENTRY_AUTH_TOKEN\` and returns the stack trace, top frame \`checkout.ts:142\`.`,
  `The model answers with \`read_file\` and \`{ "path": "apps/api/src/orders/checkout.ts" }\`; Claude Desktop routes \`tools/call\` to the filesystem server, which reads the file and returns lines 130-150.`,
  `The model proposes a fix and answers with \`create_pull_request\` and \`{ "head": "fix/checkout-412", "base": "main", "title": "Fix rounding in checkout", "body": "Closes #412." }\`. This call writes, so Claude Desktop shows an approval prompt naming the tool and its arguments; the developer clicks Allow.`,
  `Claude Desktop sends \`tools/call\` to the GitHub server, which calls \`POST /repos/shop/pulls\` and returns the PR URL.`,
  `Claude Desktop appends the URL and calls the model a final time; the model writes the answer with the link. The developer quits Claude Desktop, which closes each server's \`stdin\`, terminates the three processes, and the session ends.`,
];

type Actor = {
  who: string;
  does: string;
  config?: string;
};

const actors: Actor[] = [
  {
    who: "Developer",
    does: `Adds three entries to the client's MCP config (\`claude_desktop_config.json\` for Claude Desktop, \`.cursor/mcp.json\` for Cursor, or \`.vscode/mcp.json\` for VS Code), each with a \`command\`, its \`args\`, and a token: \`github\`, \`sentry\`, \`filesystem\`. Then asks the question and clicks Allow when the assistant wants to open the PR.`,
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
    <main className="min-h-svh w-full bg-[#0f131a] text-[#c3ccd8]">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
        <header className="space-y-2">
          <h1 className="font-bold text-2xl text-[#f1f5f9]">MCP</h1>
          <p className="text-[#9aa6b4]">
            Model Context Protocol. An open JSON-RPC 2.0 standard that lets an
            AI assistant call tools exposed by ordinary programs, instead of
            having you copy data into the prompt by hand.
          </p>
        </header>

        <section className="space-y-2 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">The scenario</h2>
          <p className="text-[#b6c0cd] text-sm">
            A support ticket says checkout fails for a small share of orders.
            The developer asks the assistant in their editor: &quot;Find out why
            and open a PR.&quot; To answer, the assistant needs three things it
            cannot know on its own: the ticket, the stack trace, and the code at
            the failing line.
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">Why MCP</h2>
          <div className="space-y-3">
            {comparison.map((entry) => (
              <div
                key={entry.with}
                className="grid gap-2 text-sm sm:grid-cols-2"
              >
                <p className="rounded border border-[#4a2a2e] bg-[#241a1d] p-3 text-[#d9c6c9]">
                  <strong className="mr-2 font-medium text-[#e79aa4]">
                    Without
                  </strong>
                  {entry.without}
                </p>
                <p className="rounded border border-[#29422f] bg-[#17251c] p-3 text-[#c8d9cb]">
                  <strong className="mr-2 font-medium text-[#8fc79f]">
                    With
                  </strong>
                  {entry.with}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">
            Who does what
          </h2>
          <ul className="space-y-2 text-sm">
            {actors.map((entry) => (
              <li key={entry.who}>
                <strong className="font-medium text-[#eef2f7]">
                  {entry.who}
                </strong>
                <span className="text-[#b6c0cd]">
                  {" "}
                  - {renderInline(entry.does)}
                </span>
                {entry.config ? (
                  <CodeBlock className="mt-2">
                    <CodeBlockHeader>
                      <CodeBlockTitle>
                        claude_desktop_config.json
                      </CodeBlockTitle>
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
          <div className="space-y-2 border-[#252c37] border-t pt-3 text-sm">
            <p className="font-medium text-[#eef2f7]">
              Who provides the server
            </p>
            <p className="text-[#b6c0cd]">
              {renderInline(
                `Normally the vendor that owns the system, because it controls the auth, the rate limits, and the API changes. GitHub maintains \`github/github-mcp-server\`, shipped as the \`ghcr.io/github/github-mcp-server\` Docker image or the remote \`https://api.githubcopilot.com/mcp/\` endpoint, and Sentry maintains \`@sentry/mcp-server\`. When a vendor has not shipped one, a community server such as \`@modelcontextprotocol/server-github\` (used above) fills the gap. Internal systems usually get a small server written by their own team.`,
              )}
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">
            The full chain
          </h2>
          <Mermaid chart={communicationChain} theme="dark" />
          <p className="text-[#b6c0cd] text-sm">
            {renderInline(
              `Discovery runs once per session: the client sends \`tools/list\` to every server, and each server answers with the tools it exposes. On every turn the client hands the model those schemas with the prompt; the model names a tool and its arguments; the client routes \`tools/call\` only to the server that listed that tool, and that server makes the API call. Results travel back the same way, and tokens stay in the servers.`,
            )}
          </p>
          <p className="text-[#b6c0cd] text-sm">
            One concrete run in Claude Desktop, from config to shutdown:
          </p>
          <ol className="space-y-2 text-sm">
            {callFlow.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="shrink-0 font-mono text-[#6b7684]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[#b6c0cd]">{renderInline(step)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">
            Server lifecycle
          </h2>
          <p className="text-[#b6c0cd] text-sm">
            A server process holds one session at a time, and that session has
            four phases. The handshake is the same for every server; only the
            tools and data differ.
          </p>
          <ol className="space-y-3">
            {lifecycle.map((entry, index) => (
              <li key={entry.phase} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-[#6b7684]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong className="font-medium text-[#eef2f7]">
                    {entry.phase}
                  </strong>
                  <span className="text-[#b6c0cd]">
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
          <p className="text-[#b6c0cd] text-sm">
            {renderInline(
              `The result repeats \`protocolVersion\`, adds the server's \`capabilities\` and \`serverInfo\`, and the client finishes with \`notifications/initialized\`. If the server answers with a version the client does not support, the client closes the connection instead of guessing.`,
            )}
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">
            In four steps
          </h2>
          <p className="text-[#b6c0cd] text-sm">
            Once the session is initialized, the model drives it through the
            same open connection:
          </p>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step.call} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-[#6b7684]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  {renderInline(step.call)}
                  <span className="text-[#b6c0cd]"> - {step.result}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2 rounded-lg border border-[#252c37] bg-[#161a21] p-6">
          <h2 className="font-semibold text-[#e6ebf2] text-lg">The point</h2>
          <p className="text-[#b6c0cd] text-sm">
            The model never holds a token and never touches GitHub directly.
            Each server holds one credential and exposes one narrow capability.
            Write that capability once and any of these apps can use it, with
            the developer approving whatever changes state.
          </p>
        </section>
      </div>
    </main>
  );
}
