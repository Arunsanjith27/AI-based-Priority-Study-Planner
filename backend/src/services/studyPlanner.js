
// Priority values used by the scheduling algorithm
const PRIORITY_SCORE = {
  High: 30,
  Medium: 20,
  Low: 10,
};

// Convert a date into a comparable day number
function getDayNumber(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

// Calculate how urgent a topic is based on its examination date
function getUrgencyScore(examDate, currentDate) {
  if (!examDate) return 0;

  const daysLeft = getDayNumber(examDate) - getDayNumber(currentDate);

  if (daysLeft <= 0) return 100;
  if (daysLeft <= 1) return 80;
  if (daysLeft <= 3) return 60;
  if (daysLeft <= 7) return 40;

  return 20;
}

// Calculate the overall scheduling score of a topic
function calculateTopicScore(topic, currentDate) {
  const priorityScore = PRIORITY_SCORE[topic.priority] || 10;
  const urgencyScore = getUrgencyScore(topic.examDate, currentDate);

  return priorityScore + urgencyScore;
}

// Generate a study plan for one day
function generateDailyPlan(topics, availableHours, date) {
  if (!Array.isArray(topics)) {
    throw new Error('Topics must be an array');
  }

  if (!Number.isFinite(availableHours) || availableHours <= 0) {
    throw new Error('Available study hours must be greater than zero');
  }

  const remainingTopics = topics
    .map((topic, index) => ({
      ...topic,
      id: topic.id || topic._id || `topic-${index + 1}`,
      name: topic.name || topic.topic || `Topic ${index + 1}`,
      priority: topic.priority || 'Medium',
      remainingHours: Math.max(
        0,
        Number(topic.estimatedHours || 0) -
          Number(topic.completedHours || 0)
      ),
    }))
    .filter(topic => topic.remainingHours > 0);

  // Sort by priority and examination urgency
  remainingTopics.sort((a, b) => {
    const scoreDifference =
      calculateTopicScore(b, date) - calculateTopicScore(a, date);

    if (scoreDifference !== 0) return scoreDifference;

    if (a.examDate && b.examDate) {
      return a.examDate.localeCompare(b.examDate);
    }

    if (a.examDate) return -1;
    if (b.examDate) return 1;

    return 0;
  });

  let hoursLeft = availableHours;
  const tasks = [];

  for (const topic of remainingTopics) {
    if (hoursLeft <= 0) break;

    const allocatedHours = Math.min(
      topic.remainingHours,
      hoursLeft
    );

    tasks.push({
      topicId: topic.id,
      topicName: topic.name,
      priority: topic.priority,
      examDate: topic.examDate || null,
      allocatedHours: Number(allocatedHours.toFixed(2)),
    });

    hoursLeft = Number((hoursLeft - allocatedHours).toFixed(2));
  }

  return {
    date,
    tasks,
    totalStudyHours: Number((availableHours - hoursLeft).toFixed(2)),
    remainingAvailableHours: hoursLeft,
  };
}

// Generate a study plan for seven days
function generateWeeklyPlan(topics, dailyAvailableHours, startDate) {
  if (!Array.isArray(topics)) {
    throw new Error('Topics must be an array');
  }

  if (!Number.isFinite(dailyAvailableHours) || dailyAvailableHours <= 0) {
    throw new Error('Daily available hours must be greater than zero');
  }

  const remainingTopics = topics.map((topic, index) => ({
    ...topic,
    id: topic.id || topic._id || `topic-${index + 1}`,
    name: topic.name || topic.topic || `Topic ${index + 1}`,
    priority: topic.priority || 'Medium',
    estimatedHours: Number(topic.estimatedHours || 0),
    completedHours: Number(topic.completedHours || 0),
  }));

  const days = [];

  for (let day = 0; day < 7; day++) {
    const currentDayNumber = getDayNumber(startDate) + day;
    const currentDate = new Date(currentDayNumber * 86400000)
      .toISOString()
      .split('T')[0];

    const dailyPlan = generateDailyPlan(
      remainingTopics,
      dailyAvailableHours,
      currentDate
    );

    // Update remaining workload before planning the next day
    for (const task of dailyPlan.tasks) {
      const topic = remainingTopics.find(
        item => String(item.id) === String(task.topicId)
      );

      if (topic) {
        topic.completedHours += task.allocatedHours;
      }
    }

    days.push({
      day: day + 1,
      ...dailyPlan,
    });
  }

  const totalStudyHours = Number(
    days.reduce((sum, day) => sum + day.totalStudyHours, 0).toFixed(2)
  );

  return {
    startDate,
    endDate: days[6].date,
    totalStudyHours,
    days,
  };
}

module.exports = {
  calculateTopicScore,
  generateDailyPlan,
  generateWeeklyPlan,
};

