const socket = io.connect('https://mediscribe.ddns.net:3000'); // Replace with your cloud server URL

////////////////////////////////////////////////////////////////////////////////////////

let localStream;
let peerConnection;
const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Doctor starts the call
async function startCall() {
  try {
    // Get user's media (video and audio)
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    if (localStream) {
      document.getElementById('localVideo').srcObject = localStream;

      // Initialize PeerConnection
      peerConnection = new RTCPeerConnection(servers);

      // Add tracks to the peer connection (audio and video)
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (!remoteVideo.srcObject) {
          remoteVideo.srcObject = event.streams[0];
          console.log("Received patient's stream");
        }
      };

      // Send audio to secondary model for processing (via socket)
      sendAudioToServer(localStream); // Pass the entire stream

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('candidate', event.candidate);
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', offer);
      console.log("Offer sent to patient");
    }

  } catch (error) {
    console.error("Error starting call:", error);
  }
}

// Function to send audio to server for transcription
function sendAudioToServer(localStream) {
  const mediaRecorder = new MediaRecorder(localStream); // Record the entire local stream (audio and video)

  mediaRecorder.ondataavailable = (event) => {
    // Emit the audio data to the server (secondary model processing)
    socket.emit('audioData', event.data);
  };

  mediaRecorder.start(1000);  // Start recording every 1 second

  // Stop the recording after some time (optional)
  setTimeout(() => {
    mediaRecorder.stop();
  }, 15000);
}

// Patient joins the call
async function joinCall() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo');
      if (!remoteVideo.srcObject) {
        remoteVideo.srcObject = event.streams[0];
        console.log("Received doctor's stream");
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };
  } catch (error) {
    console.error("Error joining call:", error);
  }
}

// Receive offer and respond with answer
socket.on('offer', async (offer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

// Handle ICE candidates from remote peer
socket.on('candidate', (candidate) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// Listen for prescription data and display it when call ends
socket.on('prescriptionGenerated', (data) => {
  console.log('Received Prescription:', data.prescription);
  document.getElementById('prescriptionText').innerText = data.prescription;
  document.getElementById('prescriptionModal').style.display = 'block';
});
