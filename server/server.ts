import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { Room } from "./types";
import path from "path";

const port = 8080;
const app = express();
app.use(express.static(path.join(__dirname, "../client/build")));
const server = createServer(app);

const rooms: Map<string, Room> = new Map();

const io = new Server(server, {
  cors: {}
});

io.on("connection", (socket) => {
  socket.on(
    "newOffer",
    (data: {
      username: string;
      offer: RTCSessionDescriptionInit;
      iceCandidates: RTCIceCandidate[];
    }) => {
      const { offer, iceCandidates } = data;

      const room: Room = {
        id: "test-room",
        offer,
        offerrerIceCandidates: iceCandidates,
        answererIceCandidates: []
      };
      rooms.set("test-room", room);

      socket.broadcast.emit("currentOffer", { room });
    }
  );

  socket.emit("currentOffer", {
    room: rooms.get("test-room")
  });

  socket.on("answer", (data) => {
    socket.broadcast.emit("answer", data);
  });

  socket.on("offererIceCandidate", (data: { candidate: RTCIceCandidate }) => {
    const room = rooms.get("test-room");
    room.offerrerIceCandidates.push(data.candidate);

    rooms.set("tes-room", room);
  });

  socket.on("disconnect", () => {
    // TODO perform cleanup
    rooms.delete("test-room");
  });
});

app.get("", (req, res) => {
  res.send("hello");
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
