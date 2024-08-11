export type Room = {
  id: string;
  offer?: RTCSessionDescriptionInit;
  offerrerIceCandidates: RTCIceCandidate[];
  answer?: RTCSessionDescriptionInit;
  answererIceCandidates: RTCIceCandidate[];
};
