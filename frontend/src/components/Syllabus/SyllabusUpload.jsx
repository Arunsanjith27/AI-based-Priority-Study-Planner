import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../config/api';
import './SyllabusUpload.css';

function SyllabusUpload() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0] || null);
    setMessage('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!subject) {
      setError('Please select a subject.');
      return;
    }

    if (!file) {
      setError('Please select a syllabus file.');
      return;
    }

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('syllabus', file);

    try {
      setLoading(true);


      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/syllabus/upload`, {
        method: 'POST',
        headers: token ? { Authorization: "Bearer " + token } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Syllabus upload failed.');
      }

      setMessage(data.message);
      const extractedTopics = data.data?.topics || data.syllabus?.topics || [];
      setTopics(extractedTopics);
      if (extractedTopics.length > 0) {
        localStorage.setItem('latestSyllabusTopics', JSON.stringify({
          subject: subject.trim(),
          topics: extractedTopics,
        }));
      }
      setFile(null);
      setSubject('');

      document.getElementById('syllabus-file').value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="syllabus-upload">
      <div className="syllabus-card">
        <h2>Upload Syllabus</h2>
        <p>Select a subject and upload its syllabus.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="subject">Subject</label>

          <select
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">Select a subject</option>
            <option value="Data Structures">Data Structures</option>
            <option value="Operating Systems">Operating Systems</option>
            <option value="Database Management Systems">
              Database Management Systems
            </option>
            <option value="Software Engineering">
              Software Engineering
            </option>
            <option value="Full Stack Development">
              Full Stack Development
            </option>
          </select>

          <label htmlFor="syllabus-file">Syllabus File</label>

          <input
            id="syllabus-file"
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
          />

          {file && <p className="selected-file">Selected: {file.name}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Syllabus'}
          </button>
        </form>

        {message && <p className="success-message">{message}</p>}
        {topics.length > 0 && (
          <div className="extracted-topics">
            <h3>Extracted syllabus topics</h3>
            <ul>
              {topics.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
            <button type="button" onClick={() => navigate('/planner')}>
              Use topics in Study Planner
            </button>
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default SyllabusUpload;
