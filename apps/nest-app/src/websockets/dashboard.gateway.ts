import { Injectable } from "@nestjs/common";
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@Injectable()
@WebSocketGateway({
  namespace: "dashboard",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  io!: Server;

  private mockData: { id: number; value: number }[] = [];
  private mockDataInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.mockData = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      value: Math.floor(Math.random() * 100),
    }));
  }

  afterInit() {
    console.log("Dashboard Websockets initialized");

    /* start updating mock data every second */
    this.mockDataInterval = setInterval(() => {
      this.mockData = this.mockData.map((item) => ({
        ...item,
        value: Math.floor(Math.random() * 100), // Update value dynamically
      }));

      /* emit updated mock data to all connected clients */
      this.io.emit("mock-data-update", this.mockData);
    }, 1000);
  }

  handleConnection(clientSocket: Socket, ...args: any[]) {
    /* send the initial mock data to the newly connected client */
    clientSocket.emit("mock-data-update", this.mockData);
  }

  handleDisconnect(clientSocket: Socket) {
    // console.log(`Client disconnected: ${clientSocket.id}`);
  }

  onModuleDestroy() {
    /* clear the interval when the module is destroyed */
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }
  }
}
