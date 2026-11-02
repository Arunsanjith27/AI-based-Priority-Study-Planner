
const {
  generateDailyPlan,
  generateWeeklyPlan,
} = require('../services/studyPlanner');

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validatePlanRequest(body, dateField) {
  const { topics, availableHours } = body;

  if (!Array.isArray(topics) || topics.length === 0) {
    return 'At least one topic is required.';
  }

  const hours = Number(availableHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return 'Available study hours must be greater than zero.';
  }

  const requestedDate = body[dateField];
  if (requestedDate !== undefined && requestedDate !== null && requestedDate !== '' && !isValidDate(requestedDate)) {
    return `${dateField === 'startDate' ? 'Start date' : 'Date'} must be a valid date in YYYY-MM-DD format.`;
  }

  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index] || {};
    const label = `Topic ${index + 1}`;

    if (!String(topic.name || topic.topic || '').trim()) {
      return `${label} name is required.`;
    }
    if (!VALID_PRIORITIES.includes(topic.priority)) {
      return `${label} priority must be High, Medium, or Low.`;
    }
    if (!topic.examDate || !isValidDate(topic.examDate)) {
      return `${label} exam date must be a valid date in YYYY-MM-DD format.`;
    }

    const estimatedHours = Number(topic.estimatedHours);
    const completedHours = Number(topic.completedHours || 0);
    if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
      return `${label} estimated study hours must be greater than zero.`;
    }
    if (!Number.isFinite(completedHours) || completedHours < 0) {
      return `${label} completed study hours cannot be negative.`;
    }
    if (completedHours > estimatedHours) {
      return `${label} completed study hours cannot exceed estimated study hours.`;
    }
  }

  return null;
}

const generateDaily = (req, res) => {
  try {
    const validationError = validatePlanRequest(req.body, 'date');
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { topics, availableHours, date } = req.body;
    const plan = generateDailyPlan(
      topics,
      Number(availableHours),
      date || new Date().toISOString().split('T')[0]
    );

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const generateWeekly = (req, res) => {
  try {
    const validationError = validatePlanRequest(req.body, 'startDate');
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { topics, availableHours, startDate } = req.body;
    const plan = generateWeeklyPlan(
      topics,
      Number(availableHours),
      startDate || new Date().toISOString().split('T')[0]
    );

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateDaily,
  generateWeekly,
};

