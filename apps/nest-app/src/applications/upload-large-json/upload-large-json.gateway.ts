import { Injectable } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server } from "socket.io";

@Injectable() /* make it injectable */
@WebSocketGateway({ namespace: "upload-large-json-progress", cors: true })
export class UploadLargeJsonGateway {
  @WebSocketServer()
  server!: Server;

  sendProgress(data: { progress: number }) {
    this.server.emit("saving-progress", data);
  }

  disconnect() {
    this.server.disconnectSockets(true);
  }
}
