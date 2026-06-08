import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PatientGrid from './pages/PatientGrid';
import PatientDetail from './pages/PatientDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PatientGrid />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
