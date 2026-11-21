// Warm-Up: the mind side of cricket. Six sections of mental preparation, all written for
// ClubPulse and all kept on the phone, so nothing about how anyone feels is sent anywhere.
//
// This is preparation for sport, drawn from widely used sport-psychology practice: breathing,
// attention, routines, self-talk and visualisation. It is not medical or psychological treatment,
// and the app says so and points to real support (app/warmup/support.tsx).

export type Breath = 'in' | 'hold' | 'out';
export type Step = { say: string; seconds: number; breathe?: Breath };

type Base = { id: string; title: string; summary: string; minutes: number };
export type Guided = Base & { kind: 'guided'; steps: Step[] };
export type Read = Base & { kind: 'read'; paragraphs: string[]; points: string[] };
export type Checklist = Base & { kind: 'checklist'; intro: string; items: string[] };
export type Tips = Base & { kind: 'tips'; tips: string[] };
export type Item = Guided | Read | Checklist | Tips;

export type SectionKey = 'mindfulness' | 'meditation' | 'mindset' | 'tips' | 'matchday' | 'awareness';
export type Section = { key: SectionKey; title: string; plain: string; intro: string; icon: string; items: Item[] };

/** `rounds` of breathing: in, an optional hold, out, an optional hold. */
function breathing(rounds: number, inFor: number, holdFor: number, outFor: number, restFor = 0): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < rounds; i++) {
    steps.push({ say: 'Breathe in through your nose', seconds: inFor, breathe: 'in' });
    if (holdFor) steps.push({ say: 'Hold, gently', seconds: holdFor, breathe: 'hold' });
    steps.push({ say: 'Breathe out slowly through your mouth', seconds: outFor, breathe: 'out' });
    if (restFor) steps.push({ say: 'Rest before the next breath', seconds: restFor, breathe: 'hold' });
  }
  return steps;
}

const minutes = (steps: Step[]) => Math.max(1, Math.round(steps.reduce((sum, s) => sum + s.seconds, 0) / 60));
const guided = (id: string, title: string, summary: string, steps: Step[]): Guided => ({ id, title, summary, kind: 'guided', steps, minutes: minutes(steps) });

export const SECTIONS: Section[] = [
  {
    key: 'mindfulness', title: 'Watch the Ball', plain: 'Mindfulness', icon: '👁️',
    intro: 'Mindfulness is paying attention to what is happening now, on purpose. In cricket that means this ball, not the last one and not the scoreboard.',
    items: [
      guided('five-senses', 'Come back to now', 'A two-minute way to settle a busy head before you bat, bowl or walk out to field.', [
        { say: 'Sit or stand comfortably. Let your shoulders drop.', seconds: 10 },
        { say: 'Look around. Find five things you can see. Name each one in your head.', seconds: 25 },
        { say: 'Notice four things you can feel: your feet in your shoes, the air, your hands.', seconds: 25 },
        { say: 'Listen for three sounds, near or far.', seconds: 20 },
        { say: 'Notice two things you can smell, or two breaths going in and out.', seconds: 15 },
        { say: 'Notice one thing you are glad about today.', seconds: 15 },
        { say: 'You are here. The next thing to do is the only thing to do.', seconds: 10 },
      ]),
      guided('between-balls', 'Between balls', 'Thirty seconds to let go of the last ball and get ready for the next one.', [
        { say: 'Breathe out slowly, all the way.', seconds: 6, breathe: 'out' },
        { say: 'Look away: the sky, the trees, the sightscreen.', seconds: 6 },
        { say: 'Say your word to yourself. "Next ball." "Watch it." Whatever is yours.', seconds: 6 },
        { say: 'Breathe in.', seconds: 4, breathe: 'in' },
        { say: 'Bring your eyes back to the bowler\'s hand, or to your mark.', seconds: 8 },
      ]),
      guided('notice-nerves', 'Notice the nerves', 'Nerves are your body getting ready. This helps you feel them without fighting them.', [
        { say: 'Close your eyes if you like. Find where the nerves are: stomach, chest, hands.', seconds: 20 },
        { say: 'Do not push the feeling away. Just notice it, like noticing the weather.', seconds: 20 },
        { say: 'Tell yourself: this is my body getting ready to play.', seconds: 15 },
        ...breathing(3, 4, 0, 6),
        { say: 'The feeling can stay. You can still play your game with it there.', seconds: 15 },
      ]),
      {
        id: 'mindful-nets', kind: 'read', minutes: 2, title: 'A mindful net session',
        summary: 'How to practise attention, not just technique.',
        paragraphs: [
          'Most nets are spent thinking about the last ball or the next shot. A mindful net is one where you practise where your attention goes, the same way you practise your front foot.',
          'Pick one thing to watch for the first ten balls: the seam, the bowler\'s wrist, or the moment the ball leaves the hand. When your mind drifts to a mistake or a mate watching, notice it and bring it back. That bringing back is the rep.',
          'Finish by asking one question: how many of those balls did I really watch? The number goes up with practice.',
        ],
        points: ['One focus for ten balls', 'Notice the drift, come back, no telling off', 'Count the balls you truly watched'],
      },
    ],
  },
  {
    key: 'meditation', title: 'Still Head', plain: 'Meditation', icon: '🧘',
    intro: 'A still head on the field starts with a still head off it. These are short, guided and timed. Start with the shortest.',
    items: [
      guided('box-breathing', 'Box breathing', 'In for four, hold for four, out for four, hold for four. Steadying, and easy to do in the changing room.', [
        { say: 'Sit upright, feet flat. Rest your hands.', seconds: 8 },
        ...breathing(8, 4, 4, 4, 4),
        { say: 'Let your breathing go back to normal. Notice how you feel.', seconds: 12 },
      ]),
      guided('long-out', 'The long breath out', 'A longer breath out tells your body it can calm down. Good for the night before a game.', [
        { say: 'Lie down or sit back. Loosen your jaw.', seconds: 10 },
        ...breathing(10, 4, 0, 7),
        { say: 'Stay here for a moment. There is nothing you need to do.', seconds: 20 },
      ]),
      guided('body-scan', 'Body scan', 'Move your attention slowly from your feet to your head, letting each part relax.', [
        { say: 'Lie down or sit comfortably. Close your eyes if you like.', seconds: 12 },
        { say: 'Feet and ankles. Notice them, then let them go heavy.', seconds: 25 },
        { say: 'Calves and knees. Let them soften.', seconds: 25 },
        { say: 'Thighs and hips. Let the chair or the floor take your weight.', seconds: 25 },
        { say: 'Stomach and lower back. Let your breathing move them.', seconds: 25 },
        { say: 'Chest and shoulders. Let your shoulders drop away from your ears.', seconds: 25 },
        { say: 'Arms, hands and fingers. Unclench them.', seconds: 25 },
        { say: 'Neck, jaw, face. Let your tongue rest and your forehead smooth.', seconds: 25 },
        { say: 'Feel your whole body at once, resting.', seconds: 25 },
        { say: 'Take one deeper breath, and open your eyes when you are ready.', seconds: 12 },
      ]),
      guided('visualise', 'See it first', 'Rehearse your game in your head: the walk out, the first ball, your best shot or delivery.', [
        { say: 'Close your eyes. Take two slow breaths.', seconds: 15 },
        { say: 'See the ground you will play on. The colour of the pitch, the boundary, the light.', seconds: 25 },
        { say: 'See yourself walking out, relaxed, head up. Feel your kit: the bat in your hand or the ball in your fingers.', seconds: 30 },
        { say: 'Take guard, or stand at the top of your mark. Go through your routine exactly as you do it.', seconds: 30 },
        { say: 'Play the first ball well. A solid defence, or a ball landing where you aimed. See it in full.', seconds: 30 },
        { say: 'Now your best: the shot or the delivery you love. Feel the timing. Hear the sound.', seconds: 35 },
        { say: 'See one thing go wrong. A play and miss, or a boundary off you. See yourself reset and get the next one right.', seconds: 35 },
        { say: 'Take that calm with you. Open your eyes.', seconds: 12 },
      ]),
    ],
  },
  {
    key: 'mindset', title: 'Between the Ears', plain: 'Mindset and sport psychology', icon: '🧠',
    intro: 'Cricket gives you a lot of time to think. These are the ideas sport psychologists teach most often, in plain words.',
    items: [
      {
        id: 'nerves', kind: 'read', minutes: 2, title: 'Nerves before a game', summary: 'Why you feel them, and how to use them.',
        paragraphs: [
          'Nerves are your body preparing to perform: a faster heart, more energy, sharper senses. Being nervous and being excited feel very similar in the body. What differs is the story you tell about it.',
          'So do not try to get rid of nerves. Give them a job. Tell yourself "I am ready" instead of "I am scared", then do something physical: a few slow breaths out, some shadow shots, a jog to the boundary.',
          'Nerves fade once the game starts and you have something to do. Your first job is small on purpose: watch the first ball closely, or hit your length once.',
        ],
        points: ['Nervous and excited feel the same', 'Say "I am ready"', 'Breathe out slowly, then move', 'Make your first job a small one'],
      },
      {
        id: 'confidence', kind: 'read', minutes: 2, title: 'Where confidence comes from', summary: 'It is built, not found. Here is what to build it from.',
        paragraphs: [
          'Confidence is not a mood that arrives on a good day. It is the memory of evidence: work you have done, things you have done before, and people who back you.',
          'Keep the evidence where you can see it. After each game or net, write down one thing you did well, however small. Before your next game, read the list. On a low day it is far more convincing than telling yourself to "be confident".',
          'Preparation is the other half. A player who knows their plan for the first over has something to stand on that does not depend on how they feel.',
        ],
        points: ['Confidence is remembered evidence', 'Write down one thing you did well, every time', 'Read the list before you play', 'A clear plan beats a good mood'],
      },
      {
        id: 'failure', kind: 'read', minutes: 2, title: 'After a duck or a bad spell', summary: 'Cricket is a game of failure. How you respond is the skill.',
        paragraphs: [
          'Even the best batters are dismissed cheaply again and again across a career, and the best bowlers go wicketless. Failing often is part of this game, not a sign that you are bad at it.',
          'Give yourself a short, set time to be fed up: until your pads are off, or until the end of the over. Then your job changes. You are a fielder, a supporter, a voice in the team.',
          'Later, look at it once and calmly. Was it a good ball, a poor decision, or a technical thing? Take one lesson. One. Then leave it at the ground.',
        ],
        points: ['Everyone fails often in cricket', 'Set a limit on feeling fed up', 'Be useful to the team straight away', 'One lesson, then leave it at the ground'],
      },
      {
        id: 'pressure', kind: 'read', minutes: 2, title: 'The big moment', summary: 'Twelve to win, or the last over to bowl. What to do with your head.',
        paragraphs: [
          'Pressure shrinks your attention onto the result: what happens if I get out, what happens if I get hit. The fix is to pull your attention back to the process: where am I looking, what is my plan for this ball.',
          'Slow everything down by a few seconds. Walk a little slower, take your full routine, breathe out before you settle. Rushing is what pressure wants.',
          'Then keep it simple. One clear plan per ball, decided before the bowler runs in. A simple plan carried out fully beats a clever one carried out halfway.',
        ],
        points: ['Result thinking shrinks you; process thinking frees you', 'Slow down on purpose', 'One plan per ball, decided early', 'Commit to it fully'],
      },
      {
        id: 'slump', kind: 'read', minutes: 2, title: 'When the runs or wickets dry up', summary: 'A slump feels permanent. It is not.',
        paragraphs: [
          'Form goes up and down for every player, and a run of low scores is usually smaller than it feels. Three innings is not evidence of anything.',
          'In a slump, players start changing everything: grip, stance, run-up. Change one thing at most, and only with someone who can watch you. Often the technique is fine and the attention has drifted to results.',
          'Go back to the smallest target you can hit: bat for ten balls, land six in a row on a length. Small wins rebuild rhythm faster than waiting for a big score.',
        ],
        points: ['A few games is not a trend', 'Change one thing at most', 'Shrink the target', 'Talk to a coach or a teammate'],
      },
      {
        id: 'self-talk', kind: 'read', minutes: 2, title: 'How you talk to yourself', summary: 'The voice in your head is a teammate. Make it a good one.',
        paragraphs: [
          'Everyone has a running commentary. After a mistake it often says things you would never say to a friend: "useless", "you always do that".',
          'You cannot switch it off, but you can give it better lines. Swap a judgement for an instruction. Not "don\'t get out" but "watch the ball". Not "that was rubbish" but "head still next one". Instructions tell your body what to do; judgements only tell it to tense up.',
          'Talk to yourself the way you would talk to your best mate at the other end: short, calm, and on your side.',
        ],
        points: ['Swap judgements for instructions', '"Watch the ball", not "don\'t get out"', 'Short, calm, on your side'],
      },
    ],
  },
  {
    key: 'matchday', title: 'Match Day', plain: 'Game preparation', icon: '🏏',
    intro: 'Good preparation means the match feels like the easy part. Tick these off as you go. The ticks are just for you and clear when you leave the page.',
    items: [
      {
        id: 'night-before', kind: 'checklist', minutes: 3, title: 'The night before', summary: 'Pack, plan, and switch off.',
        intro: 'Do the thinking tonight so tomorrow is clear.',
        items: ['Kit packed and checked: nothing to hunt for in the morning', 'Know the start time, the ground and how you are getting there', 'Decide your plan for your first over, batting or bowling', 'Eat a proper meal and drink water', 'Screens off half an hour before bed', 'Try "The long breath out" if your head is busy'],
      },
      {
        id: 'morning', kind: 'checklist', minutes: 3, title: 'Match morning', summary: 'Fuel, time and a calm start.',
        intro: 'Give yourself more time than you think you need.',
        items: ['Breakfast you know sits well', 'Leave early enough to arrive unhurried', 'Read your list of things you have done well', 'Run "See it first" once, on the way or when you arrive', 'Decide your one focus for the day'],
      },
      {
        id: 'at-ground', kind: 'checklist', minutes: 3, title: 'At the ground', summary: 'Warm up the body and switch on the head.',
        intro: 'Arrive, look, then warm up with purpose.',
        items: ['Walk out and look at the pitch, the boundaries and the wind', 'Warm up properly: run, stretch, catch, throw', 'Hit or bowl enough to feel your rhythm, then stop', 'Know your role today: ask the captain if you are not sure', 'Say something positive to a teammate', 'Two minutes of "Come back to now" before the start'],
      },
      {
        id: 'your-moment', kind: 'checklist', minutes: 2, title: 'Walking out', summary: 'Your routine, the same every time.',
        intro: 'A routine tells your body it is time. Keep it the same on good days and bad.',
        items: ['Walk out at your own pace, head up', 'Look at where the fielders are, or where your field is set', 'Take guard or mark your run-up the way you always do', 'One slow breath out', 'Your word: "watch the ball", "hit the length"', 'Play the first ball on its merits'],
      },
      {
        id: 'after', kind: 'checklist', minutes: 3, title: 'After the game', summary: 'Three questions, then let it go.',
        intro: 'Answer these in your head, or write them down somewhere of your own.',
        items: ['One thing I did well today', 'One thing I will work on this week', 'One thing I enjoyed', 'Thank the people who made the game happen', 'Leave the result at the ground'],
      },
    ],
  },
  {
    key: 'awareness', title: 'Reading the Game', plain: 'Game awareness', icon: '🧭',
    intro: 'Game awareness is knowing what the situation needs before it is obvious. It can be learned, by looking for the same few things every time.',
    items: [
      {
        id: 'aware-batting', kind: 'read', minutes: 3, title: 'With the bat', summary: 'What to look for before every over.',
        paragraphs: [
          'Before each over, look at the field. Where the fielders are tells you what the bowler is trying to do. Two out on the leg side and a short leg means short balls are coming. A ring with nobody on the boundary means they want you to hit over the top.',
          'Count the gaps, not the fielders. Pick two scoring areas for this bowler and this field, and make everything else a leave or a defence until you are in.',
          'Know the situation in one sentence: "we need five an over with six wickets left", or "we need to bat thirty overs". That sentence decides whether a risky single is worth it.',
        ],
        points: ['Read the field before each over', 'Pick two scoring areas', 'Know the situation in one sentence', 'Talk to your partner between overs'],
      },
      {
        id: 'aware-bowling', kind: 'read', minutes: 3, title: 'With the ball', summary: 'Read the batter, then bowl to a plan.',
        paragraphs: [
          'Watch the batter before you bowl to them. Where do they stand, where are their feet when the ball is released, what did they do to the last full ball? One over of watching tells you their favourite shot.',
          'Bowl to your field. If mid-off is back, do not bowl the ball that goes through the covers. Agree the plan with your captain before the over so you both know what a good ball looks like.',
          'After a boundary, ask whether it was a bad ball or a good shot. A good shot needs no change. A bad ball needs one small one.',
        ],
        points: ['Watch the batter\'s feet and favourite shot', 'Bowl to the field you have', 'Agree the plan before the over', 'Bad ball or good shot?'],
      },
      {
        id: 'aware-fielding', kind: 'read', minutes: 2, title: 'In the field', summary: 'Expect every ball to come to you.',
        paragraphs: [
          'Awareness in the field starts before the ball is bowled. Know who is on strike, where they like to hit it, and where you will throw if it comes to you.',
          'Walk in with the bowler and be on the balls of your feet as the ball is released. The fielders who seem quick are usually the ones who started early.',
          'Watch your captain between balls. A fielder who moves two yards without being asked, because they read the batter, saves a run an over.',
        ],
        points: ['Know your throw before the ball is bowled', 'Walk in, be moving at release', 'Look at the captain between balls', 'Back up every throw'],
      },
      {
        id: 'aware-match', kind: 'read', minutes: 3, title: 'The match situation', summary: 'What the game needs right now.',
        paragraphs: [
          'Every game has phases. Early on, the job is to see off the new ball or to take wickets with it. In the middle, it is to rotate the strike or to squeeze. At the end, it is to score fast or to keep it simple and full.',
          'Ask yourself the captain\'s question, even if you are not the captain: what does the team need from me in the next five overs? Often the answer is unglamorous. A maiden. A partnership of twenty. Ten overs without a wicket.',
          'Use the scoreboard as information, not as a verdict. It tells you what is needed. It says nothing about what you can do next ball.',
        ],
        points: ['Know which phase the game is in', 'What does the team need in the next five overs?', 'The scoreboard is information', 'Small jobs win matches'],
      },
    ],
  },
  {
    key: 'tips', title: 'Team Talk', plain: 'Quick tips', icon: '💬',
    intro: 'Short reminders to read on the way to the ground.',
    items: [
      { id: 'tips-batting', kind: 'tips', minutes: 1, title: 'For batters', summary: 'Six things to remember at the crease.', tips: ['Watch the ball out of the hand, not the bowler\'s face.', 'Play each ball on its merits. The last one is gone.', 'Have a word you say before every ball.', 'When you feel rushed, step away and reset.', 'Running between the wickets is the easiest way to change the game.', 'Bat with your partner, not just beside them.'] },
      { id: 'tips-bowling', kind: 'tips', minutes: 1, title: 'For bowlers', summary: 'Six things to remember at the top of your mark.', tips: ['Pick the exact spot you are aiming at, every ball.', 'A boundary is one ball. Walk back slowly.', 'Bowl your best ball more often than your clever one.', 'Breathe out before you start your run-up.', 'Know your field before you turn.', 'Keep your follow-through positive, even after a bad ball.'] },
      { id: 'tips-fielding', kind: 'tips', minutes: 1, title: 'For fielders', summary: 'Six ways to stay in the game for fifty overs.', tips: ['Want the ball. Every ball.', 'Switch on as the bowler runs in, switch off between balls.', 'A drop is one ball. Ask for the next one.', 'Make noise for the bowler.', 'Know which end you are throwing to.', 'Your energy is contagious. So is your silence.'] },
      { id: 'tips-team', kind: 'tips', minutes: 1, title: 'For teammates and captains', summary: 'Being the person others want to play with.', tips: ['Be the first to speak after a mistake, and make it kind.', 'Praise effort and decisions, not just results.', 'Ask a quiet teammate how they are getting on.', 'Give instructions, not criticism, in the middle of a game.', 'Thank the scorer, the umpires and the tea makers.', 'Win and lose the same way.'] },
    ],
  },
];

export const sectionByKey = (key: string): Section | undefined => SECTIONS.find((s) => s.key === key);
export function itemById(id: string): { section: Section; item: Item } | undefined {
  for (const section of SECTIONS) {
    const item = section.items.find((i) => i.id === id);
    if (item) return { section, item };
  }
  return undefined;
}
