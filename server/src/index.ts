import "./env.js";
import { createApp } from "./app.js";
import { assertRuntimeEnv } from "./config/runtime.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSocketServer } from "./services/socket.js";

assertRuntimeEnv();

const app = createApp();
const port = process.env.PORT || 5000;

// Create raw Node HTTP server for socket.io
const httpServer = createServer(app);

// Init socket.io on that server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }
});

// Inject custom socket logic
initSocketServer(io);

httpServer.listen(port, () => {
  console.log("Server and WebSockets are running on port", port);
});
