import React, { useState, useRef, useEffect } from 'react';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [fullTranscription, setFullTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptionRef = useRef('');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobileDevice(
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    );
  }, []);

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
      };
    }
  };

  const saveTranscription = () => {
    const transcription = finalTranscriptionRef.current + ' ' + interimTranscription;
    // Here you could save to local storage, send to a server, or trigger a download
    console.log('Saving transcription:', transcription);
    // For example, to trigger a download:
    const blob = new Blob([transcription], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.href = url;
    a.download = `transcription-${date}.txt`;
    a.href = url;
    a.download = 'transcription.txt';
    a.click();
  };

  if (isMobileDevice) {
    return (
      <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md">
        <h1 className="text-xl font-bold mb-4">Vet Consultation Recorder</h1>
        <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-bold">Compatibility Warning:</p>
          <p>This application may not function correctly on mobile devices. For the best experience, please use a desktop browser.</p>
        </div>
      </div>
    );
  }

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
      <div> 
        <button
            onClick={saveTranscription}
            className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full"
          >
            Save Transcription
        </button>
    </div>

    </div>
  );
};

export default RecordingInterface;