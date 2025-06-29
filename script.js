const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Stream
let localStream;

// Peer Connections
let localPeerConnection;
let remotePeerConnection;

async function openLocalWebCam() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;
}

const config = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"] },
  ],
};

// Listen to the ICE Candidates coming for both caller and receiver
socket.on("ice", (candidate) => {
  if (localPeerConnection) {
    localPeerConnection.addIceCandidate(candidate);
    console.log("Candidate from remote peer", candidate);
  }
  if (remotePeerConnection) {
    remotePeerConnection.addIceCandidate(candidate);
    console.log("Candidate from local peer ", candidate);
  }
});

async function call() {
  console.log("I AM CALLER");
  localPeerConnection = new RTCPeerConnection(config);

  // Add tracks to my local peer connection
  localStream.getTracks().forEach((track) => {
    localPeerConnection.addTrack(track, localStream);
  });

  //  Create an "offer"
  const offer = await localPeerConnection.createOffer();

  // Set my "local-description"
  await localPeerConnection.setLocalDescription(offer);

  // Send the offer to the "remote-peer"
  socket.emit("offer", offer);

  // Send the ICE Candidates now [Trickling ICE Candidates - Sending then after sending the offer]
  localPeerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", e.candidate);
    }
  };

  // Listen for an answer
  socket.on("answer", (answer) => {
    // Set the received answer to "remote-description"
    localPeerConnection.setRemoteDescription(answer);
  });

  // Check for Connection state
  localPeerConnection.onconnectionstatechange = () => {
    if (localPeerConnection.connectionState === "connected") {
      console.log("Connected successfully");
    }
  };

  // After connecting, the tracks will get sent to each other, so set it to video element
  localPeerConnection.ontrack = (e) => {
    console.log(e);
    remoteVideo.srcObject = e.streams[0];
  };
}

// For remote peer - if they get an 'offer'
socket.on("offer", async (offer) => {
  console.log("I AM RECEIVER");

  // Create a connection for remote peer
  remotePeerConnection = new RTCPeerConnection(config);

  remotePeerConnection.ontrack = (e) => {
    console.log("Got remote stream from caller: ", e.streams[0]);
    remoteVideo.srcObject = e.streams[0];
  };

  // Set the offer it received as its "remote-description"
  await remotePeerConnection.setRemoteDescription(offer);

  // Open the local webcam of the "remote-peer"
  await openLocalWebCam();

  // Add tracks to the "localStream" of the remote peer
  localStream.getTracks().forEach((track) => {
    remotePeerConnection.addTrack(track, localStream);
  });

  // Create the answer
  const answer = await remotePeerConnection.createAnswer();

  // Set the answer created as its "local-description"
  await remotePeerConnection.setLocalDescription(answer);

  // Send this answer to the caller
  socket.emit("answer", answer);

  // Send the remote's ICE Candidates to the "caller"
  remotePeerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice", e.candidate);
    }
  };

  // Check for connected state
  remotePeerConnection.onconnectionstatechange = () => {
    if (remotePeerConnection.connectionState === "connected") {
      console.log("Connected successfully");
    }
  };
});
