import threading
import queue
import speech_recognition as sr
import time
import socketio
from io import BytesIO
from primary_model import process_text  # Ensure this function is accessible from primary_model

# Socket.io client setup
sio = socketio.Client()

# Queue to hold audio chunks for processing
audio_queue = queue.Queue()

# Function to handle audio data received from the front-end via WebRTC
def handle_audio_data(audio_bytes):
    print("Received audio data from WebRTC")

    # Transcribe the audio data
    transcribed_text = transcribe_audio(audio_bytes)
    if transcribed_text:
        print(f"Transcribed Text: {transcribed_text}")
        
        # Send the transcribed text to the primary model for processing
        result = process_text(transcribed_text)
        print(f"Processed Result: {result}")
        
        # After processing the transcribed text and generating a prescription:
        print(f"Generated Prescription: {result}")
        sio.emit('prescription', {'prescription': result})  # Emit the result to the front end (patient)
    else:
        print("Error in transcription")

# Function to transcribe audio from WebRTC
def transcribe_audio(audio_bytes):
    recognizer = sr.Recognizer()
    audio_data = sr.AudioData(audio_bytes, 16000, 2)  # Assuming 16kHz, 2 channels for WebRTC audio
    try:
        transcribed_text = recognizer.recognize_google(audio_data)
        print(f"Transcribed Text: {transcribed_text}")
        return transcribed_text
    except Exception as e:
        print(f"Error in audio transcription: {e}")
        return None

# Socket.io event for receiving audio data from WebRTC (sent from the front-end)
@sio.event
def audio_data(data):
    audio_bytes = BytesIO(data)  # Convert the byte data from WebRTC into a byte stream
    handle_audio_data(audio_bytes)  # Process the audio data

@sio.event
def connect_error(data):
    print(f"Connection failed: {data}")

@sio.event
def disconnect():
    print("Disconnected from server")

# Function to connect to the server
def connect_to_server():
    try:
        if sio.connected:
            sio.disconnect()  # Disconnect the client if already connected

        sio.connect('https://mediscribe.ddns.net:3000')  # Replace with your actual server URL
        print("Connected to the server successfully.")
    except Exception as e:
        print(f"Error connecting to server: {e}")

# Function to listen to the microphone and transcribe audio chunks in real-time
def listen_and_transcribe():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    # Continuously listen and transcribe audio in chunks
    with mic as source:
        while True:
            try:
                # Record a chunk of audio
                print("Listening...")
                audio = recognizer.listen(source, timeout=10)  # Timeout after 10 seconds
                print("Transcribing...")

                # Transcribe the audio
                transcribed_text = recognizer.recognize_google(audio)
                print(f"Transcribed Text: {transcribed_text}")

                # Send the transcribed text to the primary model for processing
                result = process_text(transcribed_text)
                print(f"Processed Result: {result}")

                # Send the result (prescription) back to the frontend
                sio.emit('prescription', {'prescription': result})

            except sr.WaitTimeoutError:
                print("No audio detected for a while, retrying...")
            except Exception as e:
                print(f"Error in listening or transcription: {e}")

# Function to continuously send audio data to WebRTC clients (if needed)
def send_audio_to_clients():
    # Example function that could handle sending audio data to WebRTC clients
    while True:
        time.sleep(5)  # Adjust as necessary
        # Here, you would send audio data to the WebRTC front end using WebSocket
        pass

# Thread for listening and transcribing audio from the microphone
def start_audio_thread():
    audio_thread = threading.Thread(target=listen_and_transcribe)
    audio_thread.daemon = True  # Daemonize to exit with main program
    audio_thread.start()

# Thread for sending audio to clients (if needed)
def start_send_audio_thread():
    send_thread = threading.Thread(target=send_audio_to_clients)
    send_thread.daemon = True
    send_thread.start()

# Connect to the WebSocket server
connect_to_server()

# Start the threads
start_audio_thread()
start_send_audio_thread()

# Keep the main thread running while handling incoming audio data and transcription
while True:
    time.sleep(1)  # Keep the program running
