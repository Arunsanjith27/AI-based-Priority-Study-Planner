import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import CreateSemester from './components/CreateSemester/CreateSemester';
import ManageSubjects from './components/ManageSubjects/ManageSubjects';
import UploadSyllabus from './components/UploadSyllabus/UploadSyllabus';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/semester/create" element={<CreateSemester />} />
          <Route path="/subjects/manage" element={<ManageSubjects />} />
          <Route path="/syllabus/upload" element={<UploadSyllabus />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

