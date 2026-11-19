// Who Am I? Famous cricketers by name and career facts only: no photographs, no likenesses.
// Clues run from hardest to easiest. Facts are historic events, so they do not go out of date.

export type Mystery = { name: string; clues: [string, string, string, string] };

export const WHOAMI_BANK: Mystery[] = [
  { name: 'Sachin Tendulkar', clues: [
    'I made my Test debut at 16, in Karachi in 1989.',
    'I scored the first double hundred in men\'s one-day internationals, in 2010.',
    'I finished with one hundred international centuries.',
    'They called me the Little Master, and I played all my home cricket for Mumbai.'] },
  { name: 'Don Bradman', clues: [
    'I needed four runs in my last Test innings and was bowled for a duck.',
    'A whole style of bowling, Bodyline, was invented to stop me.',
    'I grew up hitting a golf ball against a water tank with a stump.',
    'My Test batting average was 99.94.'] },
  { name: 'Shane Warne', clues: [
    'My first ball in an Ashes Test, in 1993, bowled Mike Gatting.',
    'I took a World Cup final player-of-the-match award in 1999.',
    'I captained the first IPL champions, in 2008.',
    'I am Australia\'s great leg-spinner, with 708 Test wickets.'] },
  { name: 'Muttiah Muralitharan', clues: [
    'I took my final Test wicket with my very last ball in Test cricket, in Galle.',
    'I was part of the side that won the 1996 World Cup.',
    'I bowled off-spin with a famously flexible wrist.',
    'I finished with exactly 800 Test wickets for Sri Lanka.'] },
  { name: 'Brian Lara', clues: [
    'I made 501 not out for Warwickshire in 1994.',
    'I twice held the record for the highest Test score.',
    'My 153 not out won a famous Test against Australia in Barbados in 1999.',
    'I scored 400 not out in a Test, for the West Indies.'] },
  { name: 'Kapil Dev', clues: [
    'I made 175 not out against Zimbabwe at Tunbridge Wells.',
    'I once hit four sixes in a row at Lord\'s to save a follow-on.',
    'I was a fast-bowling all-rounder from Haryana.',
    'I captained India to their first World Cup, in 1983.'] },
  { name: 'Imran Khan', clues: [
    'I asked my team to fight like cornered tigers.',
    'I retired from cricket and came back at the request of my country\'s president.',
    'I was a fast-bowling all-rounder who studied at Oxford.',
    'I captained Pakistan to the 1992 World Cup.'] },
  { name: 'MS Dhoni', clues: [
    'I once worked as a ticket examiner on the railways.',
    'I finished a World Cup final with a six over long-on.',
    'I captained my country to the first men\'s T20 World Cup, in 2007.',
    'I am India\'s wicket-keeper captain, known as Captain Cool.'] },
  { name: 'Ricky Ponting', clues: [
    'I made 140 not out in a World Cup final.',
    'I was run out by a substitute fielder at Trent Bridge in 2005 and was not happy.',
    'I come from Tasmania and my nickname is Punter.',
    'I captained Australia to World Cup wins in 2003 and 2007.'] },
  { name: 'Adam Gilchrist', clues: [
    'I walked in a World Cup semi-final when the umpire had not given me out.',
    'I kept a squash ball inside my glove during a World Cup final.',
    'I made 149 in the 2007 World Cup final.',
    'I was Australia\'s attacking left-handed wicket-keeper batter.'] },
  { name: 'Ian Botham', clues: [
    'I walked across Britain several times for charity.',
    'I resigned the England captaincy and won the next Test with the bat.',
    'I made 149 not out at Headingley after England followed on.',
    'The 1981 Ashes are often named after me.'] },
  { name: 'Andrew Flintoff', clues: [
    'I consoled Brett Lee at Edgbaston after a two-run win.',
    'I was player of the series in the 2005 Ashes for England.',
    'I played my county cricket for Lancashire.',
    'My nickname is Freddie.'] },
  { name: 'Viv Richards', clues: [
    'I also played football for my country in World Cup qualifying.',
    'I made 189 not out in a one-day international in 1984.',
    'I never wore a helmet at the crease.',
    'I am the Antiguan batter known as the Master Blaster.'] },
  { name: 'Garfield Sobers', clues: [
    'I made 365 not out in a Test at the age of 21.',
    'I could bowl fast, swing, finger spin and wrist spin.',
    'I hit six sixes in an over at Swansea in 1968.',
    'I am the great all-rounder from Barbados.'] },
  { name: 'Yuvraj Singh', clues: [
    'I was player of the tournament at the 2011 World Cup.',
    'I returned to international cricket after treatment for cancer.',
    'I made a T20 international fifty from 12 balls.',
    'I hit Stuart Broad for six sixes in an over in 2007.'] },
  { name: 'Chris Gayle', clues: [
    'I scored the first century in men\'s T20 internationals, in 2007.',
    'I made two Test triple hundreds.',
    'I made 175 not out in an IPL innings.',
    'I am the Jamaican left-hander who calls himself the Universe Boss.'] },
  { name: 'AB de Villiers', clues: [
    'I played several sports to a high level as a schoolboy.',
    'I made a one-day international hundred from 31 balls.',
    'Fans called me Mr 360 for where I could hit the ball.',
    'I kept wicket and captained South Africa.'] },
  { name: 'Kumar Sangakkara', clues: [
    'I gave the MCC Spirit of Cricket lecture at Lord\'s in 2011.',
    'I scored hundreds in four consecutive innings at the 2015 World Cup.',
    'I trained as a lawyer.',
    'I was Sri Lanka\'s left-handed wicket-keeper batter.'] },
  { name: 'Rahul Dravid', clues: [
    'I kept wicket for my country at the 2003 World Cup, though I was picked as a batter.',
    'I shared a stand of 376 with VVS Laxman at Eden Gardens in 2001.',
    'I later coached India to a T20 World Cup title.',
    'They called me The Wall.'] },
  { name: 'Anil Kumble', clues: [
    'I once bowled in a Test with a broken jaw strapped up.',
    'I was an engineer before I was a cricketer.',
    'I bowled leg-spin at close to medium pace.',
    'I took all ten wickets in a Test innings against Pakistan in 1999.'] },
  { name: 'Glenn McGrath', clues: [
    'I trod on a ball in the warm-up at Edgbaston in 2005 and missed the Test.',
    'I was player of the tournament at the 2007 World Cup.',
    'My nickname is Pigeon.',
    'I was Australia\'s metronomic fast bowler with 563 Test wickets.'] },
  { name: 'Wasim Akram', clues: [
    'I made 257 not out in a Test, batting at number eight.',
    'I was player of the match in the 1992 World Cup final.',
    'I played county cricket for Lancashire.',
    'I am Pakistan\'s left-arm Sultan of Swing.'] },
  { name: 'Jacques Kallis', clues: [
    'I scored hundreds in five consecutive Tests.',
    'I took more than 250 Test wickets as well as scoring heavily.',
    'I was born in Cape Town.',
    'I am South Africa\'s great batting all-rounder.'] },
  { name: 'Ben Stokes', clues: [
    'I was born in Christchurch, New Zealand.',
    'I made 135 not out to win an Ashes Test at Headingley in 2019.',
    'I was player of the match in the 2019 World Cup final.',
    'I became England\'s Test captain in 2022.'] },
  { name: 'Mithali Raj', clues: [
    'I made a hundred on my one-day international debut as a teenager.',
    'I trained in classical dance before cricket took over.',
    'I led my country to two Women\'s World Cup finals.',
    'I captained India\'s women for many years.'] },
  { name: 'Charlotte Edwards', clues: [
    'I made my England debut at 16.',
    'I won the Women\'s World Cup and World T20 as captain in the same year, 2009.',
    'I played my county cricket for Kent.',
    'I captained England\'s women for a decade.'] },
  { name: 'Ellyse Perry', clues: [
    'I made my international cricket debut at 16.',
    'I scored a goal at a football World Cup.',
    'I made 213 not out in a women\'s Ashes Test.',
    'I am Australia\'s great all-rounder, who played two sports for her country.'] },
  { name: 'Jhulan Goswami', clues: [
    'I was a ball girl at the 1997 Women\'s World Cup final.',
    'I come from Chakdaha in West Bengal.',
    'I played my last international at Lord\'s in 2022.',
    'I was India\'s long-serving fast bowler in women\'s cricket.'] },
];
