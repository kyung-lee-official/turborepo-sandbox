# Why `Observable` for SSE?

## SSE at the wire level

Server-Sent Events (SSE) are just a long-lived HTTP response with `Content-Type: text/event-stream`. The server writes lines like:

```
data: {"phase":"processing","progress":50}

data: {"phase":"complete"}
```

No special protocol — just `res.write()` over a kept-alive connection.

## Why NestJS demands `Observable`

NestJS's `@Sse()` decorator requires the handler to return `Observable<MessageEvent>` (from RxJS). This is a framework-level design choice — the decorator internally calls `.subscribe()` and manages the response lifecycle based on the Observable's emissions.

## What `Observable` gives us here

| Feature                           | What it means in practice                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Automatic teardown**            | The function returned from the Observable constructor runs when the client disconnects. This cleanly unsubscribes Redis pub/sub and clears heartbeats — no manual `req.on('close')` needed. |
| **Multiple values over time**     | A Promise resolves once. An Observable can push many updates as the job progresses through phases.                                                                                          |
| **Explicit completion/error**     | `observer.complete()` gracefully ends the stream. `observer.error()` propagates failures. NestJS handles the HTTP response accordingly.                                                     |
| **Declarative SSE with `@Sse()`** | The decorator takes care of headers (`Content-Type`, `Cache-Control`, `Connection`) and `res.flushHeaders()` so we don't write boilerplate.                                                 |

## What we lose without `Observable`

If we dropped Observable and used raw `@Res()` + `res.write()`:

1. **Manual cleanup** — must listen to `req.on('close')` to tear down Redis subscriptions and heartbeat timers. Forgetting this leaks connections.
2. **More boilerplate** — manually setting SSE headers, calling `flushHeaders()`, formatting `data:` lines, and calling `res.end()` on completion/error.
3. **No `@Sse()` decorator** — lose NestJS's built-in SSE lifecycle management. You're back to Express/Node-level response plumbing.
4. **Harder composition** — if we later want to `filter`, `debounce`, or `retry` the event stream, RxJS operators make that trivial. Raw callbacks don't.

In this codebase, `Observable` is used as a **lifecycle wrapper** — its real value is that the teardown function (the `return () => { teardown(); }` at the bottom of the constructor) runs reliably when the client disconnects, preventing Redis connection leaks and zombie heartbeat intervals.
