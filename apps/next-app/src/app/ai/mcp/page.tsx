const comparison = [
  {
    without:
      "The developer copies the ticket and the stack trace into the chat, then opens the file by hand and pastes the relevant lines.",
    with: "The assistant fetches the ticket, the trace, and the file itself, in one turn.",
  },
  {
    without:
      "Or Claude Desktop, Cursor, and VS Code Copilot Chat each ship their own GitHub client, their own Sentry client, and their own PostgreSQL client. Three hosts times three systems is nine integrations, each written and maintained separately.",
    with: "GitHub, Sentry, and PostgreSQL each expose one MCP server. Claude Desktop, Cursor, and VS Code Copilot Chat all use the same three servers, so each system is integrated once.",
  },
  {
    without:
      "You paste the stack trace into the chat. That pasted copy never changes. If the ticket gets a new comment an hour later, or someone pushes a fix, the assistant cannot see it and keeps working from the old text.",
    with: "Every tool call reads the ticket, the code, and the database at that moment, so a new comment or a pushed fix shows up on the next call.",
  },
];

const actors = [
  {
    who: "Developer",
    does: "Adds three entries to the host's MCP config file (for example .mcp.json), each with a command, its arguments, and a token: github, sentry, filesystem. Then asks the question and clicks Allow when the assistant wants to open the PR.",
  },
  {
    who: "MCP host",
    does: "Claude Desktop, Cursor, or VS Code Copilot Chat. Starts the three server processes, gives the model their tool lists (get_issue, get_event, read_file, create_pull_request), and forwards each chosen call to the matching server.",
  },
  {
    who: "MCP server",
    does: "One separate local process per system: the GitHub server, the Sentry server, the filesystem server. Each holds a single credential and calls a single API.",
  },
  {
    who: "Model",
    does: "Picks the next tool from the list it was given: get_issue, then get_event, then read_file, then create_pull_request. It sees only the arguments it sends and the results that come back.",
  },
];

const steps = [
  {
    call: 'get_issue(repo="shop", number=412)',
    result: "The ticket text, including a Sentry event id.",
  },
  {
    call: 'get_event(eventId="b3f1...")',
    result: "The stack trace. Top frame: checkout.ts line 142.",
  },
  {
    call: 'read_file(path="apps/api/src/orders/checkout.ts")',
    result: "The failing code.",
  },
  {
    call: "create_pull_request(...)",
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
              <span className="text-gray-700"> - {entry.does}</span>
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
                <code className="rounded bg-gray-100 px-1 text-gray-900">
                  {step.call}
                </code>
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
          that capability once and any MCP host can use it, with the developer
          approving whatever changes state.
        </p>
      </section>
    </main>
  );
}
