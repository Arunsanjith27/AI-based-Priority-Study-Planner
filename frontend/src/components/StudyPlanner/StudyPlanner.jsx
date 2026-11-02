import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../config/api';
import './StudyPlanner.css';

const emptyTopic = () => ({
  name: '',
  priority: 'Medium',
  examDate: '',
  estimatedHours: '',
  completedHours: '',
});

export default function StudyPlanner() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([emptyTopic()]);
  const [availableHours, setAvailableHours] = useState('');
  const [planType, setPlanType] = useState('daily');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syllabusSource, setSyllabusSource] = useState(null);

  useEffect(() => {
    const loadSyllabusTopics = async () => {
      const cachedSyllabus = localStorage.getItem('latestSyllabusTopics');
      if (cachedSyllabus) {
        try {
          const cached = JSON.parse(cachedSyllabus);
          if (cached.topics?.length) {
            setSyllabusSource({ subject: cached.subject, topics: cached.topics });
            setTopics(cached.topics.map((name) => ({
              name,
              priority: 'Medium',
              examDate: '',
              estimatedHours: '',
              completedHours: '',
            })));
          }
        } catch {
          localStorage.removeItem('latestSyllabusTopics');
        }
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/syllabus/topics`, {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await response.json();
        if (!response.ok) return;

        const syllabi = data.data || [];
        if (syllabi.length === 0) return;

        const latest = syllabi[0];
        if (!latest.topics?.length) return;

        setSyllabusSource(latest);
        setTopics(latest.topics.map((name) => ({
          name,
          priority: 'Medium',
          examDate: '',
          estimatedHours: '',
          completedHours: '',
        })));
      } catch {
        // The browser-cached syllabus remains available if the API is unavailable.
      }
    };

    loadSyllabusTopics();
  }, []);

  const updateTopic = (index, field, value) => {
    setTopics((current) => current.map((topic, topicIndex) =>
      topicIndex === index ? { ...topic, [field]: value } : topic
    ));
  };

  const removeTopic = (index) => {
    setTopics((current) => current.filter((_, topicIndex) => topicIndex !== index));
  };

  const generatePlan = async (event) => {
    event.preventDefault();
    setError('');
    setPlan(null);

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!topics.length) {
      setError('Add at least one study topic.');
      return;
    }

    const normalizedTopics = topics.map((topic, index) => {
      const estimated = Number(topic.estimatedHours);
      const completed = Number(topic.completedHours || 0);
      return {
        id: `topic-${index + 1}`,
        name: topic.name.trim(),
        priority: topic.priority,
        examDate: topic.examDate,
        estimatedHours: estimated,
        completedHours: completed,
      };
    });

    for (const topic of normalizedTopics) {
      if (!topic.name) {
        setError('Every topic must have a name.');
        return;
      }
      if (!topic.examDate) {
        setError(`Choose an exam date for ${topic.name}.`);
        return;
      }
      if (!Number.isFinite(topic.estimatedHours) || topic.estimatedHours <= 0) {
        setError(`Enter estimated study hours for ${topic.name}.`);
        return;
      }
      if (topic.completedHours < 0 || topic.completedHours > topic.estimatedHours) {
        setError(`Completed hours for ${topic.name} must be between 0 and estimated hours.`);
        return;
      }
    }

    const hours = Number(availableHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Available study hours must be greater than zero.');
      return;
    }

    try {
      setLoading(true);
      const endpoint = planType === 'weekly' ? '/planner/weekly' : '/planner/daily';
      const dateField = planType === 'weekly' ? 'startDate' : 'date';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          topics: normalizedTopics,
          availableHours: hours,
          [dateField]: planDate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('student');
          navigate('/login');
          return;
        }
        throw new Error(data.message || 'Unable to generate the study plan.');
      }

      setPlan(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTasks = (tasks) => (
    <div className="planner-task-list">
      {tasks.length === 0 ? (
        <p className="planner-empty-day">No remaining study tasks.</p>
      ) : tasks.map((task) => (
        <div className="planner-task" key={`${task.topicId}-${task.topicName}`}>
          <div>
            <strong>{task.topicName}</strong>
            <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
          </div>
          <span>{task.allocatedHours} hours</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="planner-page">
      <nav className="planner-nav">
        <button className="planner-brand" type="button" onClick={() => navigate('/dashboard')}>
          <span className="planner-brand-mark">AS</span>
          <span>AI Study Planner</span>
        </button>
        <button className="planner-dashboard-link" type="button" onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
      </nav>

      <main className="planner-content">
        <header className="planner-header">
          <h1>Generate Study Plan</h1>
          <p>Add your topics and available time to build a priority-based schedule.</p>
        </header>

        {syllabusSource && (
          <div className="syllabus-source-banner">
            <strong>Topics loaded from {syllabusSource.subject}</strong>
            <span>Complete the exam dates and study hours for each syllabus topic.</span>
          </div>
        )}

        <form className="planner-form" onSubmit={generatePlan}>
          <section className="planner-card">
            <div className="planner-card-heading">
              <h2>Study Topics</h2>
              <button className="planner-add-btn" type="button" onClick={() => setTopics((current) => [...current, emptyTopic()])}>
                + Add Topic
              </button>
            </div>

            <div className="topic-list">
              {topics.map((topic, index) => (
                <div className="topic-row" key={index}>
                  <div className="topic-number">{index + 1}</div>
                  <div className="topic-grid">
                    <label>Topic name
                      <input value={topic.name} onChange={(event) => updateTopic(index, 'name', event.target.value)} placeholder="e.g. Data Structures" />
                    </label>
                    <label>Priority
                      <select value={topic.priority} onChange={(event) => updateTopic(index, 'priority', event.target.value)}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                    <label>Exam date
                      <input type="date" value={topic.examDate} onChange={(event) => updateTopic(index, 'examDate', event.target.value)} />
                    </label>
                    <label>Estimated hours
                      <input type="number" min="0.25" step="0.25" value={topic.estimatedHours} onChange={(event) => updateTopic(index, 'estimatedHours', event.target.value)} />
                    </label>
                    <label>Completed hours
                      <input type="number" min="0" step="0.25" value={topic.completedHours} onChange={(event) => updateTopic(index, 'completedHours', event.target.value)} />
                    </label>
                  </div>
                  <button className="topic-remove" type="button" onClick={() => removeTopic(index)} disabled={topics.length === 1} aria-label="Remove topic">×</button>
                </div>
              ))}
            </div>
          </section>

          <section className="planner-card planner-options">
            <h2>Plan Options</h2>
            <div className="option-grid">
              <label>Plan type
                <select value={planType} onChange={(event) => setPlanType(event.target.value)}>
                  <option value="daily">Daily Plan</option>
                  <option value="weekly">Weekly Plan</option>
                </select>
              </label>
              <label>{planType === 'weekly' ? 'Start date' : 'Plan date'}
                <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} />
              </label>
              <label>Available study hours
                <input type="number" min="0.25" step="0.25" value={availableHours} onChange={(event) => setAvailableHours(event.target.value)} placeholder="e.g. 4" />
              </label>
            </div>
            <button className="planner-submit" type="submit" disabled={loading}>
              {loading ? 'Generating Plan...' : 'Generate Plan'}
            </button>
          </section>
        </form>

        {error && <div className="planner-error" role="alert">{error}</div>}

        {plan && (
          <section className="planner-card planner-results">
            <div className="planner-card-heading">
              <h2>{planType === 'weekly' ? 'Weekly Study Schedule' : 'Daily Study Schedule'}</h2>
              <span className="total-hours">{plan.totalStudyHours} total hours</span>
            </div>

            {planType === 'daily' ? (
              <div className="day-result">
                <h3>{plan.date}</h3>
                {renderTasks(plan.tasks)}
              </div>
            ) : (
              <div className="week-grid">
                {plan.days.map((day) => (
                  <div className="day-result" key={day.date}>
                    <div className="day-heading"><h3>{day.date}</h3><span>{day.totalStudyHours} hrs</span></div>
                    {renderTasks(day.tasks)}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
