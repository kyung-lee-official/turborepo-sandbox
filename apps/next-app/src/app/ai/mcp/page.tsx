const actors = [
  {
    actor: "Developer",
    role: "The human at the keyboard.",
    does: [
      "Writes the MCP server entries into the host's config once (command + args + env).",
      "Asks the question in plain language.",
      "Approves, edits, or rejects each tool call the assistant proposes.",
      "Reviews the diff or PR and merges it.",
    ],
  },
  {
    actor: "MCP host",
    role: "The AI application: Claude Desktop, Claude Code, Cursor, VS Code.",
    does: [
      "Spawns each configured server as a child process (stdio) or connects to a remote one (streamable HTTP).",
      "Runs the model loop and holds one MCP client per server.",
      "Sends the model the aggregated tool catalog (name, description, JSON Schema).",
      "Routes the model's chosen tool call to the right client and returns the result to the model.",
      "Shows the approval prompt before a side-effecting call runs.",
    ],
  },
  {
    actor: "MCP client",
    role: "One per server, living inside the host.",
    does: [
      "Completes the initialize handshake and calls tools/list on connect.",
      "Serializes one tool call into a JSON-RPC 2.0 request.",
      "Returns the server's result or error verbatim to the host.",
    ],
  },
  {
    actor: "GitHub MCP server",
    role: "Local process on the developer's machine, holding one GitHub token.",
    does: [
      "Exposes narrow tools such as get_issue, list_commits, create_pull_request.",
      "Calls the GitHub REST API with the developer's token.",
      "Returns issue text, commit metadata, or the created PR URL as tool output.",
    ],
  },
  {
    actor: "Filesystem MCP server",
    role: "Local process rooted at the repository directory.",
    does: [
      "Exposes read_file, grep, and write_file only under the allowed roots.",
      "Rejects paths outside the root.",
      "Returns file contents to the model so it can read the failing code.",
    ],
  },
  {
    actor: "Sentry MCP server",
    role: "Local process holding a Sentry API token.",
    does: [
      "Exposes get_event and list_issues for one organization.",
      "Returns the stack trace and breadcrumbs for the event id found in the GitHub issue.",
    ],
  },
  {
    actor: "Postgres MCP server",
    role: "Local process connecting with a read-only database role.",
    does: [
      "Exposes a single query tool restricted to SELECT.",
      "Runs the model's read-only SQL and returns rows.",
    ],
  },
  {
    actor: "Upstream systems",
    role: "GitHub, Sentry, Postgres, the local disk.",
    does: [
      "See only the MCP server's credential, never the model or the host.",
      "Behave exactly as before: no MCP-specific endpoints, no schema changes.",
    ],
  },
];

const steps = [
  {
    who: "Developer",
    what: "Adds four server entries to the host's MCP config, then restarts the host. Each server process starts and advertises its tools.",
  },
  {
    who: "Developer",
    what: 'Types: "Checkout returns 500 for about 2% of orders. Find the cause in the repo and open a PR."',
  },
  {
    who: "Host",
    what: "Sends the conversation plus the merged tool catalog to the model. The model sees get_issue, read_file, get_event, and query as callable functions.",
  },
  {
    who: "Model then GitHub server",
    what: "The model calls get_issue with owner=acme, repo=shop, number=412. The GitHub client forwards it, the server hits the REST API, and the issue text comes back with a Sentry event id inside.",
  },
  {
    who: "Model then Sentry server",
    what: "The model calls get_event with that event id. The server returns the stack trace: top frame at apps/api/src/orders/checkout.ts line 142.",
  },
  {
    who: "Model then Filesystem server",
    what: "The model calls read_file for that path. The host asks the developer to approve; the developer clicks Allow; the file contents are returned.",
  },
  {
    who: "Model then Postgres server",
    what: "The model calls query with a SELECT against orders for the failing order id. The read-only role executes it and returns the row.",
  },
  {
    who: "Model then Developer",
    what: "The model states the root cause (a null currency code not handled on refunds) and proposes a patch. The developer reviews it.",
  },
  {
    who: "Model then GitHub server",
    what: "After approval, the model calls create_pull_request. The server opens the PR with the developer's token and returns the PR URL.",
  },
  {
    who: "Developer",
    what: "Reviews the PR in GitHub, adjusts if needed, and merges.",
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

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">
          Most common scenario today: fixing a production bug from the editor
        </h2>
        <p className="text-gray-700 text-sm">
          A support ticket says checkout fails for a small share of orders. The
          developer does not open five browser tabs, does not paste a stack
          trace into the chat, and does not hand-write the SQL. Instead, the
          coding assistant reads the issue, fetches the trace, opens the file,
          checks the data, and opens the pull request, with the developer
          approving every step that touches a system.
        </p>
        <p className="text-gray-700 text-sm">
          This is the most common shape of MCP usage because the first hosts to
          ship MCP clients were coding assistants, and the first-party reference
          servers (filesystem, git, GitHub, Postgres, Sentry, Puppeteer) map
          directly onto what a debugging session needs.
        </p>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Who does what</h2>
        <div className="space-y-4">
          {actors.map((entry) => (
            <div key={entry.actor} className="space-y-1">
              <h3 className="font-medium text-gray-900">
                {entry.actor}
                <span className="ml-2 font-normal text-gray-500 text-sm">
                  {entry.role}
                </span>
              </h3>
              <ul className="list-inside list-disc space-y-0.5 pl-1 text-gray-700 text-sm">
                {entry.does.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Step by step</h2>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.what} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong className="font-medium text-gray-900">
                  {step.who}
                </strong>
                <span className="text-gray-700"> - {step.what}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">What does not happen</h2>
        <ul className="list-inside list-disc space-y-1 text-gray-700 text-sm">
          <li>
            The model never receives the GitHub token, the Postgres password, or
            the Sentry key. Each server holds only its own credential.
          </li>
          <li>
            The model never connects to GitHub, Sentry, or Postgres directly.
            Every byte crosses an MCP client, an MCP server, and that server's
            own API client.
          </li>
          <li>
            The servers are narrow on purpose: the filesystem server is rooted
            at the repository, the Postgres role can only SELECT, and the GitHub
            token can be scoped to one repository.
          </li>
          <li>
            Side-effecting calls (write_file, create_pull_request) wait for the
            developer to approve them. Read-only calls usually run without a
            prompt, depending on host policy.
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg bg-white/50 p-6">
        <h2 className="font-semibold text-lg">Transports</h2>
        <ul className="list-inside list-disc space-y-1 text-gray-700 text-sm">
          <li>
            <code className="rounded bg-gray-100 px-1">stdio</code> - the host
            spawns a local server as a child process and talks over stdin and
            stdout. This is what the filesystem, git, and database servers use.
          </li>
          <li>
            <code className="rounded bg-gray-100 px-1">streamable HTTP</code> -
            the host connects to a remote server over HTTP, with optional SSE
            streaming for server-initiated messages. This is what hosted
            integrations (issue trackers, design tools) use.
          </li>
        </ul>
      </section>
    </main>
  );
}
