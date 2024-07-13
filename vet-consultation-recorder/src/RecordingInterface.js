import React, { useState, useRef, useEffect } from 'react';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [fullTranscription, setFullTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const recognitionRef = useRef(null);
  const interimTranscriptionRef = useRef('');
  const lastProcessedResultIndex = useRef(0); // Keep track of the last processed result index

  const toggleRecording = () => {
    if (hasPermission) {
      setIsRecording(!isRecording);
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      alert('Please confirm you have permission before recording.');
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      setFullTranscription(prev => prev + '\nSpeech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = lastProcessedResultIndex.current; i < event.results.length; i++) {
        interimText += event.results[i][0].transcript + ' ';
      }
      lastProcessedResultIndex.current = event.results.length;
      interimTranscriptionRef.current = interimText.trim();
      setInterimTranscription(interimTranscriptionRef.current);
    };

    recognition.onerror = (event) => {
      console.error('Error during transcription:', event.error);
    };

    recognition.onend = () => {
      // Restart recognition automatically if still in recording mode
      if (isRecording) {
        setTimeout(() => {
          recognition.start();
        }, 500); // Small delay to manage mobile automatic stopping
      }
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.onend = () => {
        recognitionRef.current = null;
      };
      // Reset last processed index when stopping
      lastProcessedResultIndex.current = 0;
    }
  };

  const saveTranscription = () => { 
    setFullTranscription(prev => {
      const updatedTranscription = prev + ' ' + interimTranscriptionRef.current;
      return updatedTranscription;
    });
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

      {isRecording && (
        <div className="mt-2 text-red-500 animate-pulse">
          Recording in progress...
        </div>
      )}

      {interimTranscription && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Live Transcription:</h2>
          <p>{interimTranscription}</p>
        </div>
      )}

      <button
        onClick={saveTranscription}
        className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full"
      >
        Save Transcription
      </button>

      {fullTranscription && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Full Transcription:</h2>
          <p>{fullTranscription}</p>
        </div>
      )}
    </div>
  );
};

export default RecordingInterface;
