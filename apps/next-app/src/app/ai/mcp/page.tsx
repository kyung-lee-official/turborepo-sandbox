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
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<GITHUB_TOKEN>" }
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": { "SENTRY_AUTH_TOKEN": "<SENTRY_TOKEN>" }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/code/shop"
      ]
    }
  }
}`;

const toolsForModel = `[
  {
    "name": "github__get_issue",
    "description": "Read one issue from a GitHub repository.",
    "input_schema": { "type": "object", "properties": { "repo": { "type": "string" }, "number": { "type": "integer" } }, "required": ["repo", "number"] }
  },
  {
    "name": "github__create_pull_request",
    "description": "Open a pull request from a head branch into a base branch.",
    "input_schema": { "type": "object", "properties": { "head": { "type": "string" }, "base": { "type": "string" }, "title": { "type": "string" }, "body": { "type": "string" } }, "required": ["head", "base", "title"] }
  },
  {
    "name": "sentry__get_event",
    "description": "Read one Sentry event, including its stack trace.",
    "input_schema": { "type": "object", "properties": { "eventId": { "type": "string" } }, "required": ["eventId"] }
  },
  {
    "name": "filesystem__read_file",
    "description": "Read a file below the allowed root and return its lines.",
    "input_schema": { "type": "object", "properties": { "path": { "type": "string" } }, "required": ["path"] }
  }
]`;

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
  client -->|"prompt + tools"| model
  model -.->|"tools/call name + args"| client
  client -->|"tools/call get_issue"| gh
  client -->|"tools/call get_event"| sx
  client -->|"tools/call read_file"| fs
  gh -->|"REST /issues/412"| ghapi
  sx -->|"REST /events/{id}"| sxapi
  fs -->|"read / write"| disk`;

type CallFlowStep = {
  text: string;
  prompt?: string;
  code?: { title: string; value: string; highlightLines?: number[] };
};

const callFlow: CallFlowStep[] = [
  {
    text: `The developer adds three servers to Claude Desktop's \`claude_desktop_config.json\` on macOS. Nothing else is installed.`,
    code: { title: "claude_desktop_config.json", value: mcpConfigExample },
  },
  {
    text: `The developer launches Claude Desktop. Claude Desktop starts the three MCP servers named in the config and keeps an open connection to each one: Claude Desktop writes \`JSON-RPC\` requests into the server's input, and the server writes \`JSON-RPC\` replies to its output. The three servers are started with \`docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server\`, \`npx -y @sentry/mcp-server\`, and \`npx -y @modelcontextprotocol/server-filesystem /Users/you/code/shop\`.`,
  },
  {
    text: `Into each MCP server's input Claude Desktop writes an \`initialize\` request with \`protocolVersion\`, its \`capabilities\`, and \`clientInfo\`. The server writes its reply to its output: its own version, capabilities, and \`serverInfo\`. Claude Desktop then writes \`notifications/initialized\` into the same input.`,
  },
  {
    text: `Claude Desktop writes \`tools/list\` into the GitHub MCP server's input. The GitHub MCP server answers on its output with \`get_issue\` and \`create_pull_request\`, including each tool's arguments. The same exchange runs with the Sentry MCP server (\`get_event\`) and the filesystem MCP server (\`read_file\`); four tools in total.`,
  },
  {
    text: `The developer opens a new chat in Claude Desktop and enters this prompt, word for word:`,
    prompt:
      "Checkout fails for a small share of orders. Find out why and open a PR.",
  },
  {
    text: `Claude Desktop merges the four tools into one list. Each entry keeps its name, description, and input schema; the name is qualified with its server, so a \`get_issue\` from Sentry would appear as \`sentry__get_issue\` and never collide with the GitHub one.`,
    code: {
      title: "tools sent to the model",
      value: toolsForModel,
      highlightLines: [2, 3, 4, 5, 6],
    },
  },
  {
    text: `Claude Desktop sends that list and the developer's prompt to the model over HTTPS.`,
  },
  {
    text: `The model answers over HTTPS with a structured tool-use block, not prose: a name, an arguments object, and an id — \`github__get_issue\` with \`{ "repo": "shop", "number": 412 }\`. Claude Desktop looks the name up in its list, strips the \`github__\` qualifier, and writes \`tools/call\` with \`get_issue\` into the GitHub MCP server's input; the call only reads, so there is no approval prompt.`,
  },
  {
    text: `The GitHub MCP server uses \`GITHUB_PERSONAL_ACCESS_TOKEN\`, calls \`GET /repos/shop/issues/412\` on the GitHub API over HTTPS, gets the ticket text (it names Sentry event \`b3f1...\`), and writes it to its output as the tool result.`,
  },
  {
    text: `Claude Desktop reads that result and sends it back to the model over HTTPS with the same call id, so the model knows which request it answers. The model answers with \`sentry__get_event\` and \`{ "eventId": "b3f1..." }\`. Claude Desktop strips the qualifier and writes \`tools/call\` with \`get_event\` into the Sentry MCP server's input; the Sentry MCP server calls \`GET /api/0/projects/shop/events/b3f1...\` over HTTPS with \`SENTRY_AUTH_TOKEN\` and writes the stack trace to its output, top frame \`checkout.ts:142\`.`,
  },
  {
    text: `The model answers with \`filesystem__read_file\` and \`{ "path": "apps/api/src/orders/checkout.ts" }\`. Claude Desktop strips the qualifier and writes \`tools/call\` with \`read_file\` into the filesystem MCP server's input; that server reads the file from disk and writes lines 130-150 to its output.`,
  },
  {
    text: `The model proposes a fix and answers with \`github__create_pull_request\` and \`{ "head": "fix/checkout-412", "base": "main", "title": "Fix rounding in checkout", "body": "Closes #412." }\`. This call writes, so Claude Desktop shows an approval prompt naming the tool and its arguments; the developer clicks Allow.`,
  },
  {
    text: `Claude Desktop strips the qualifier and writes \`tools/call\` with \`create_pull_request\` into the GitHub MCP server's input; the GitHub MCP server calls \`POST /repos/shop/pulls\` over HTTPS and writes the PR URL to its output.`,
  },
  {
    text: `Claude Desktop reads the URL, sends it to the model one final time over HTTPS, and the model writes the answer with the link. The developer quits Claude Desktop, which closes each server's input and stops the three servers.`,
  },
];

type Actor = {
  who: string;
  does: string;
};

const actors: Actor[] = [
  {
    who: "Developer",
    does: `Adds three servers to the client's MCP config (\`claude_desktop_config.json\` for Claude Desktop, \`.cursor/mcp.json\` for Cursor, or \`.vscode/mcp.json\` for VS Code), each with a \`command\`, its \`args\`, and a token: \`github\`, \`sentry\`, \`filesystem\`. Then asks the question and clicks Allow when the assistant wants to open the PR.`,
  },
  {
    who: "Claude Desktop, Cursor, VS Code Copilot Chat",
    does: `Reads the config for the three servers and starts each one as a separate local process: \`docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server\`, \`npx -y @sentry/mcp-server\`, and \`npx -y @modelcontextprotocol/server-filesystem /Users/you/code/shop\`. It sends \`initialize\`, \`tools/list\`, and every \`tools/call\` to that server and reads the replies, then stops all three when the app quits. A server with a \`url\` instead of a \`command\` is reached over HTTP, so no process is started for it.`,
  },
  {
    who: "MCP server",
    does: "One separate local process per system: the GitHub server, the Sentry server, the filesystem server. Each holds a single credential and calls a single API.",
  },
  {
    who: "Model",
    does: `Picks the next tool from the list it was given: \`github__get_issue\`, then \`sentry__get_event\`, then \`filesystem__read_file\`, then \`github__create_pull_request\`. It sees only the arguments it sends and the results that come back.`,
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
  code?: string;
};

const lifecycle: LifecyclePhase[] = [
  {
    phase: "Spawn",
    detail: `When the config gives a \`command\`, the client starts that server and talks to it through its input and output. Only \`JSON-RPC\` messages may go to the output; logs go to the error output. When the config gives a \`url\`, the client connects over \`Streamable HTTP\` instead, and sends the \`Mcp-Session-Id\` from the \`initialize\` response with later requests.`,
  },
  {
    phase: "Initialize",
    detail: `One \`initialize\` request, one result, one \`notifications/initialized\`. Both sides agree on a \`protocolVersion\` and exchange \`capabilities\`. Until the handshake completes, neither side sends requests other than \`ping\`.`,
    code: initializeExample,
  },
  {
    phase: "Operate",
    detail: `Discovery first: \`tools/list\`, \`resources/list\`, \`prompts/list\`, each paginated with \`cursor\`. Then calls: \`tools/call\`, \`resources/read\`, \`prompts/get\`. The server may call back into the client (\`sampling/createMessage\`, \`roots/list\`, \`elicitation/create\`) only for capabilities the client declared. Either side may \`ping\`; \`notifications/progress\` reports progress, and \`list_changed\` or \`resources/updated\` says a cached list is stale.`,
  },
  {
    phase: "Shut down",
    detail: `\`stdio\` has no shutdown message: the client closes the server's input and ends it. \`Streamable HTTP\` ends the session with \`DELETE\` plus \`Mcp-Session-Id\`, or the server expires it; a request with an unknown id returns \`404\`, and the client must \`initialize\` again. A restart is just start and initialize once more.`,
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
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-[#252c37] border-t pt-3 text-sm">
            <p className="font-medium text-[#eef2f7]">
              Who provides the server
            </p>
            <p className="text-[#b6c0cd]">
              {renderInline(
                `Normally the vendor that owns the system, because it controls the auth, the rate limits, and the API changes. GitHub maintains \`github/github-mcp-server\`, shipped as the \`ghcr.io/github/github-mcp-server\` Docker image or the remote \`https://api.githubcopilot.com/mcp/\` endpoint, and Sentry maintains \`@sentry/mcp-server\`. When a vendor has not shipped one, a community server such as \`@modelcontextprotocol/server-github\` fills the gap. Internal systems usually get a small server written by their own team.`,
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
              `Discovery runs once per session: the client writes \`tools/list\` to each server's input, and the server writes back the tools it exposes. Before the first turn the client merges them into one list and qualifies each name with its server (\`github__get_issue\`), so two servers may expose the same name without colliding. The client and a server talk in \`JSON-RPC\` over that server's input and output; the client and the model talk over HTTPS. On every turn the client hands the model that list with the prompt; the model names a tool and its arguments; the client strips the qualifier and writes \`tools/call\` only to the server that listed that tool, and that server makes the API call. Results travel back the same way, and tokens stay in the servers.`,
            )}
          </p>
          <p className="text-[#b6c0cd] text-sm">
            One concrete run in Claude Desktop, from config to shutdown:
          </p>
          <ol className="space-y-2 text-sm">
            {callFlow.map((step, index) => (
              <li key={step.text} className="flex gap-3">
                <span className="shrink-0 font-mono text-[#6b7684]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-[#b6c0cd]">
                    {renderInline(step.text)}
                  </span>
                  {step.prompt ? (
                    <blockquote className="rounded-sm border-[#5f6b7c] border-l-2 bg-[#1c212a] px-3 py-2 text-[#e6eaf0]">
                      {step.prompt}
                    </blockquote>
                  ) : null}
                  {step.code ? (
                    <CodeBlock>
                      <CodeBlockHeader>
                        <CodeBlockTitle>{step.code.title}</CodeBlockTitle>
                        <CodeBlockActions>
                          <CodeBlockCopyButton value={step.code.value} />
                        </CodeBlockActions>
                      </CodeBlockHeader>
                      <CodeBlockContent
                        language="json"
                        highlightLines={step.code.highlightLines}
                      >
                        {step.code.value}
                      </CodeBlockContent>
                    </CodeBlock>
                  ) : null}
                </div>
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
          <p className="text-[#b6c0cd] text-sm">
            {renderInline(
              `Every message is \`JSON-RPC 2.0\`. For a local server the client starts the process and exchanges one JSON message per line over its input and output. For a remote server it uses \`Streamable HTTP\`: one endpoint, a \`POST\` that answers with JSON or an event stream, and an \`Mcp-Session-Id\` header that identifies the session. Remote servers usually add OAuth or a bearer token; local ones get credentials from the \`env\` block.`,
            )}
          </p>
          <ol className="space-y-3">
            {lifecycle.map((entry, index) => (
              <li key={entry.phase} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-[#6b7684]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <span>
                    <strong className="font-medium text-[#eef2f7]">
                      {entry.phase}
                    </strong>
                    <span className="text-[#b6c0cd]">
                      {" "}
                      - {renderInline(entry.detail)}
                    </span>
                  </span>
                  {entry.code ? (
                    <CodeBlock className="mt-2">
                      <CodeBlockHeader>
                        <CodeBlockTitle>initialize request</CodeBlockTitle>
                        <CodeBlockActions>
                          <CodeBlockCopyButton value={entry.code} />
                        </CodeBlockActions>
                      </CodeBlockHeader>
                      <CodeBlockContent language="json">
                        {entry.code}
                      </CodeBlockContent>
                    </CodeBlock>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
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
