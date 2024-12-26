const socket = io.connect('https://mediscribe.ddns.net:3000', {
    transports: ['websocket']
});

let localStream;
let peerConnection;

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Function to initialize local media stream and create peer connection
async function initializeLocalStream() {
    try {
        // Get local video and audio stream
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        document.getElementById('localVideo').srcObject = localStream;

        // Add local stream tracks to the peer connection
        if (peerConnection) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }
    } catch (error) {
        console.error("Error accessing local media:", error);
    }
}

// Create a new peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    // Send ICE candidates to the other peer
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    // Listen for remote stream and display it
    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
}

// Initialize the local stream and peer connection
createPeerConnection();
initializeLocalStream();

// Handle offer received from the doctor
socket.on('offer', async (offer) => {
    if (!peerConnection) {
        createPeerConnection();
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

// Handle ICE candidates from the remote peer
socket.on('candidate', (candidate) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log("ICE Candidate added successfully"))
            .catch((e) => console.error("Error adding ICE Candidate", e));
    }
});

// Capture prescription event (Display Prescription Modal)
socket.on('prescriptionGenerated', (data) => {
    console.log("Prescription Received:", data.prescription);

    const prescriptionModal = document.getElementById("prescription-modal");
    const prescriptionText = document.getElementById("prescriptionText");

    prescriptionModal.style.display = "flex";

    // Format diseases and drugs into the prescription format
    let formattedPrescription = data.diseases.map((disease, index) => {
        return `${disease}: ${data.drugs[index]}`;
    }).join('\n');

    prescriptionText.innerText = `Prescriptions:\n${formattedPrescription}\n\nFull Prescription: ${data.prescription}`;
});

// Handle call end event explicitly triggered by the doctor
socket.on('endCall', (data) => {
    console.log("Call ended:", data.message);

    // Stop streams and cleanup resources
    closeMediaStreams();

    // Display the call end modal
    const endCallModal = document.getElementById("endCallModal");
    if (endCallModal) {
        endCallModal.style.display = "block";
    }
});

// Close media streams and cleanup resources
function closeMediaStreams() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;
}
