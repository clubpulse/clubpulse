// Static match-day preparation content for the website, ported from the app's warm-up library
// (expo/lib/warmup.ts, section "Match Day"). General preparation, not medical advice.

export type Checklist = { id: string; title: string; summary: string; intro: string; items: { id: string; text: string }[] };

function list(id: string, title: string, summary: string, intro: string, texts: string[]): Checklist {
  return { id, title, summary, intro, items: texts.map((text, i) => ({ id: `${id}:${i}`, text })) };
}

export const MATCH_DAY_CHECKLISTS: Checklist[] = [
  list('night-before', 'The night before', 'Pack, plan and switch off.', 'Do the thinking tonight so tomorrow is clear.', [
    'Kit packed and checked: nothing to hunt for in the morning',
    'Know the start time, the ground and how you are getting there',
    'Decide your plan for your first over, batting or bowling',
    'Eat a proper meal and drink water',
    'Screens off half an hour before bed',
    'Try a long breath out if your head is busy',
  ]),
  list('morning', 'Match morning', 'Fuel, time and a calm start.', 'Give yourself more time than you think you need.', [
    'Breakfast you know sits well',
    'Leave early enough to arrive unhurried',
    'Read your list of things you have done well',
    'Picture your first few balls once, on the way or when you arrive',
    'Decide your one focus for the day',
  ]),
  list('at-ground', 'At the ground', 'Warm up the body and switch on the head.', 'Arrive, look, then warm up with purpose.', [
    'Walk out and look at the pitch, the boundaries and the wind',
    'Warm up properly: run, stretch, catch, throw',
    'Hit or bowl enough to feel your rhythm, then stop',
    'Know your role today: ask the captain if you are not sure',
    'Say something positive to a teammate',
    'Two minutes of quiet focus before the start',
  ]),
  list('walking-out', 'Walking out', 'Your routine, the same every time.', 'A routine tells your body it is time. Keep it the same on good days and bad.', [
    'Walk out at your own pace, head up',
    'Look at where the fielders are, or where your field is set',
    'Take guard or mark your run-up the way you always do',
    'One slow breath out',
    'Your word: "watch the ball", "hit the length"',
    'Play the first ball on its merits',
  ]),
  list('after', 'After the game', 'Three questions, then let it go.', 'Answer these in your head, or write them down somewhere of your own.', [
    'One thing I did well today',
    'One thing I will work on this week',
    'One thing I enjoyed',
    'Thank the people who made the game happen',
    'Leave the result at the ground',
  ]),
];

export const ALL_CHECKLIST_ITEM_IDS = new Set(MATCH_DAY_CHECKLISTS.flatMap((c) => c.items.map((i) => i.id)));
