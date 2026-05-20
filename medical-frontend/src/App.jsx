import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PatientList } from './components/PatientList';
import { WaveformDetail } from './components/WaveformDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PatientList />} />
        <Route path="/patient/:patientId/exam/:examId" element={<WaveformDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
