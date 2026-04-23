// Pre-populated exercise database

export interface ExerciseSeed {
  id: string;
  name: string;
  muscleGroup: string;
}

export const MUSCLE_GROUPS: Record<string, { label: string; icon: string; color: string }> = {
  chest: { label: 'Chest', icon: 'chest', color: '#f87171' },
  back: { label: 'Back', icon: 'backMuscle', color: '#5b9aff' },
  shoulders: { label: 'Shoulders', icon: 'shoulder', color: '#7c5cfc' },
  arms: { label: 'Arms', icon: 'bicep', color: '#f97316' },
  legs: { label: 'Legs', icon: 'leg', color: '#34d399' },
  core: { label: 'Core', icon: 'target', color: '#fbbf24' },
  cardio: { label: 'Cardio', icon: 'heart', color: '#ec4899' },
};

export const EXERCISES: ExerciseSeed[] = [
  // Chest
  { id: 'barbell-bench-press', name: 'Barbell Bench Press', muscleGroup: 'chest' },
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroup: 'chest' },
  { id: 'incline-barbell-press', name: 'Incline Barbell Press', muscleGroup: 'chest' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { id: 'decline-bench-press', name: 'Decline Bench Press', muscleGroup: 'chest' },
  { id: 'chest-dips', name: 'Chest Dips', muscleGroup: 'chest' },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'chest' },
  { id: 'pec-deck', name: 'Pec Deck Machine', muscleGroup: 'chest' },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', muscleGroup: 'chest' },
  { id: 'push-ups', name: 'Push-ups', muscleGroup: 'chest' },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscleGroup: 'chest' },
  { id: 'landmine-press', name: 'Landmine Press', muscleGroup: 'chest' },

  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'back' },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', muscleGroup: 'back' },
  { id: 'pull-ups', name: 'Pull-ups', muscleGroup: 'back' },
  { id: 'chin-ups', name: 'Chin-ups', muscleGroup: 'back' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back' },
  { id: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'back' },
  { id: 'face-pulls', name: 'Face Pulls', muscleGroup: 'back' },
  { id: 'cable-pullover', name: 'Cable Pullover', muscleGroup: 'back' },
  { id: 'rack-pulls', name: 'Rack Pulls', muscleGroup: 'back' },
  { id: 'hyperextensions', name: 'Hyperextensions', muscleGroup: 'back' },
  { id: 'pendlay-row', name: 'Pendlay Row', muscleGroup: 'back' },
  { id: 'meadows-row', name: 'Meadows Row', muscleGroup: 'back' },

  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press (Barbell)', muscleGroup: 'shoulders' },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders' },
  { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'shoulders' },
  { id: 'lateral-raises', name: 'Lateral Raises', muscleGroup: 'shoulders' },
  { id: 'front-raises', name: 'Front Raises', muscleGroup: 'shoulders' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'shoulders' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'shoulders' },
  { id: 'upright-row', name: 'Upright Row', muscleGroup: 'shoulders' },
  { id: 'shrugs', name: 'Shrugs', muscleGroup: 'shoulders' },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', muscleGroup: 'shoulders' },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscleGroup: 'shoulders' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'arms' },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', muscleGroup: 'arms' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'arms' },
  { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'arms' },
  { id: 'concentration-curl', name: 'Concentration Curl', muscleGroup: 'arms' },
  { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'arms' },
  { id: 'ez-bar-curl', name: 'EZ-Bar Curl', muscleGroup: 'arms' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'arms' },
  { id: 'skull-crushers', name: 'Skull Crushers', muscleGroup: 'arms' },
  { id: 'overhead-tricep-ext', name: 'Overhead Tricep Extension', muscleGroup: 'arms' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscleGroup: 'arms' },
  { id: 'tricep-dips', name: 'Tricep Dips', muscleGroup: 'arms' },
  { id: 'cable-overhead-ext', name: 'Cable Overhead Extension', muscleGroup: 'arms' },
  { id: 'wrist-curls', name: 'Wrist Curls', muscleGroup: 'arms' },
  { id: 'reverse-curls', name: 'Reverse Curls', muscleGroup: 'arms' },

  // Legs
  { id: 'barbell-squat', name: 'Barbell Squat', muscleGroup: 'legs' },
  { id: 'front-squat', name: 'Front Squat', muscleGroup: 'legs' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'legs' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'legs' },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'legs' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'legs' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'legs' },
  { id: 'leg-curl', name: 'Leg Curl (Lying)', muscleGroup: 'legs' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'legs' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscleGroup: 'legs' },
  { id: 'calf-raises', name: 'Calf Raises', muscleGroup: 'legs' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'legs' },
  { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'legs' },
  { id: 'goblet-squat', name: 'Goblet Squat', muscleGroup: 'legs' },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', muscleGroup: 'legs' },
  { id: 'step-ups', name: 'Step-ups', muscleGroup: 'legs' },
  { id: 'glute-kickback', name: 'Glute Kickback', muscleGroup: 'legs' },
  { id: 'adductor-machine', name: 'Adductor Machine', muscleGroup: 'legs' },
  { id: 'abductor-machine', name: 'Abductor Machine', muscleGroup: 'legs' },

  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'core' },
  { id: 'crunches', name: 'Crunches', muscleGroup: 'core' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'core' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'core' },
  { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'core' },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroup: 'core' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscleGroup: 'core' },
  { id: 'leg-raises', name: 'Leg Raises', muscleGroup: 'core' },
  { id: 'mountain-climbers', name: 'Mountain Climbers', muscleGroup: 'core' },
  { id: 'dead-bug', name: 'Dead Bug', muscleGroup: 'core' },
  { id: 'woodchoppers', name: 'Woodchoppers', muscleGroup: 'core' },

  // Cardio
  { id: 'treadmill-run', name: 'Treadmill Run', muscleGroup: 'cardio' },
  { id: 'cycling', name: 'Cycling / Bike', muscleGroup: 'cardio' },
  { id: 'rowing-machine', name: 'Rowing Machine', muscleGroup: 'cardio' },
  { id: 'elliptical', name: 'Elliptical', muscleGroup: 'cardio' },
  { id: 'stairmaster', name: 'StairMaster', muscleGroup: 'cardio' },
  { id: 'jump-rope', name: 'Jump Rope', muscleGroup: 'cardio' },
  { id: 'battle-ropes', name: 'Battle Ropes', muscleGroup: 'cardio' },
  { id: 'burpees', name: 'Burpees', muscleGroup: 'cardio' },
  { id: 'box-jumps', name: 'Box Jumps', muscleGroup: 'cardio' },
];
