import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Room } from "./types";

import "./index.css";
import { appConfig } from "./config";
import Peer from "peerjs";

const socket = io(appConfig.serverUrl);

let myPeer: Peer;
let remoteStream: MediaStream;
let localStream: MediaStream;
let remoteVideoEl: HTMLVideoElement;

const requestPermission = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  return stream;
};

const createPeer = async () => {
  console.debug("create peer");
  myPeer = new Peer();

  await new Promise<void>((res) => {
    myPeer.addListener("open", (id) => {
      console.log("id", id);
      res();
    });
  });

  remoteStream = new MediaStream();
  remoteVideoEl.srcObject = remoteStream;

  // * listen for data from other peer
  myPeer.addListener("call", (call) => {
    call.answer(localStream);

    call.addListener("stream", (stream) => {
      console.debug("Here's an exciting moment... fingers cross");

      stream.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    });
  });

  return myPeer;
};

function App() {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [room, setRoom] = useState<Room>();

  useEffect(() => {
    socket.on("currentOffer", async (response: { room?: Room }) => {
      const { room } = response;

      if (!room) {
        return;
      }

      console.debug("got new offer");
      console.debug(room);

      setRoom(room);
    });
  }, []);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoEl = remoteVideoRef.current;
    }
  }, []);

  useEffect(() => {
    requestPermission().then((stream) => {
      myVideoRef.current!.srcObject = stream;
      // remoteVideoRef.current!.srcObject = stream;
      remoteVideoRef.current!.srcObject = remoteStream;
      localStream = stream;
    });
  }, []);

  const clickHandler = async () => {
    if (!room) {
      console.debug("create new offer");
      const peer = await createPeer();

      console.log("peer", peer.id);

      console.debug("Emitting new offer");
      socket.emit("newRoom", {
        roomId: peer.id,
      });
    } else {
      console.debug("accepting existing offer and creating an answer");
      console.debug("room", room);

      const myPeer = await createPeer();

      const connection = myPeer.call(room.id, localStream);

      connection.on("stream", (rmtStream) => {
        rmtStream.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      });
    }
  };

  return (
    <div
      className="bg-slate-500 flex flex-col overflow-hidden"
      style={{ height: "100vh" }}>
      <div className="flex flex-col flex-1 mt-auto gap-4">
        <div className="justify-center flex-1 relative w-full">
          <video
            className="absolute l-0 t-0 b-0 r-0 w-full h-full"
            autoPlay
            playsInline
            ref={remoteVideoRef}
          />
        </div>
        <div className="justify-center mt-auto relative flex-1 w-full">
          <video
            className="absolute l-0 t-0 b-0 r-0 w-full h-full"
            autoPlay
            playsInline
            muted
            ref={myVideoRef}
          />
        </div>
      </div>
      <div className="flex flex-row py-12 justify-center">
        <button
          className={`py-2 px-8 rounded-2xl ${room ? "bg-green-700" : "bg-blue-600"}`}
          onClick={clickHandler}>
          <p className="text-2xl font-normal text-white">{room ? "join" : "call"}</p>
        </button>
      </div>
    </div>
  );
}

export default App;
