import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { Room } from "./types";
import path from "path";

import cors from "cors";

const port = 8080;
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "../client/build")));
const server = createServer(app);

const rooms: Map<string, Room> = new Map();

const io = new Server(server, {
  cors: {}
});

io.on("connection", (socket) => {
  socket.on("newRoom", (data: { roomId: string }) => {
    const { roomId } = data;

    const room: Room = {
      id: roomId
    };
    rooms.set("test-room", room);

    console.log("emitting new room");
    socket.broadcast.emit("currentOffer", { room });
  });

  socket.emit("currentOffer", {
    room: rooms.get("test-room")
  });

  socket.on("disconnect", () => {
    rooms.delete("test-room");
  });
});

app.get("", (req, res) => {
  res.send("hello");
});

server.listen(port, () => {
  console.debug(`Server is running on port ${port}`);
});
