import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Room } from "./types";

import "./index.css";
import { createPeerConnection } from "./webRtc/createPeerConnection";
import { appConfig } from "./config";

const username = `Max-${Math.random() * 10000}`;

const socket = io(appConfig.serverUrl);

let myPeer: RTCPeerConnection;
let remoteStream: MediaStream;
let localStream: MediaStream;
let remoteVideoEl: HTMLVideoElement;

socket.on("icecandidates", ({ candidates }: { candidates: RTCIceCandidate[] | undefined }) => {
  console.log("candidate", candidates);
  if (candidates) {
    candidates?.forEach((candidate) => {
      myPeer.addIceCandidate(candidate);
    });
  }
});

const requestPermission = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  return stream;
};

const createPeer = async () => {
  console.log("create peer");
  myPeer = createPeerConnection();

  localStream.getTracks().forEach((track) => {
    myPeer.addTrack(track, localStream);
  });

  myPeer.addEventListener("icecandidateerror", (data) => {
    console.error(data);
  });

  myPeer.addEventListener("signalingstatechange", (event) => {
    console.log(event);
    console.log(myPeer.signalingState);
  });

  remoteStream = new MediaStream();
  remoteVideoEl.srcObject = remoteStream;

  // * listen for data from other peer
  myPeer.addEventListener("track", (event) => {
    const { streams } = event;

    console.log("Got a track from the other peer!! How excting");
    streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      console.log("Here's an exciting moment... fingers cross");
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

      console.log("got new offer");
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
      console.log("create new offer");
      await createPeer();

      const offer = await myPeer.createOffer();

      await myPeer.setLocalDescription(offer);

      // * gather all ice candidates before sending offer
      myPeer.addEventListener("icecandidate", async (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit("offererIceCandidate", { iceCandidate: event.candidate });
      });

      socket.on("answererIceCandidate", async ({ iceCandidate }) => {
        console.debug("answererIceCandidate");

        const rmeoteIceCandidate = new RTCIceCandidate(iceCandidate);

        await myPeer.addIceCandidate(rmeoteIceCandidate);
      });

      console.debug("Emitting new offer");
      socket.emit("newOffer", {
        username,
        offer,
        iceCandidates: [],
      });

      socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; iceCandidates: RTCIceCandidate[] }) => {
        console.debug("Got an answer!");
        const answerDescription = new RTCSessionDescription(data.answer);

        await myPeer.setRemoteDescription(answerDescription);
      });
    } else {
      await createPeer();

      const offerDescription = new RTCSessionDescription(room.offer!);

      await myPeer.setRemoteDescription(offerDescription);

      const answer = await myPeer.createAnswer();

      await myPeer.setLocalDescription(answer);

      // * gather all ice candidates before sending offer
      myPeer.addEventListener("icecandidate", (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit("answererIceCandidate", { iceCandidate: event.candidate });
      });

      socket.on("offererIceCandidate", async ({ iceCandidate }) => {
        console.debug("answererIceCandidate");

        const rmeoteIceCandidate = new RTCIceCandidate(iceCandidate);

        await myPeer.addIceCandidate(rmeoteIceCandidate);
      });

      socket.emit("answer", { answer });
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
