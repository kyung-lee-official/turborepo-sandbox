import { io, type Socket } from "socket.io-client";

let chatSocket: Socket | null = null;
let dashboardSocket: Socket | null = null;

export const getChatSocket = (): Socket => {
  if (!chatSocket) {
    /* initialize the chatSocket instance if it doesn't exist */
    chatSocket = io(`${process.env.NEXT_PUBLIC_NESTJS}/chat` || "", {
      autoConnect: false /* prevent auto-connect */,
    });
  }
  return chatSocket;
};

export const getDashboardSocket = (): Socket => {
  if (!dashboardSocket) {
    /* initialize the dashboardSocket instance if it doesn't exist */
    dashboardSocket = io(
      `${process.env.NEXT_PUBLIC_NESTJS}/dashboard` || "",
      {
        autoConnect: true,
      },
    );
  }
  return dashboardSocket;
};
