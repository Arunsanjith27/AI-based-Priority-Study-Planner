
const {
  generateDailyPlan,
  generateWeeklyPlan,
} = require('./src/services/studyPlanner');

const topics = [
  {
    name: 'Dynamic Programming',
    priority: 'High',
    examDate: '2026-11-05',
    estimatedHours: 5,
    completedHours: 1,
  },
  {
    name: 'Operating Systems',
    priority: 'Medium',
    examDate: '2026-11-10',
    estimatedHours: 4,
    completedHours: 0,
  },
  {
    name: 'Database Management',
    priority: 'Low',
    examDate: '2026-11-15',
    estimatedHours: 3,
    completedHours: 0,
  },
];

const today = '2026-11-02';

console.log('\n========== DAILY STUDY PLAN ==========');
console.log(
  JSON.stringify(generateDailyPlan(topics, 3, today), null, 2)
);

console.log('\n========== WEEKLY STUDY PLAN ==========');
console.log(
  JSON.stringify(generateWeeklyPlan(topics, 3, today), null, 2)
);

