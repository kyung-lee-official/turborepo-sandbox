import { Injectable } from "@nestjs/common";
import type { Socket } from "socket.io";

export type MsgBody = {
  message: string;
};

@Injectable()
export class ChatService {
  singletonTaskProgressValue: number = 0;
  chatHistory: string[] = [];

  sentToRoom(body: MsgBody, clientSocket: Socket) {
    try {
      const { message } = body;
      this.chatHistory.push(`Client ${clientSocket.id}: ${message}`);
      /**
       * emit the message to all connected sockets within specified namespace (nsp)
       *
       * why not use clientSocket.broadcast.emit?
       * The broadcast method of a Socket instance emits an event to all other
       * connected clients in the same namespace except the sender.
       */
      clientSocket.nsp.emit("s2c", this.chatHistory);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error processing message: ${error.message}`);
      } else {
        console.error("Unknown error occurred");
      }
      clientSocket.emit("error", {
        message: "An error occurred on the server",
      });
    }
  }
}
