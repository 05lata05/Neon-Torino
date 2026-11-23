// Game balance: every number worth tuning lives here.
// Units: speeds and distances in game units (5 units = 1 m), times in real seconds, money in euros.

// Game time: a game starts at 17:00 and one game hour lasts 15 real seconds.
export const TIME = { startHour: 17, secondsPerHour: 15 };

// Vehicles: size, top speed (max), acceleration (acc), grip, steering (turn),
// damage resistance (hp), cruising speed in traffic (cruise), possible colours, relative mass.
export const VEHICLES = {
  sedan: {
    len: 34,
    wid: 17,
    max: 330,
    acc: 260,
    grip: 7,
    turn: 2.7,
    hp: 100,
    cruise: 165,
    cols: ['#a9adb3', '#eceef0', '#1c1f24', '#2b4c7e', '#a3262a', '#5b6169', '#2f5d50', '#8c7b6b'],
  },
  compact: {
    len: 28,
    wid: 15,
    max: 290,
    acc: 230,
    grip: 7,
    turn: 3.0,
    hp: 90,
    cruise: 160,
    cols: ['#e9ecef', '#b3202a', '#9aa3ab', '#2d3436', '#e1b12c', '#5d7f99', '#7a8f4a', '#d9d4c7'],
  },
  sports: {
    len: 35,
    wid: 16,
    max: 480,
    acc: 430,
    grip: 6.5,
    turn: 3.0,
    hp: 80,
    cruise: 205,
    cols: ['#ff3f6c', '#feca57', '#00d2d3', '#ff9f43', '#1e272e'],
  },
  van: {
    len: 44,
    wid: 20,
    max: 250,
    acc: 170,
    grip: 8,
    turn: 2.1,
    hp: 160,
    cruise: 140,
    cols: ['#dfe4ea', '#a4b0be', '#e1b12c', '#6ab04c'],
  },
  taxi: { len: 34, wid: 17, max: 345, acc: 280, grip: 7, turn: 2.7, hp: 100, cruise: 195, cols: ['#f4f4f2'] },
  police: {
    len: 36,
    wid: 17,
    max: 430,
    acc: 370,
    grip: 7.5,
    turn: 2.9,
    hp: 150,
    cruise: 170,
    cols: ['#1f4e96', '#16213e'],
  },
  lightning: {
    len: 36,
    wid: 17,
    max: 600,
    acc: 560,
    grip: 7.4,
    turn: 3.1,
    hp: 90,
    cruise: 220,
    cols: ['#7c3aed', '#00e5ff', '#ff2e88', '#f8fafc'],
  },
  armored: {
    len: 46,
    wid: 22,
    max: 320,
    acc: 240,
    grip: 8.5,
    turn: 2.2,
    hp: 500,
    cruise: 140,
    cols: ['#2f3b2f', '#1f2937'],
    mass: 2.2,
  },
  bus: {
    len: 66,
    wid: 21,
    max: 230,
    acc: 150,
    grip: 8,
    turn: 1.7,
    hp: 320,
    cruise: 140,
    cols: ['#ff8c1a'],
    mass: 3,
  },
};

// Nitro: seconds to empty the tank and to refill it.
export const NITRO = { duration: 3.2, recharge: 9 };

// Traffic: how many cars and pedestrians around the player, cruising speed by road type
// (P primary, S secondary, T tertiary, R residential, V service, X pedestrian).
export const TRAFFIC = { auto: 30, pedestrians: 40, speed: { P: 205, S: 185, T: 165, R: 135, V: 90, X: 60 } };

// Police: patrol cars per wanted level (0–5), seconds out of sight to drop one level
// (base + perLevel × level), seconds standing still next to a patrol car to get busted, fine when busted.
export const POLICE = {
  carsPerLevel: [0, 1, 2, 3, 5, 6],
  loseBase: 7,
  losePerLevel: 2.5,
  bustSeconds: 1.5,
  fineBase: 200,
  finePerLevel: 150,
};

// Rewards in euros.
export const REWARDS = {
  token: 50,
  allTokens: 5000,
  perSecondInAir: 150,
};

// Missions: reward = base + perUnit × distance (rounded to €10); time = distance / speed + margin.
export const MISSIONS = {
  delivery: { rewardBase: 150, rewardPerUnit: 0.12, speed: 180, margin: 18 },
  race: { reward: 700, speed: 230, margin: 8, bonusCheckpoint: 2.5 },
  taxi: { rewardBase: 220, rewardPerUnit: 0.1, speed: 170, margin: 22, penaltyPerDamage: 4, rewardMin: 60 },
  heist: { reward: 900, heat: 3 },
};

// Garage: prices.
export const GARAGE_PRICES = { repair: 100, lightning: 1500, armored: 2500, sports: 0 };

// Weather: seconds before the first change and interval (min, max) between changes.
export const WEATHER = { firstChange: 75, intervalMin: 80, intervalMax: 180 };
