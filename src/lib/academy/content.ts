// Server-only. The Academy's lessons. Quiz answers never leave the server: the app is sent the
// lesson and the questions, and its answers are marked in src/lib/academy/service.ts.
//
// Written for all ages in plain words. Review by a qualified coach before public launch.

export type TrackKey = 'skills' | 'game' | 'body' | 'beyond';
export type QuizItem = { q: string; options: [string, string, string]; answer: 0 | 1 | 2; why: string };
export type Lesson = {
  id: string;
  track: TrackKey;
  title: string;
  minutes: number;
  intro: string;
  points: string[];
  /** Something to go and do. */
  tryIt: string;
  quiz: [QuizItem, QuizItem, QuizItem];
};

export const TRACKS: Array<{ key: TrackKey; icon: string; title: string; blurb: string }> = [
  { key: 'skills', icon: '🏏', title: 'Cricket skills', blurb: 'Batting, bowling and fielding, with a drill to practise each time.' },
  { key: 'game', icon: '🧠', title: 'Game sense and Laws', blurb: 'Read the game, run well, set a field and know the Laws that matter.' },
  { key: 'body', icon: '💪', title: 'Body and mind', blurb: 'Warm up, fuel up, recover and stay calm when it counts.' },
  { key: 'beyond', icon: '🌱', title: 'Life beyond playing', blurb: 'Scoring, umpiring, coaching, leading and keeping a club running.' },
];

const WRITTEN: Lesson[] = [
  // ── Cricket skills ─────────────────────────────────────────────────────────
  {
    id: 'skills-grip-stance',
    track: 'skills',
    title: 'Grip, stance and backlift',
    minutes: 2,
    intro: 'Every good shot starts before the ball is bowled. A simple, comfortable set-up lets you move either way and bring the bat down straight.',
    points: [
      'Grip: hands close together in the middle of the handle, top hand holding firmly, bottom hand relaxed.',
      'Stance: feet about shoulder-width apart, knees slightly bent, weight on the balls of your feet so you can go forward or back.',
      'Head: still and level, eyes looking straight at the bowler. If your head falls over, your balance goes with it.',
      'Backlift: pick the bat up towards the stumps or first slip, not out towards gully, so it can come down in a straight line.',
    ],
    tryIt: 'Stand side-on to a mirror. Take your stance and backlift ten times. Each time check three things: eyes level, knees soft, hands together.',
    quiz: [
      { q: 'Where should your weight be in your stance?', options: ['On your heels', 'On the balls of your feet', 'All on your back foot'], answer: 1, why: 'On the balls of your feet you can move forward or back quickly.' },
      { q: 'Which hand should hold the bat more firmly?', options: ['The top hand', 'The bottom hand', 'Neither, hold it loosely'], answer: 0, why: 'The top hand controls the bat. A tight bottom hand drags the bat across the line.' },
      { q: 'Why does a still, level head matter?', options: ['It looks better', 'It keeps you balanced and helps you judge the ball', 'It stops the helmet moving'], answer: 1, why: 'Your head is heavy. Where it goes, your balance goes, and level eyes judge line and length best.' },
    ],
  },
  {
    id: 'skills-front-foot-drive',
    track: 'skills',
    title: 'The front-foot drive',
    minutes: 3,
    intro: 'The drive is how you score from a full ball. It is a controlled shot along the ground, not a slog.',
    points: [
      'Lead with your head. Lean towards the line of the ball and your front foot will follow.',
      'Step to the pitch of the ball with your front knee bent, so your weight goes into the shot.',
      'Bring the bat down straight and hit the ball under your eyes, close to your front pad.',
      'Keep your front elbow high and let the top hand guide the bat through. Finish the shot, do not stop at the ball.',
    ],
    tryIt: 'Ask a partner to drop a ball from shoulder height so it bounces once in front of you. Drive 20 along the ground between two markers about three metres apart. Count how many go through.',
    quiz: [
      { q: 'What should move first when you play a drive?', options: ['Your back foot', 'Your head, towards the ball', 'Your bottom hand'], answer: 1, why: 'Leading with the head takes your weight and your front foot to the ball.' },
      { q: 'Where should you hit the ball in a drive?', options: ['Well out in front of you', 'Under your eyes, close to the front pad', 'Behind your back leg'], answer: 1, why: 'Playing it under your eyes keeps the ball on the ground and leaves no gap between bat and pad.' },
      { q: 'What kind of ball is the drive for?', options: ['A full ball', 'A short ball', 'A ball over head height'], answer: 0, why: 'You drive full balls. Short balls are for back-foot shots.' },
    ],
  },
  {
    id: 'skills-bowling-action',
    track: 'skills',
    title: 'A bowling action you can repeat',
    minutes: 3,
    intro: 'Accuracy comes from doing the same thing every ball. Build a smooth, simple action first and speed will follow.',
    points: [
      'Grip for seam bowling: first two fingers either side of the seam, thumb underneath, held in the fingers, not the palm.',
      'Run-up: start slowly and build. It should feel smooth, not a sprint. Use the same number of steps each time.',
      'At the crease stay tall. Your front arm reaches up, then pulls down towards your target as your bowling arm comes over straight.',
      'Follow through: let your bowling arm swing past your opposite hip and keep moving forward for a few steps.',
      'Aim: the top of off stump is the hardest ball for most batters to score from.',
    ],
    tryIt: 'Put a towel or marker on a good length, a few metres in front of the stumps. Bowl 18 balls (three overs) and count how many land on it. Try to beat your score next time.',
    quiz: [
      { q: 'How should a seam bowler hold the ball?', options: ['Deep in the palm', 'In the fingers, two fingers either side of the seam', 'With all four fingers on top'], answer: 1, why: 'Holding it in the fingers with the seam upright gives control and helps the ball move.' },
      { q: 'What is the best way to become accurate?', options: ['Bowl as fast as you can', 'Repeat the same smooth action every ball', 'Change your run-up often'], answer: 1, why: 'A repeatable action puts the ball in the same place again and again.' },
      { q: 'What should you do after letting go of the ball?', options: ['Stop dead at the crease', 'Follow through and keep moving forward', 'Turn round straight away'], answer: 1, why: 'Following through finishes the action and is easier on your body than stopping suddenly.' },
    ],
  },
  {
    id: 'skills-catching',
    track: 'skills',
    title: 'Catching: high balls and close catches',
    minutes: 2,
    intro: 'Catches win matches, and good catching is mostly watching the ball and having soft hands.',
    points: [
      'Watch the ball all the way into your hands. Most drops happen when you look away early.',
      'High catch: get under the ball early and stand still. Catch it at eye level with fingers pointing up, or at chest height with fingers pointing down.',
      'Close catch: stay low with knees bent, hands together and fingers pointing down, weight on the balls of your feet.',
      'Soft hands: let your hands give with the ball as it arrives, like catching an egg.',
      'Call "mine" loudly if two of you could go for it.',
    ],
    tryIt: 'With a partner, take 20 underarm catches: 10 two-handed, then 5 with each hand. No partner? Throw a tennis ball against a wall and catch the rebound.',
    quiz: [
      { q: 'What is the most common reason catches are dropped?', options: ['The ball is too hard', 'Looking away before the ball is in your hands', 'Standing still'], answer: 1, why: 'Watch it right into your hands. Looking up to throw or celebrate too early costs catches.' },
      { q: 'What does "soft hands" mean?', options: ['Wearing gloves', 'Letting your hands give as the ball arrives', 'Catching with one hand'], answer: 1, why: 'Giving with the ball takes the pace off so it does not bounce out.' },
      { q: 'Two fielders are under the same high ball. What should happen?', options: ['Both go for it quietly', 'One calls "mine" loudly and the other leaves it', 'Both leave it'], answer: 1, why: 'A loud, early call avoids collisions and drops.' },
    ],
  },
  {
    id: 'skills-ground-fielding',
    track: 'skills',
    title: 'Ground fielding and throwing',
    minutes: 3,
    intro: 'You will field far more balls than you bat or bowl. Saving runs and throwing well makes you valuable in any team.',
    points: [
      'Attack the ball. Move towards it instead of waiting for it to reach you.',
      'When a mistake would cost a boundary, use the long barrier: go down on one knee so your leg and foot block the ball behind your hands.',
      'To throw, stand side-on, point your front arm at the target, keep your throwing elbow above your shoulder and follow through.',
      'Aim for the top of the stumps so the keeper or bowler can take it cleanly.',
      'Back up: when someone else throws, get behind the stumps in line with the throw.',
    ],
    tryIt: 'Set a single stump or a bag ten metres away. Roll a ball out, run to pick it up beside your foot, and throw at the target. Ten goes, count your hits, then step back two metres.',
    quiz: [
      { q: 'When should you use the long barrier?', options: ['Every time the ball is hit', 'When a misfield would cost a boundary', 'Only when catching'], answer: 1, why: 'It is the safe option when there is nobody behind you. For quick singles you attack the ball instead.' },
      { q: 'Where should your throwing elbow be?', options: ['Below your waist', 'Above your shoulder', 'Tucked into your ribs'], answer: 1, why: 'A high elbow gives a stronger, more accurate throw and is kinder to your shoulder.' },
      { q: 'What is backing up in the field?', options: ['Walking in as the bowler runs up', 'Getting behind the stumps in line with a throw', 'Standing behind the umpire'], answer: 1, why: 'Backing up stops overthrows when a throw misses.' },
    ],
  },

  // ── Game sense and Laws ────────────────────────────────────────────────────
  {
    id: 'game-running',
    track: 'game',
    title: 'Running between the wickets',
    minutes: 2,
    intro: 'Good running turns ones into twos and puts fielders under pressure. Bad running gives away wickets for nothing.',
    points: [
      'Use three calls only: "Yes", "No" or "Wait". Call loudly and early.',
      'The striker calls when the ball goes in front of the wicket. The non-striker calls when it goes behind, because they can see it.',
      'Run the first run hard and look for a second. Turn facing the ball so you can see the fielder.',
      'Slide your bat along the ground over the line. A bat in the air can still be run out.',
      'At the non-striker\'s end, walk in with the bowler and leave your crease only once the ball has been released.',
    ],
    tryIt: 'With a partner and two markers 20 metres apart, run three, calling every run out loud and sliding the bat in each time. Time it, rest, and try to beat it.',
    quiz: [
      { q: 'Who calls when the ball goes behind the wicket?', options: ['The striker', 'The non-striker', 'The umpire'], answer: 1, why: 'The non-striker is facing that way and can see the ball and the fielder.' },
      { q: 'Why slide the bat along the ground?', options: ['It is faster and counts as soon as it is over the line', 'To protect the bat', 'The umpire prefers it'], answer: 0, why: 'A grounded bat behind the line makes you safe sooner than your feet would.' },
      { q: 'Which of these is a good call?', options: ['"Maybe"', '"Go on then if you want"', '"Wait"'], answer: 2, why: 'Yes, No and Wait are clear. Anything else causes mix-ups.' },
    ],
  },
  {
    id: 'game-field-settings',
    track: 'game',
    title: 'Setting a field: the basics',
    minutes: 3,
    intro: 'A field is a plan. It should match where your bowler is trying to bowl and where this batter likes to hit.',
    points: [
      'The off side is the side the batter\'s bat faces. The leg side (or on side) is behind their legs.',
      'Know the main positions: slips and gully behind the bat on the off side; point, cover and mid-off in front; mid-on, midwicket, square leg and fine leg on the leg side.',
      'Ring fielders stop singles. Boundary fielders stop fours. Decide which matters more right now.',
      'Put your best fielders where the ball goes most often for this bowler.',
      'A Law to remember: no more than two fielders may be behind square on the leg side when the ball is bowled.',
    ],
    tryIt: 'Draw a pitch on paper. Set a field for a bowler aiming at off stump to a right-handed batter, with nine fielders plus the keeper. Then explain to someone why each fielder is there.',
    quiz: [
      { q: 'What is the job of a fielder on the boundary?', options: ['To stop singles', 'To stop fours', 'To take the bails off'], answer: 1, why: 'Boundary fielders turn fours into ones and twos. Ring fielders stop the singles.' },
      { q: 'How many fielders are allowed behind square on the leg side?', options: ['No more than two', 'No more than four', 'As many as you like'], answer: 0, why: 'More than two there when the ball is bowled is a no-ball.' },
      { q: 'What should decide your field?', options: ['Where fielders want to stand', 'Your bowler\'s plan and where the batter hits', 'The same field every time'], answer: 1, why: 'A field supports what the bowler is trying to do against this batter.' },
    ],
  },
  {
    id: 'game-ways-out',
    track: 'game',
    title: 'How batters get out',
    minutes: 3,
    intro: 'Five kinds of dismissal make up almost every wicket you will see. A few rare ones are worth knowing so they never surprise you.',
    points: [
      'Bowled: the ball hits the stumps and a bail comes off.',
      'Caught: a fielder catches the ball after it touches the bat or the glove holding the bat, before it bounces.',
      'LBW: the ball would have hit the stumps but hit the batter\'s body first (there is a full lesson on this).',
      'Run out: the stumps are broken while a batter is out of their ground going for a run.',
      'Stumped: the keeper breaks the stumps when the striker is out of their ground and not attempting a run.',
      'Rare ones: hit wicket, obstructing the field, hitting the ball twice and timed out.',
    ],
    tryIt: 'Watch ten minutes of any match, live or highlights. For every wicket, say out loud how the batter was out and what had to happen for the umpire to give it.',
    quiz: [
      { q: 'What is the difference between stumped and run out?', options: ['There is none', 'Stumped is by the keeper when the striker is not attempting a run', 'Run out only happens off a no-ball'], answer: 1, why: 'If the striker is going for a run, it is a run out. Stumped is the keeper catching them out of their ground while not running.' },
      { q: 'A batter knocks their own stumps over with the bat while playing a shot. How are they out?', options: ['Bowled', 'Hit wicket', 'Not out'], answer: 1, why: 'Breaking your own wicket while playing at the ball or setting off for a run is hit wicket.' },
      { q: 'Which of these counts as caught?', options: ['The ball hits the pad and is caught', 'The ball hits the glove holding the bat and is caught', 'The ball bounces first and is caught'], answer: 1, why: 'A glove holding the bat counts as the bat. The pad does not, and the ball must not bounce.' },
    ],
  },
  {
    id: 'game-lbw',
    track: 'game',
    title: 'LBW made simple',
    minutes: 3,
    intro: 'Leg before wicket looks complicated but the umpire is really asking a short list of questions, in order.',
    points: [
      'Was it a fair ball? You cannot be LBW off a no-ball.',
      'Where did it pitch? If the ball bounced outside the line of leg stump, it is not out.',
      'Did it hit the bat first? If it touched the bat or glove before the pad, it is not out.',
      'Where did it hit you? It must hit you in line with the stumps. If you played no shot, being hit outside off stump can also be out.',
      'Would it have hit the stumps? If yes to all of this, you are out.',
    ],
    tryIt: 'Explain the five LBW questions to a team-mate or someone at home without looking. If you can teach it, you know it.',
    quiz: [
      { q: 'The ball pitches outside leg stump and hits the pad in front of middle. Out or not out?', options: ['Out', 'Not out', 'Only out if it was a spinner'], answer: 1, why: 'A ball that pitches outside the line of leg stump can never be LBW.' },
      { q: 'The ball hits the edge of the bat, then the pad in front of the stumps. Out LBW?', options: ['Yes', 'No', 'Only if the bowler appeals loudly'], answer: 1, why: 'Bat first means not out LBW.' },
      { q: 'You leave a ball, playing no shot, and it hits your pad outside off stump but was going on to hit the stumps. Out?', options: ['Out', 'Not out', 'It is a dead ball'], answer: 0, why: 'If you offer no shot, you can be LBW even when hit outside the line of off stump.' },
    ],
  },
  {
    id: 'game-building-an-innings',
    track: 'game',
    title: 'Building an innings and chasing a target',
    minutes: 3,
    intro: 'Scoring runs is about making good decisions over time, not hitting every ball for four.',
    points: [
      'Give yourself a few balls to see how the pitch and bowler are behaving before you attack.',
      'Rotate the strike. Singles keep the score moving and stop a bowler settling on one batter.',
      'Bat in partnerships. Talk between overs about who to target and where the gaps are.',
      'Chasing: break the target into small pieces, such as runs needed in the next five overs, instead of the whole total.',
      'Wickets in hand matter. A set batter at the end is worth more than a risky shot in the middle.',
    ],
    tryIt: 'Next time you bat, or watch a chase, work out the runs needed per over at the start and again every five overs. Notice how one good over changes it.',
    quiz: [
      { q: 'Your team needs 60 runs from 10 overs. How many an over is that?', options: ['Five', 'Six', 'Ten'], answer: 1, why: '60 divided by 10 is 6 runs an over.' },
      { q: 'Why are singles useful?', options: ['They keep the score moving and unsettle the bowler', 'They tire the fielders out', 'They are worth more late in the game'], answer: 0, why: 'Rotating the strike adds up and stops a bowler building pressure on one batter.' },
      { q: 'What is a sensible way to start an innings?', options: ['Attack the first ball', 'Take a few balls to judge the pitch and bowler', 'Block every ball for ten overs'], answer: 1, why: 'A short look first lets you pick the right balls to score from.' },
    ],
  },

  // ── Body and mind ──────────────────────────────────────────────────────────
  {
    id: 'body-warm-up',
    track: 'body',
    title: 'Warm up properly',
    minutes: 2,
    intro: 'Ten to fifteen minutes of warming up helps you play better from ball one and lowers your risk of pulls and strains.',
    points: [
      'Start by raising your pulse: easy jogging, skipping or side-steps for a few minutes.',
      'Then moving stretches: leg swings, walking lunges, arm circles, twists. Save long held stretches for after the game.',
      'Finish with cricket: throw over short distances and build up, take some catches, bowl a few balls at half pace.',
      'After the game, cool down with a gentle walk and some held stretches.',
    ],
    tryIt: 'Before your next session, do this: three minutes jogging and skipping, ten leg swings each side, ten walking lunges, ten arm circles each way, then ten short throws building to ten long ones.',
    quiz: [
      { q: 'What should come first in a warm-up?', options: ['Long held stretches', 'Something that raises your pulse', 'Bowling flat out'], answer: 1, why: 'Warm muscles first. Then moving stretches, then cricket skills.' },
      { q: 'When are long held stretches most useful?', options: ['Before you play', 'After you play', 'Never'], answer: 1, why: 'Before play, moving stretches prepare you better. Held stretches suit the cool-down.' },
      { q: 'How should you start throwing in a warm-up?', options: ['Short and gentle, then build up', 'As far as you can straight away', 'Do not throw until the match'], answer: 0, why: 'Building distance gradually protects your shoulder and elbow.' },
    ],
  },
  {
    id: 'body-bowling-workload',
    track: 'body',
    title: 'Looking after your body as a bowler',
    minutes: 3,
    intro: 'Bowling, especially fast bowling, puts big forces through your back, side and legs. Managing how much you bowl keeps you on the field.',
    points: [
      'Build up gradually. Do not go from bowling nothing to bowling lots in one week.',
      'Young fast bowlers have limits on overs in a spell and in a day, set by the ECB for each age group. Ask your coach or captain what yours are and stick to them.',
      'Take rest days between heavy bowling days so your body can adapt.',
      'Strong legs, hips and core take load off your back. Squats, lunges and planks all help.',
      'Pain in your lower back that does not go away is a warning sign. Stop bowling and tell a coach, parent or physio.',
    ],
    tryIt: 'For the next two weeks, write down how many overs you bowl each day, in matches and in nets. Look for days where it jumps suddenly.',
    quiz: [
      { q: 'What is the safest way to increase how much you bowl?', options: ['All at once before the season', 'Gradually, week by week', 'It does not matter'], answer: 1, why: 'Sudden jumps in bowling are when injuries tend to happen.' },
      { q: 'A young fast bowler has lower back pain that will not go away. What should they do?', options: ['Bowl through it', 'Stop bowling and tell a coach, parent or physio', 'Bowl spin for one over then carry on'], answer: 1, why: 'Ongoing lower back pain in a bowler needs checking, not ignoring.' },
      { q: 'Who sets the limits on overs for junior fast bowlers?', options: ['Each player decides', 'The ECB, by age group', 'The opposition captain'], answer: 1, why: 'The ECB publishes limits for each age group. Your coach or captain should know them.' },
    ],
  },
  {
    id: 'body-match-day-fuel',
    track: 'body',
    title: 'Eating and drinking for match day',
    minutes: 2,
    intro: 'A cricket match is long. What you eat and drink decides whether you are still sharp in the last hour.',
    points: [
      'Eat a proper meal two to three hours before you play: something like pasta, rice, potatoes or bread with some protein.',
      'Top up during breaks with easy foods such as a banana, a sandwich or a cereal bar.',
      'Drink water little and often through the day, and more when it is hot. Do not wait until you are thirsty.',
      'Afterwards, eat a meal with carbohydrate and protein to help your body recover.',
      'Match day is not the day to try a food you have never eaten before.',
    ],
    tryIt: 'Plan your next match day on paper: what you will eat beforehand and when, what goes in your bag for breaks, and how much water you will take.',
    quiz: [
      { q: 'When is a good time for your main meal before a match?', options: ['Ten minutes before the start', 'Two to three hours before', 'The night before only'], answer: 1, why: 'That gives your body time to digest so the energy is there when you need it.' },
      { q: 'How should you drink during a match?', options: ['Only when you feel thirsty', 'Little and often through the day', 'One big drink at the end'], answer: 1, why: 'By the time you feel thirsty you are already short of fluid.' },
      { q: 'Which is a good snack at a break?', options: ['A banana or a sandwich', 'Nothing at all', 'A large fry-up'], answer: 0, why: 'Easy-to-digest carbohydrate tops your energy up without weighing you down.' },
    ],
  },
  {
    id: 'body-calm-under-pressure',
    track: 'body',
    title: 'Staying calm under pressure',
    minutes: 2,
    intro: 'Everyone feels nerves. Good players have a simple routine that brings them back to the next ball.',
    points: [
      'Use a routine before every ball: a breath, a short cue word such as "watch the ball", then switch on.',
      'Breathe slowly: in through your nose for four, out for six. It settles your body in a few breaths.',
      'Think about the next ball, not the last one. You cannot change a play-and-miss or a dropped catch.',
      'Focus on what you control: your effort, your routine and your attitude. Not the pitch, the umpire or the score.',
      'Talk to your partner or a team-mate between overs. Pressure shrinks when it is shared.',
    ],
    tryIt: 'Pick your own cue word and a two-breath routine. Use it before every ball in your next net session until it feels automatic.',
    quiz: [
      { q: 'What is a pre-ball routine for?', options: ['To waste time', 'To bring your focus back to the next ball', 'To put off the bowler'], answer: 1, why: 'A routine gives your mind one simple job, every ball.' },
      { q: 'You have just played and missed. What helps most?', options: ['Replaying it in your head', 'Resetting and focusing on the next ball', 'Changing your grip'], answer: 1, why: 'The last ball is gone. The next one is the only one you can do anything about.' },
      { q: 'Which of these can you control?', options: ['The umpire\'s decisions', 'Your effort and your routine', 'The weather'], answer: 1, why: 'Putting your attention on what you control keeps nerves from running the show.' },
    ],
  },
  {
    id: 'body-rest-recovery',
    track: 'body',
    title: 'Rest, sleep and recovery',
    minutes: 2,
    intro: 'You get fitter and stronger while you recover, not while you train. Rest is part of the plan.',
    points: [
      'Sleep is the best recovery there is. Teenagers need around eight to ten hours a night and adults seven to nine.',
      'The day after a hard match, do something light such as a walk, a swim or an easy bike ride.',
      'Feeling stiff for a day or two after hard exercise is normal. It eases as you move.',
      'Sharp pain, swelling, or pain that lasts more than a few days is not normal. Get it looked at.',
      'Have at least one full day off from sport each week.',
    ],
    tryIt: 'For one week, note what time you go to sleep and wake up, and how you feel at training. See if more sleep changes anything.',
    quiz: [
      { q: 'When does your body actually get stronger?', options: ['While you are training', 'While you rest and recover afterwards', 'Only in the off-season'], answer: 1, why: 'Training is the signal. Recovery is when your body rebuilds.' },
      { q: 'What should you do the day after a hard match?', options: ['Another hard session', 'Something light, such as a walk', 'Stay in bed all day'], answer: 1, why: 'Gentle movement helps stiffness ease faster than doing nothing.' },
      { q: 'Which of these should you get checked?', options: ['Feeling stiff the next morning', 'Sharp pain or swelling that lasts several days', 'Being a bit tired'], answer: 1, why: 'Normal stiffness fades. Sharp or lasting pain needs looking at.' },
    ],
  },

  // ── Life beyond playing ────────────────────────────────────────────────────
  {
    id: 'beyond-scoring',
    track: 'beyond',
    title: 'Learn to score',
    minutes: 3,
    intro: 'Every match needs a scorer, and scoring is one of the best ways to understand the game. Clubs are always short of them.',
    points: [
      'In a scorebook each ball gets a mark: a dot for no run, a number for runs off the bat, and a W for a wicket.',
      'Extras have their own symbols: a cross for a wide, a circle for a no-ball, a triangle for a bye and an upside-down triangle for a leg bye.',
      'The scorer acknowledges every umpire signal, usually with a raised hand, so the umpire knows it has been recorded.',
      'After each over, check the total and the bowler\'s figures add up.',
      'Many clubs now score on a phone or tablet. The ideas are the same.',
    ],
    tryIt: 'Score five overs of any match, live or on screen, on paper using the symbols above. At the end, check your total against the real score.',
    quiz: [
      { q: 'What does a dot in the scorebook mean?', options: ['A wicket', 'A ball with no run scored', 'A wide'], answer: 1, why: 'That is where "dot ball" comes from.' },
      { q: 'How is a wide shown in a scorebook?', options: ['A cross', 'A circle', 'A triangle'], answer: 0, why: 'A cross is a wide, a circle is a no-ball, and triangles are byes and leg byes.' },
      { q: 'Why does the scorer raise a hand after an umpire signals?', options: ['To ask a question', 'To show the signal has been seen and recorded', 'To ask for a drink'], answer: 1, why: 'The umpire waits for that acknowledgement before play continues.' },
    ],
  },
  {
    id: 'beyond-umpiring',
    track: 'beyond',
    title: 'Try umpiring',
    minutes: 3,
    intro: 'Umpiring teaches you the Laws faster than anything else, and a club that can supply umpires is a club people want to play against.',
    points: [
      'The main signals: one finger raised for out, an arm waved side to side for four, both arms straight up for six.',
      'One arm held out sideways is a no-ball. Both arms out sideways is a wide.',
      'An open hand raised above the head is a bye. Touching a raised knee is a leg bye.',
      'Count six fair balls in an over. Wides and no-balls do not count and are bowled again.',
      'Stand still, watch the front foot, then lift your eyes to the batter. Give decisions calmly and do not be rushed.',
    ],
    tryIt: 'Stand in front of a mirror and make all seven signals from this lesson from memory. Then umpire six balls of a net or garden game, counting out loud.',
    quiz: [
      { q: 'What does an umpire holding both arms out sideways mean?', options: ['No-ball', 'Wide', 'Dead ball'], answer: 1, why: 'Both arms out is a wide. One arm out is a no-ball.' },
      { q: 'How many fair balls are in an over?', options: ['Five', 'Six', 'Eight'], answer: 1, why: 'Six fair balls. Wides and no-balls are bowled again.' },
      { q: 'What does touching a raised knee signal?', options: ['Leg bye', 'Bye', 'Short run'], answer: 0, why: 'Leg bye is the knee. A bye is an open hand raised above the head.' },
    ],
  },
  {
    id: 'beyond-coaching-pathway',
    track: 'beyond',
    title: 'The pathway into coaching',
    minutes: 2,
    intro: 'If you enjoy helping others get better, coaching may be for you. You can start younger than you might think by helping at junior sessions.',
    points: [
      'Start by helping a qualified coach at your club\'s junior training. Setting up drills and feeding balls is real coaching experience.',
      'The ECB runs coaching courses from entry level upwards. Your county cricket board lists what is running near you.',
      'Anyone coaching children needs safeguarding training and a background check through the ECB. Your club welfare officer can explain how.',
      'Good coaches ask questions more than they give orders. "What did you notice?" teaches more than "do it like this".',
      'Keep one thing in mind for each player. Nobody can fix five things at once.',
    ],
    tryIt: 'At your next training, help one younger or newer player with one skill. Give one tip only, then ask them what they felt.',
    quiz: [
      { q: 'What is a good first step into coaching?', options: ['Wait until you stop playing', 'Help a qualified coach at junior training', 'Buy coaching equipment'], answer: 1, why: 'Helping at sessions is how most coaches begin, and clubs always need the help.' },
      { q: 'What does everyone who coaches children need?', options: ['A county cap', 'Safeguarding training and a background check', 'Their own minibus'], answer: 1, why: 'These protect young players and the adults working with them.' },
      { q: 'How many things should you ask a player to work on at once?', options: ['One', 'Five', 'As many as you can spot'], answer: 0, why: 'One clear focus gets learned. A list gets forgotten.' },
    ],
  },
  {
    id: 'beyond-how-a-club-runs',
    track: 'beyond',
    title: 'How a club really runs',
    minutes: 2,
    intro: 'A match only happens because a lot of people do jobs you rarely see. Knowing them is the first step to helping.',
    points: [
      'The ground: someone cuts, rolls and marks the pitch, usually over several days before a game.',
      'Match day: scorers, umpires, teas, the bar and setting out boundary markers and sightscreens.',
      'Behind the scenes: fixtures, team selection, collecting fees, the accounts and the club\'s welfare officer.',
      'Most of these people are volunteers with jobs and families of their own.',
      'Small jobs matter. Putting the covers on, clearing up after tea, or scoring ten overs all make a difference.',
    ],
    tryIt: 'Open the Shifts tab and sign up for one job, or ask at your club what needs doing this week and do one small thing.',
    quiz: [
      { q: 'Who does most of the work that keeps a club running?', options: ['Paid staff', 'Volunteers', 'The league'], answer: 1, why: 'Grassroots clubs run almost entirely on volunteers.' },
      { q: 'How long does preparing a pitch usually take?', options: ['Ten minutes on the morning', 'Several days of cutting, rolling and marking', 'It needs no preparation'], answer: 1, why: 'A good pitch is the result of days of work before the match.' },
      { q: 'What is the best way to start helping?', options: ['Wait to be asked', 'Offer to do one small job', 'Join the committee straight away'], answer: 1, why: 'One small job, done reliably, is worth more than a big promise.' },
    ],
  },
  {
    id: 'beyond-leading-a-team',
    track: 'beyond',
    title: 'Leading a team',
    minutes: 3,
    intro: 'You do not need to be captain to lead. Leadership is how you behave when things are going badly as well as when they go well.',
    points: [
      'A captain\'s jobs on the field: the toss, the batting order, bowling changes and field settings.',
      'Off the field: making sure everyone knows the plan and feels part of the team, including whoever is batting at eleven.',
      'Speak to players about mistakes privately and praise them publicly.',
      'The Spirit of Cricket asks players to respect their captain, team-mates, opponents and the umpires\' decisions. The captain is responsible for making sure the team does.',
      'Stay level. A team takes its mood from its leaders.',
    ],
    tryIt: 'In your next match, do one leadership thing without being asked: encourage a team-mate after a mistake, or thank the umpires and scorers at the end.',
    quiz: [
      { q: 'Who is responsible for a team playing within the Spirit of Cricket?', options: ['The umpires only', 'The captain', 'The scorer'], answer: 1, why: 'The Laws place that responsibility on the captain.' },
      { q: 'A team-mate drops a catch. What does a good leader do?', options: ['Shout at them', 'Encourage them and move on to the next ball', 'Move them out of the team'], answer: 1, why: 'They already know. Getting them ready for the next chance helps the team.' },
      { q: 'Do you need to be captain to lead?', options: ['Yes', 'No, anyone can set the standard', 'Only if you are the oldest'], answer: 1, why: 'Effort, encouragement and respect are leadership from any position.' },
    ],
  },
];

// The lessons above were written with the right answer mostly in the middle. Each question's
// options are put in a fixed but different order here, so position is no clue to the answer.
function reordered(item: QuizItem, salt: string): QuizItem {
  let h = 2166136261;
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const order = orders[h % orders.length];
  return {
    q: item.q,
    options: [item.options[order[0]], item.options[order[1]], item.options[order[2]]],
    answer: order.indexOf(item.answer) as 0 | 1 | 2,
    why: item.why,
  };
}

export const LESSONS: Lesson[] = WRITTEN.map((lesson) => ({
  ...lesson,
  quiz: [
    reordered(lesson.quiz[0], `${lesson.id}:0`),
    reordered(lesson.quiz[1], `${lesson.id}:1`),
    reordered(lesson.quiz[2], `${lesson.id}:2`),
  ],
}));

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
