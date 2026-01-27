"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { msg: string; timestamp: number }[]
  >([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    // const socket = new WebSocket("ws://localhost:5000"); // for local Bun server
    const socket = new WebSocket("wss://bun.localhost");

    socket.onopen = () => {
      console.log("Connected to Bun WebSocket server!");
      setMessages((prev) => [
        ...prev,
        { msg: "Connected! You can start chatting.", timestamp: Date.now() },
      ]);
    };

    socket.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        setMessages((prev) => [...prev, messageData]);
      } catch (error) {
        // Fallback for non-JSON messages
        const text = event.data;
        setMessages((prev) => [...prev, { msg: text, timestamp: Date.now() }]);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from server");
      setMessages((prev) => [
        ...prev,
        { msg: "Disconnected. Refresh to reconnect.", timestamp: Date.now() },
      ]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [
        ...prev,
        { msg: "Error: Could not connect to server.", timestamp: Date.now() },
      ]);
    };

    setWs(socket);

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messages; // suppress use exhaustive-deps warning
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && input.trim()) {
      ws.send(input);
      setMessages((prev) => [
        ...prev,
        { msg: `You: ${input}`, timestamp: Date.now() },
      ]);
      setInput("");
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        fontFamily: "system-ui",
      }}
    >
      <h1>Simple WebSocket (TLS) Chat Demo</h1>
      <p>Backend: Bun | Frontend: Next.js</p>
      <p>Using Caddy for TLS termination and reverse proxy</p>
      <p>WebSocket URL: "wss://bun.localhost"</p>
      <div
        style={{
          border: "1px solid #ccc",
          height: "400px",
          overflowY: "auto",
          padding: "16px",
          marginBottom: "16px",
          background: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        {messages.map((message) => (
          <div
            key={`${message.msg}-${message.timestamp}`}
            style={{ margin: "8px 0" }}
          >
            {message.msg.startsWith("You:") ? (
              <strong style={{ color: "blue" }}>{message.msg}</strong>
            ) : (
              message.msg
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "12px 20px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
