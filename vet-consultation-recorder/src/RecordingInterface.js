import React, { useState, useRef, useEffect } from 'react';
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import ReactMarkdown from 'react-markdown';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [fullTranscription, setFullTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptionRef = useRef('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    console.log('Saving transcription:', transcription);
    const blob = new Blob([transcription], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.href = url;
    a.download = `transcription-${date}.txt`;
    a.click();
  };

  const sendToAzureOpenAI = async (transcription) => {
    setIsLoading(true);
    console.log('Endpoint:', process.env.REACT_APP_AZURE_OPENAI_ENDPOINT);
    console.log('Key:', process.env.REACT_APP_AZURE_OPENAI_KEY);

    const client = new OpenAIClient(
      process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
      new AzureKeyCredential(process.env.REACT_APP_AZURE_OPENAI_KEY)
    );

    try {
      const response = await client.getChatCompletions(
        process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT,
        [
          { role: "system", content: "You are a veterinary assistant. Summarize the key points from the consultation transcript provided into a SOAP format." },
          { role: "user", content: transcription }
        ]
      );

      console.log(response.choices[0].message.content);
      setAiResponse(response.choices[0].message.content);
    } catch (error) {
      console.error("Error calling Azure OpenAI:", error);
      setAiResponse("Error processing the transcription.");
    } finally {
      setIsLoading(false);
    }
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
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
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

      <div className="flex space-x-4 mb-4">
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

        <button
          onClick={saveTranscription}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full"
        >
          Save Transcription
        </button>

        <button
          onClick={() => sendToAzureOpenAI(finalTranscriptionRef.current)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-full"
        >
          Analyze with AI
        </button>
      </div>

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

      {isLoading && (
        <div className="mt-2 text-purple-500 animate-pulse">
          Analyzing transcription...
        </div>
      )}

      {aiResponse && (
        <div className="mt-4 p-3 bg-purple-100 rounded">
          <h2 className="font-bold mb-2">AI Analysis:</h2>
          <ReactMarkdown>{aiResponse}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default RecordingInterface;