import React from 'react';
import './App.css';
import RecordingInterface from './RecordingInterface';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Veterinary Consultation Recorder</h1>
      </header>
      <main>
        <RecordingInterface />
      </main>
      <footer>
        <p>&copy; 2023 Veterinary Consultation Recorder. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
