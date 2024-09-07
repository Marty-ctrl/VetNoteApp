import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const RecordingInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [finalTranscriptionRef, setfinalTranscriptionRef] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [editableTranscription, setEditableTranscription] = useState('');
  const [soapNotes, setSoapNotes] = useState('');
  const [vitalsInfo, setVitalsInfo] = useState('');
  const [charges, setCharges] = useState('');
  const [differentials, setDifferentials] = useState('');
  const [isLoadingSoap, setIsLoadingSoap] = useState(false);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [isLoadingDifferentials, setIsLoadingDifferentials] = useState(false);
  const [clientSummary, setClientSummary] = useState('');
  const [isLoadingClientSummary, setIsLoadingClientSummary] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientBreed, setPatientBreed] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientHistory, setPatientHistory] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [customNoteStyle, setCustomNoteStyle] = useState('');
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [showCustomNoteStyle, setShowCustomNoteStyle] = useState(false);

  const recognizerRef = useRef(null);
  const transcriptionRef = useRef('');

  useEffect(() => {
    // Clean up the recognizer when the component unmounts
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
    };
  }, []);

  const startRecording = () => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      process.env.REACT_APP_AZURE_SPEECH_KEY,
      process.env.REACT_APP_AZURE_SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
      console.log(`RECOGNIZING: Text=${e.result.text}`);
      setEditableTranscription(transcriptionRef.current + e.result.text);
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
        transcriptionRef.current += e.result.text + " ";
        setEditableTranscription(transcriptionRef.current);
      }
      else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log("CANCELED: Did you update the subscription info?");
      }
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = (s, e) => {
      console.log("\n    Session stopped event.");
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizerRef.current = recognizer;

    recognizer.startContinuousRecognitionAsync();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          setIsRecording(false);
          recognizerRef.current = null;
        },
        (err) => {
          console.error("Error stopping recognition:", err);
          setIsRecording(false);
          recognizerRef.current = null;
        }
      );
    }
  };

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

  const sendToAzureOpenAI = async (transcription, prompt, setStateFunction, setLoadingFunction) => {
    setLoadingFunction(true);

    const client = new OpenAIClient(
      process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
      new AzureKeyCredential(process.env.REACT_APP_AZURE_OPENAI_KEY)
    );

    try {
      const response = await client.getChatCompletions(
        process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT,
        [
          { role: "system", content: "You are a veterinary assistant skilled in creating notes and analyzing veterinary consultations." },
          { role: "user", content: `${prompt}\n\nTranscript: ${transcription}` }
        ]
      );

      setStateFunction(response.choices[0].message.content);
    } catch (error) {
      console.error("Error calling Azure OpenAI:", error);
      setStateFunction("Error processing the transcription.");
    } finally {
      setLoadingFunction(false);
    }
  };

  const createSoapNotes = () => {
    const fullTranscription = `${editableTranscription}
    Patient Information:
    Name: ${patientName}
    Breed: ${patientBreed}
    Age: ${patientAge}
    History: ${patientHistory}
    
    Client Information:
    Owner: ${ownerName}`;

    const prompt = customNoteStyle
    ? `Based on the following consultation transcript, create notes using the template provided below:
    Custom Note Template:
    ${customNoteStyle}

    Transcript:
    ${fullTranscription}`
        : `Create detailed SOAP notes based on the following consultation transcript. Include all relevant information under each SOAP category.
    Transcript:
    ${fullTranscription}`;

    sendToAzureOpenAI(
      fullTranscription,
      prompt,
      setSoapNotes,
      setIsLoadingSoap
    );
  };

  const analyzeVitals = () => {
    sendToAzureOpenAI(
      editableTranscription,
      "Extract and list the vital information (e.g., weight, blood pressure, temperature) mentioned in the transcript. The format for each vital should be Vital Name: Value",
      setVitalsInfo,
      setIsLoadingVitals
    );
  };

  const analyzeCharges = () => {
    sendToAzureOpenAI(
      editableTranscription,
      "Identify and list any possible charges, diagnostics (e.g., x-rays), or treatments (e.g., pain relief) mentioned in the transcript. Make it a short dot point list",
      setCharges,
      setIsLoadingCharges
    );
  };

  const analyzeDifferentials = () => {
    sendToAzureOpenAI(
      editableTranscription,
      "Based on the symptoms mentioned in the transcript, provide a list of potential differential diagnoses.",
      setDifferentials,
      setIsLoadingDifferentials
    );
  };

  const generateClientSummary = () => {
    sendToAzureOpenAI(
    editableTranscription,
    "Create a concise, summary of this veterinary visit for the client. Include the main findings, any treatments or medications prescribed, and any follow-up instructions. Use language that is easy for pet owners to understand.",
    setClientSummary,
    setIsLoadingClientSummary
    );
    };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-xl font-bold mb-4">Vet Consultation Recorder</h1>

    <div className="mb-4 p-3 bg-gray-100 rounded">
      <h2 className="font-bold mb-2">
        <button onClick={() => setShowPatientInfo(!showPatientInfo)}>
          {showPatientInfo ? "Hide" : "Show"} Patient Information
    </button>
  </h2>
  {showPatientInfo && (
    <>
      <label className="block mb-2">
        Name:
        <input
          type="text"
          className="w-full p-2 border rounded"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </label>
      <label className="block mb-2">
        Breed:
        <input
          type="text"
          className="w-full p-2 border rounded"
          value={patientBreed}
          onChange={(e) => setPatientBreed(e.target.value)}
        />
      </label>
      <label className="block mb-2">
        Age:
        <input
          type="text"
          className="w-full p-2 border rounded"
          value={patientAge}
          onChange={(e) => setPatientAge(e.target.value)}
        />
      </label>
      <label className="block mb-2">
        Medical History:
        <textarea
          className="w-full p-2 border rounded"
          rows="4"
          value={patientHistory}
          onChange={(e) => setPatientHistory(e.target.value)}
        />
      </label>
      </>
      )}
    </div>

    <div className="mb-4 p-3 bg-gray-100 rounded">
      <h2 className="font-bold mb-2">
        <button onClick={() => setShowClientInfo(!showClientInfo)}>
          {showClientInfo ? "Hide" : "Show"} Client Information
        </button>
      </h2>
      {showClientInfo && (
        <>
          <label className="block mb-2">
            Owner's Name:
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>
          {/* Other fields here */}
        </>
      )}
    </div>

    <div className="mb-4 p-3 bg-gray-100 rounded">
  <h2 className="font-bold mb-2">
    <button onClick={() => setShowCustomNoteStyle(!showCustomNoteStyle)}>
      {showCustomNoteStyle ? "Hide" : "Show"} Custom Note Style
    </button>
  </h2>
  {showCustomNoteStyle && (
    <textarea
      className="w-full p-2 border rounded"
      rows="6"
      value={customNoteStyle}
      onChange={(e) => setCustomNoteStyle(e.target.value)}
      placeholder="Enter your Template Here"
    />
  )}
  </div>

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

      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={toggleRecording}
          className={`px-4 py-2 rounded-full ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white font-bold ${!hasPermission && 'opacity-50 cursor-not-allowed'}`}
          disabled={!hasPermission}
        >
          {isRecording ? 'Stop Transcript' : 'Start Transcript'}
        </button>

        <button
          onClick={saveTranscription}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full"
        >
          Save Transcription
        </button>


      </div>

      {isRecording && (
        <div className="mt-2 text-red-500 animate-pulse">
          Transcription in progress...
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Current Transcription:</h2>
        <textarea
          className="w-full p-2 border rounded"
          rows="10"
          value={editableTranscription}
          onChange={(e) => setEditableTranscription(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
      <button
          onClick={createSoapNotes}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-full"
        >
          Create Notes
        </button>
        <button
          onClick={analyzeVitals}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full"
        >
          Analyze Vitals
        </button>
        <button
          onClick={analyzeCharges}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full"
        >
          Analyze Charges
        </button>
        <button
          onClick={analyzeDifferentials}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full"
        >
          Analyze Differentials
        </button>

        <button
          onClick={generateClientSummary}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-full"
        >
          Client Summary
        </button>

      </div>

      {isLoadingSoap && <div className="mt-2 text-purple-500 animate-pulse">Creating notes...</div>}
      {soapNotes && (
        <div className="mt-4 p-3 bg-purple-100 rounded">
          <h2 className="font-bold mb-2">Notes:</h2>
          <ReactMarkdown className="markdown-content">{soapNotes}</ReactMarkdown>
        </div>
      )}

      {isLoadingVitals && <div className="mt-2 text-blue-500 animate-pulse">Analyzing vitals...</div>}
      {vitalsInfo && (
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <h2 className="font-bold mb-2">Vitals Information:</h2>
          <ReactMarkdown className="markdown-content">{vitalsInfo}</ReactMarkdown>
        </div>
      )}

      {isLoadingCharges && <div className="mt-2 text-green-500 animate-pulse">Analyzing charges...</div>}
      {charges && (
        <div className="mt-4 p-3 bg-green-100 rounded">
          <h2 className="font-bold mb-2">Charges and Treatments:</h2>
          <ReactMarkdown className="markdown-content">{charges}</ReactMarkdown>
        </div>
      )}

      {isLoadingDifferentials && <div className="mt-2 text-yellow-500 animate-pulse">Analyzing differentials...</div>}
      {differentials && (
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <h2 className="font-bold mb-2">Differential Diagnoses:</h2>
          <ReactMarkdown className="markdown-content">{differentials}</ReactMarkdown>
        </div>
      )}

      {isLoadingClientSummary && <div className="mt-2 text-indigo-500 animate-pulse">Generating client summary...</div>}
      {clientSummary && (
        <div className="mt-4 p-3 bg-indigo-100 rounded">
          <h2 className="font-bold mb-2">Client Summary:</h2>
          <ReactMarkdown className="markdown-content">{clientSummary}</ReactMarkdown>
        </div>
  )}
    </div>
  );
};

export default RecordingInterface;