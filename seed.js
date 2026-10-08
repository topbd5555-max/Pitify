import db from './db.js';

const WORKOUTS = [
  {
    title: 'Full Body Burn',
    category: 'Full Body',
    level: 'Beginner',
    duration: 15,
    calories: 150,
    thumbnail: '🔥',
    exercises: [
      { name: 'Jumping Jacks', seconds: 30, rest: 15 },
      { name: 'Push Ups', seconds: 30, rest: 15 },
      { name: 'Squats', seconds: 40, rest: 20 },
      { name: 'Plank', seconds: 30, rest: 15 },
      { name: 'Lunges', seconds: 40, rest: 20 },
      { name: 'Burpees', seconds: 30, rest: 20 },
    ],
  },
  {
    title: 'Belly Fat Killer',
    category: 'Abs',
    level: 'Intermediate',
    duration: 12,
    calories: 130,
    thumbnail: '🎯',
    exercises: [
      { name: 'Crunches', seconds: 40, rest: 15 },
      { name: 'Leg Raises', seconds: 40, rest: 15 },
      { name: 'Russian Twist', seconds: 40, rest: 15 },
      { name: 'Mountain Climbers', seconds: 40, rest: 15 },
      { name: 'Bicycle Crunch', seconds: 40, rest: 20 },
      { name: 'Plank', seconds: 45, rest: 20 },
    ],
  },
  {
    title: 'Chest Pump',
    category: 'Chest',
    level: 'Intermediate',
    duration: 10,
    calories: 110,
    thumbnail: '💪',
    exercises: [
      { name: 'Push Ups', seconds: 40, rest: 20 },
      { name: 'Wide Push Ups', seconds: 40, rest: 20 },
      { name: 'Diamond Push Ups', seconds: 30, rest: 20 },
      { name: 'Decline Push Ups', seconds: 30, rest: 20 },
      { name: 'Plank to Push Up', seconds: 40, rest: 20 },
    ],
  },
  {
    title: 'Leg Day Shred',
    category: 'Legs',
    level: 'Beginner',
    duration: 14,
    calories: 140,
    thumbnail: '🦵',
    exercises: [
      { name: 'Squats', seconds: 45, rest: 15 },
      { name: 'Lunges', seconds: 45, rest: 15 },
      { name: 'Calf Raises', seconds: 40, rest: 15 },
      { name: 'Wall Sit', seconds: 45, rest: 20 },
      { name: 'Glute Bridge', seconds: 40, rest: 15 },
      { name: 'Sumo Squats', seconds: 45, rest: 20 },
    ],
  },
  {
    title: 'Arm Blaster',
    category: 'Arms',
    level: 'Intermediate',
    duration: 10,
    calories: 100,
    thumbnail: '💥',
    exercises: [
      { name: 'Tricep Dips', seconds: 40, rest: 20 },
      { name: 'Arm Circles', seconds: 40, rest: 15 },
      { name: 'Plank Up-Downs', seconds: 40, rest: 20 },
      { name: 'Push Ups', seconds: 40, rest: 20 },
      { name: 'Superman Hold', seconds: 30, rest: 20 },
    ],
  },
  {
    title: 'Cardio Blast',
    category: 'Cardio',
    level: 'Advanced',
    duration: 18,
    calories: 220,
    thumbnail: '⚡',
    exercises: [
      { name: 'High Knees', seconds: 40, rest: 15 },
      { name: 'Burpees', seconds: 40, rest: 20 },
      { name: 'Jump Squats', seconds: 40, rest: 20 },
      { name: 'Mountain Climbers', seconds: 40, rest: 15 },
      { name: 'Skater Jumps', seconds: 40, rest: 20 },
      { name: 'Jumping Jacks', seconds: 45, rest: 15 },
    ],
  },
  {
    title: 'Morning Stretch',
    category: 'Stretching',
    level: 'Beginner',
    duration: 8,
    calories: 40,
    thumbnail: '🧘',
    exercises: [
      { name: 'Neck Rolls', seconds: 30, rest: 10 },
      { name: 'Shoulder Stretch', seconds: 30, rest: 10 },
      { name: 'Cat-Cow Stretch', seconds: 40, rest: 10 },
      { name: 'Hamstring Stretch', seconds: 40, rest: 10 },
      { name: 'Quad Stretch', seconds: 40, rest: 10 },
      { name: 'Child Pose', seconds: 45, rest: 0 },
    ],
  },
  {
    title: 'HIIT Inferno',
    category: 'HIIT',
    level: 'Advanced',
    duration: 20,
    calories: 280,
    thumbnail: '🔥',
    exercises: [
      { name: 'Burpees', seconds: 45, rest: 15 },
      { name: 'Jump Lunges', seconds: 45, rest: 15 },
      { name: 'Push Up to Plank', seconds: 45, rest: 15 },
      { name: 'Tuck Jumps', seconds: 40, rest: 20 },
      { name: 'Mountain Climbers', seconds: 45, rest: 15 },
      { name: 'Squat Jumps', seconds: 45, rest: 20 },
    ],
  },
];

export function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM workouts').get().c;
  if (count > 0) {
    console.log('ℹ️  Workouts already seeded (' + count + ' found)');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO workouts (title, category, level, duration, calories, thumbnail, exercises)
    VALUES (@title, @category, @level, @duration, @calories, @thumbnail, @exercises)
  `);

  const tx = db.transaction((rows) => {
    for (const w of rows) {
      insert.run({ ...w, exercises: JSON.stringify(w.exercises) });
    }
  });

  tx(WORKOUTS);
  console.log('✅ Seeded ' + WORKOUTS.length + ' workouts');
}