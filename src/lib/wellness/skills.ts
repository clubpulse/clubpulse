// Mental skills for the website, ported from the app's Warm-Up library (expo/lib/warmup.ts).
// Written for SHIFTUP. General sport-preparation practice (breathing, attention, routines,
// self-talk and visualisation). It is not medical or psychological treatment, and every page says
// so and links to real support (/wellness/support). The match-day checklists live in content.ts.

export type Breath = 'in' | 'hold' | 'out';
export type Step = { say: string; seconds: number; breathe?: Breath };

type Base = { id: string; title: string; summary: string; minutes: number };
export type Guided = Base & { kind: 'guided'; steps: Step[] };
export type Read = Base & { kind: 'read'; paragraphs: string[]; points: string[] };
export type Checklist = Base & { kind: 'checklist'; intro: string; items: string[] };
export type Tips = Base & { kind: 'tips'; tips: string[] };
/** One week of the mental skills programme: the idea, a drill for the nets, and a daily practice. */
export type Week = Base & {
  kind: 'week'; week: number; skill: string;
  learn: string[];
  /** What to do at your next net or training session */
  drill: { title: string; steps: string[] };
  /** A guided session or tool to use each day this week */
  daily: { label: string; id?: string; route?: string };
  /** Asked at the end of the week */
  check: string;
};
export type Item = Guided | Read | Checklist | Tips | Week;

export type SectionKey = 'training' | 'mindfulness' | 'meditation' | 'mindset' | 'tips' | 'awareness';
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
    key: 'training', title: 'Mind Nets', plain: 'Psychological training', icon: '🎯',
    intro: 'Six weeks of mental skills training, one skill a week. Each week has an idea to learn, a drill to do at the nets and a short practice for each day. Mental skills are trained like any other: a little, often.',
    items: [
      {
        id: 'week-1', kind: 'week', week: 1, minutes: 5, skill: 'Staying calm', title: 'Week 1: Control your breathing',
        summary: 'The fastest way to steady yourself, and the base for everything else.',
        learn: [
          'When you are nervous or rushed, your breathing gets short and high in the chest, and your body reads that as danger. Slowing the breath out is the one direct lever you have: it brings your heart rate down within a few breaths.',
          'This week you are not trying to feel calm all the time. You are learning to bring yourself down a notch on demand, in a few seconds, anywhere.',
        ],
        drill: { title: 'One breath, every ball', steps: ['At your next net, breathe out slowly before every single ball, batting or bowling.', 'Count how many balls you remembered. Aim to beat it the next session.', 'Notice whether your first movement feels any different after the breath.'] },
        daily: { label: 'Box breathing, once a day', id: 'box-breathing' },
        check: 'Can you slow yourself down in three breaths, without anyone noticing?',
      },
      {
        id: 'week-2', kind: 'week', week: 2, minutes: 5, skill: 'Concentration', title: 'Week 2: Train your focus',
        summary: 'Attention is a muscle. This week you work it.',
        learn: [
          'Concentration is not staying focused for hours. It is noticing when your attention has drifted and bringing it back, quickly and without fuss. Every time you do that, you get better at it.',
          'Cricket needs a narrow focus for a second or two per ball, then a rest. This week you practise both halves: the narrow moment, and switching off on purpose in between.',
        ],
        drill: { title: 'Twelve balls on the seam', steps: ['For twelve balls, watch only one thing: the seam, or the exact spot you are bowling at.', 'Between balls, deliberately look away and relax. Then switch back on with a trigger: a tap of the bat or a tug of the cap.', 'After the twelve, count how many you truly watched. Write the number down.'] },
        daily: { label: 'Count ten breaths, once a day', id: 'count-breaths' },
        check: 'How many balls out of twelve did you truly watch? Is the number going up?',
      },
      {
        id: 'week-3', kind: 'week', week: 3, minutes: 5, skill: 'Routines', title: 'Week 3: Build your routine',
        summary: 'A routine tells your body it is time, whatever the scoreboard says.',
        learn: [
          'Watch any good player closely and they do the same small things before every ball. That is not superstition. A routine fills the gap between balls with something useful, so there is no room for the last ball or the scoreboard.',
          'A good routine has four parts and takes under ten seconds: a breath, somewhere to look, a word, and a trigger movement that means "now". This week you build yours and use it until it runs on its own.',
        ],
        drill: { title: 'Every ball, no exceptions', steps: ['Build your routine in My Routine.', 'Use it before every ball of a full net session, including the bad ones.', 'After a poor ball, use it exactly the same. That is when it matters most.'] },
        daily: { label: 'Build or review My Routine', route: '/wellness/routine' },
        check: 'Did you run your routine after your worst ball this week?',
      },
      {
        id: 'week-4', kind: 'week', week: 4, minutes: 5, skill: 'Self-talk', title: 'Week 4: Coach yourself',
        summary: 'Change what the voice in your head says, one line at a time.',
        learn: [
          'Your inner voice comments all day. Left alone, it judges: "rubbish", "not again". Judgements tighten you. Instructions free you: "head still", "hit the top of off".',
          'You cannot silence the voice, but you can give it a script. This week you write three lines: one for before a ball, one for after a mistake, and one for when you are doing well and starting to get ahead of yourself.',
        ],
        drill: { title: 'Say it out loud', steps: ['Write your three lines. Keep each to four words or fewer.', 'In the nets, say the "before a ball" line quietly out loud each ball.', 'After any mistake, say the "after a mistake" line before you do anything else.'] },
        daily: { label: 'Find your cue word', id: 'cue-word' },
        check: 'What did you say to yourself after your last mistake? Would you say it to a teammate?',
      },
      {
        id: 'week-5', kind: 'week', week: 5, minutes: 5, skill: 'Imagery', title: 'Week 5: See it before you do it',
        summary: 'Your brain rehearses a movement when you picture it clearly.',
        learn: [
          'Picturing a skill in detail uses many of the same pathways as doing it, which is why players in most sports rehearse in their heads. It works best when it is vivid: what you see, hear and feel, at real speed, through your own eyes.',
          'Imagery is also how you prepare for things going wrong. If you have already pictured a play and miss, and pictured yourself resetting, the real one is less of a shock.',
        ],
        drill: { title: 'Five in the head, six in the hand', steps: ['Before each over in the nets, close your eyes and play five balls in your head, in full.', 'Make them real speed, through your own eyes, with the sound of bat on ball.', 'Include one that goes wrong and your reset after it.'] },
        daily: { label: 'See it first, once a day', id: 'visualise' },
        check: 'When you picture your best shot or ball, can you hear it and feel it, not just see it?',
      },
      {
        id: 'week-6', kind: 'week', week: 6, minutes: 5, skill: 'Pressure', title: 'Week 6: Practise pressure',
        summary: 'Put it all together where it counts.',
        learn: [
          'Skills that hold up in a quiet net can fall apart in a tight finish, because pressure was never part of the practice. The answer is to add pressure to training in small, safe doses, and to use everything from the first five weeks inside it.',
          'Pressure practice needs a consequence, even a silly one, and a clear target. The aim is not to make it nasty. It is to feel your heart rate rise and practise your breath, your routine and your plan anyway.',
        ],
        drill: { title: 'The last over', steps: ['Set a scenario with a partner: "eight to win off six balls" or "defend seven".', 'Agree a small forfeit for the loser: collecting the balls, or five press-ups.', 'Use your breath, your routine and one plan per ball. Afterwards, name one thing you did well under pressure.'] },
        daily: { label: 'The pressure over, once a day', id: 'pressure-over' },
        check: 'Under pressure this week, did you remember your routine? What did you do well?',
      },
    ],
  },
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
      guided('count-breaths', 'Count ten breaths', 'A concentration drill. It sounds easy. Most people lose count by four, and that is the training.', [
        { say: 'Sit upright. Breathe normally, through your nose.', seconds: 10 },
        { say: 'Count each breath out, silently: one, two, three, up to ten.', seconds: 40 },
        { say: 'When you notice you have drifted, start again at one. No telling off. Drifting and coming back is the rep.', seconds: 40 },
        { say: 'Keep going. One number for each breath out.', seconds: 45 },
        { say: 'Last few breaths. Just the number and the breath.', seconds: 30 },
        { say: 'How far did you get before drifting? That number grows with practice.', seconds: 12 },
      ]),
      guided('let-it-go', 'Let it go', 'For straight after a dismissal, a dropped catch or a bad decision. Ninety seconds to put it down.', [
        { say: 'You are annoyed. That is fair. Give it ten seconds.', seconds: 10 },
        { say: 'Clench both fists as tight as you can.', seconds: 6 },
        { say: 'Now open your hands and let it drain out with a long breath.', seconds: 8, breathe: 'out' },
        ...breathing(3, 4, 0, 6),
        { say: 'Name what happened in five plain words. "I played across the line."', seconds: 12 },
        { say: 'Name one thing you will do next time. One.', seconds: 12 },
        { say: 'That is the lesson taken. The rest stays here.', seconds: 8 },
        { say: 'What does the team need from you right now? Go and do that.', seconds: 10 },
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
      guided('pressure-over', 'The pressure over', 'Rehearse a tight finish in your head, so that when it comes you have already been there.', [
        { say: 'Close your eyes. Two slow breaths.', seconds: 12 },
        { say: 'Picture it: last over, the game in the balance, and it is on you. Bat in hand, or ball in hand.', seconds: 25 },
        { say: 'Notice your body: heart quicker, hands tighter. That is normal. Breathe out slowly.', seconds: 20, breathe: 'out' },
        { say: 'Slow down. See yourself take a few extra seconds. Your full routine.', seconds: 25 },
        { say: 'Decide one plan for this ball. Say it to yourself in a few words.', seconds: 20 },
        { say: 'See yourself carry it out fully. The shot played, or the ball landing on the spot.', seconds: 30 },
        { say: 'Now see it go wrong once. A miss, or a boundary. Watch yourself breathe, reset, and go again with a clear plan.', seconds: 35 },
        { say: 'See the next ball done well.', seconds: 20 },
        { say: 'You have been here now. Open your eyes.', seconds: 10 },
      ]),
      guided('cue-word', 'Find your cue word', 'Tie one word to a calm, ready feeling, so that saying it on the field brings the feeling back.', [
        { say: 'Pick a word or short phrase for how you want to feel when you play. "Smooth." "Watch it." "Tall."', seconds: 20 },
        { say: 'Close your eyes. Remember a time you played well and felt exactly like that.', seconds: 25 },
        { say: 'Make the memory vivid: where you were, the sound, how your body felt.', seconds: 30 },
        { say: 'At the strongest moment, say your word to yourself, slowly, on a breath out.', seconds: 12, breathe: 'out' },
        { say: 'Again. Feel it, then say the word on the breath out.', seconds: 15, breathe: 'out' },
        { say: 'Once more. The word and the feeling together.', seconds: 15, breathe: 'out' },
        { say: 'Use this word before every ball this week. It gets stronger each time you pair it.', seconds: 12 },
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
      {
        id: 'goals', kind: 'read', minutes: 3, title: 'Goals that actually help', summary: 'Why "score fifty" is a poor goal, and what to set instead.',
        paragraphs: [
          'There are three kinds of goal. An outcome goal is a result: win the league, get picked. A performance goal is a number: average thirty, bowl at four an over. A process goal is something you do: watch the ball out of the hand, land four in six on a length.',
          'Outcome and performance goals give you direction for a season, but you do not control them. The opposition, the pitch and luck all get a vote. If they are all you think about, every low score feels like failing.',
          'Process goals are fully yours, and they are what you take onto the field. Set one or two for each game, and judge your day by them first. Do the process often enough and the numbers tend to follow.',
        ],
        points: ['Outcome: the result. Performance: a number. Process: what you do', 'Take only process goals onto the field', 'One or two per game', 'Judge the day by the process first'],
      },
      {
        id: 'concentration', kind: 'read', minutes: 3, title: 'Switching on and off', summary: 'Nobody can concentrate for six hours. The skill is turning it on at the right moment.',
        paragraphs: [
          'A day of cricket is hundreds of short bursts with gaps between them. Trying to stay fully focused all day wears you out by tea. Good players switch off between balls and switch on for each one.',
          'Think of three zones. Wide: between overs, chat, look around, relax. Middle: as the bowler walks back, take in the field and your plan. Narrow: as the bowler runs in, nothing but the ball.',
          'Build a trigger for the narrow zone: a tap of the bat, a tug of the cap, your cue word. Do it every ball. When you notice your mind has wandered, do not fight it. Use the trigger and come back.',
        ],
        points: ['Switch off between balls on purpose', 'Wide, middle, narrow', 'One trigger that means "now"', 'Wandering is normal; come back with the trigger'],
      },
      {
        id: 'anger', kind: 'read', minutes: 2, title: 'Anger and frustration', summary: 'A bad decision, a sledge, a dropped catch off your bowling.',
        paragraphs: [
          'Anger is energy with nowhere to go. It tightens your muscles and narrows your thinking, which is the opposite of what batting, bowling and catching need.',
          'You will not stop feeling it, so plan what you do with it. Have a set response: turn away, one long breath out, fix your eyes on something far off, then your cue word. Practise it in the nets so it is there when you need it.',
          'How you act when it goes against you is seen by your teammates, the juniors and the umpires. Respecting the decision, even a wrong one, is part of the game and part of the Spirit of Cricket.',
        ],
        points: ['Anger tightens you up', 'Have a set response and rehearse it', 'Turn away, breathe out, look far, cue word', 'Respect the decision'],
      },
      {
        id: 'not-picked', kind: 'read', minutes: 2, title: 'When you are not picked', summary: 'Being dropped or left out hurts. Here is a way through it.',
        paragraphs: [
          'Being left out feels personal, and it is fine to be disappointed. It is a decision about one team for one game, made with limited information. It is not a verdict on you as a player or a person.',
          'Ask for feedback, calmly, a day or two later: "What would you like to see from me to get back in?" A specific answer gives you something to work on. Most captains and coaches respect being asked.',
          'Then control what you can: your training, your attitude at the ground, and how you support the people who were picked. Selectors notice who stays positive.',
        ],
        points: ['One team, one game: not a verdict on you', 'Ask what they want to see', 'Work on that one thing', 'Support the players who were picked'],
      },
      {
        id: 'fear-of-failure', kind: 'read', minutes: 2, title: 'Playing not to fail', summary: 'When you are so worried about getting out that you stop playing.',
        paragraphs: [
          'Fear of failing makes you play to avoid mistakes instead of playing to do something. Batters poke and prod. Bowlers aim the ball instead of bowling it. It feels safe and works badly.',
          'The fear is usually about what others will think. Notice that the people whose opinion matters, your teammates, your coach, your family, care far more about how you go about it than about the score.',
          'Give yourself permission to fail while doing the right thing. Getting out to a positive, well-chosen shot is a better day than surviving an hour of fear. Set a process goal that rewards intent: "I will commit to every shot I choose."',
        ],
        points: ['Playing not to fail makes you worse', 'People judge how you play, not just the score', 'Permission to fail doing the right thing', 'Commit fully to what you choose'],
      },
      {
        id: 'better-opposition', kind: 'read', minutes: 2, title: 'Against a stronger side', summary: 'Stepping up a level, or facing someone with a reputation.',
        paragraphs: [
          'Against a better team or a well-known player, it is easy to play the name instead of the ball. The ball does not know who bowled it.',
          'Shrink the contest. You are not playing a whole team with a reputation. You are playing one ball, then another. Break the game into small pieces you can win: this over, the next ten runs, the next spell.',
          'Treat it as information, not a threat. A better opponent shows you exactly what the next level looks like. Whatever the result, come away with one thing you learned about your own game.',
        ],
        points: ['Play the ball, not the name', 'Win small pieces: this over, these ten runs', 'It shows you the next level', 'Take one lesson home'],
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
