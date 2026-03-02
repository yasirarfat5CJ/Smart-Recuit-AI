import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000"; // backend URL

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: localStorage.getItem("token") });
  },
});

export default socket;
