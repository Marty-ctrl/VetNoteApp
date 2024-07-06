import React, { useState, useEffect, useRef } from 'react';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isRecording && !mediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = event => {
            setAudioChunks(prevChunks => [...prevChunks, event.data]);
          };
          recorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioRef.current.src = audioUrl;
          };
          recorder.start();
          setMediaRecorder(recorder);
        })
        .catch(error => {
          console.error("Error accessing microphone:", error);
        });
    } else if (!isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  }, [isRecording, mediaRecorder, audioChunks]);

  const toggleRecording = () => {
    if (hasPermission) {
      setIsRecording(!isRecording);
      setAudioChunks([]);  // Reset audio chunks
      console.log(isRecording ? 'Stopped recording' : 'Started recording');
    } else {
      alert('Please confirm you have permission before recording.');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-xl font-bold mb-4">Vet Consultation Recorder</h1>
      
      <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p className="font-bold">Disclaimer:</p>
        <p>Before recording, ensure you have explicit permission from all individuals present in the room, including the pet owner and any staff members.</p>
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input 
            type="checkbox" 
            checked={hasPermission}
            onChange={(e) => setHasPermission(e.target.checked)}
            className="mr-2"
          />
          I confirm that I have permission from all present to record this consultation.
        </label>
      </div>

      <button
        onClick={toggleRecording}
        className={`px-4 py-2 rounded-full ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-green-500 hover:bg-green-600'
        } text-white font-bold ${!hasPermission && 'opacity-50 cursor-not-allowed'}`}
        disabled={!hasPermission}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <div className="mt-4">
        <audio ref={audioRef} controls />
      </div>
    </div>
  );
};

export default RecordingInterface;
