Bun.serve({
  port: 5000,

  fetch(req, server) {
    const upgraded = server.upgrade(req);
    if (upgraded) return; // upgrade succeeded → Bun handles WS now

    // fallback if not WS request
    return new Response("Not a WebSocket request", { status: 400 });
  },

  websocket: {
    open(ws) {
      console.log("Client connected");
      ws.send(JSON.stringify({
        msg: "Welcome! Send me anything → I'll echo it.",
        timestamp: Date.now(),
      }));
    },

    message(ws, message) {
      // message can be string / Buffer / BunFile
      const text = message instanceof Buffer ? message.toString() : message;
      console.log("→", text);
      ws.send(JSON.stringify({ msg: `Echo: ${text}`, timestamp: Date.now() }));
    },

    close(ws, code, reason) {
      console.log("Client disconnected", code, reason);
    },
  },
});

console.log("Bun WebSocket server running on ws://localhost:5000");
