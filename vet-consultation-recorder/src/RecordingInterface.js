import React, { useState, useRef, useEffect } from 'react';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [fullTranscription, setFullTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const recognitionRef = useRef(null);
  const finalTranscriptionRef = useRef('');

  const toggleRecording = () => {
    if (hasPermission) {
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
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      finalTranscriptionRef.current += finalTranscript;
      setInterimTranscription(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Error during transcription:', event.error);
    };
    
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.onend = () => {
        recognitionRef.current = null;
        setIsRecording(false);
        setInterimTranscription('');
        // Add the final transcription to the full transcription
        setFullTranscription(prev => prev + ' ' + finalTranscriptionRef.current);
        finalTranscriptionRef.current = '';
      };
    }
  };

  const saveTranscription = () => {
    setFullTranscription(prev => {
      const updatedTranscription = prev + ' ' + finalTranscriptionRef.current + ' ' + interimTranscription;
      return updatedTranscription.trim();
    });
    //finalTranscriptionRef.current = '';
    //setInterimTranscription('');
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

      {(interimTranscription || finalTranscriptionRef.current) && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Current Transcription:</h2>
          <p>{finalTranscriptionRef.current}</p>
          <p className="text-gray-500">{interimTranscription}</p>
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