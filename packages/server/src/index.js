#!/usr/bin/env node
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ host: "127.0.0.1", port: 3000 });

wss.on("connection", (socket) => {
  console.log("TUI connected");
  socket.on("error", console.error);

  socket.onclose = () => console.log("TUI disconnected");

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("TUI says:", msg);
    socket.send(JSON.stringify({ echo: msg })); // shows up as `plc` in the TUI
  };
});

console.log("Listening on 127.0.0.1:3000");
