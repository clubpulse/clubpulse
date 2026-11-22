// Animated icons that stand in for emoji. <Glyph e="🏏" /> draws the matching icon in a ShiftUp
// colour, with a small motion that suits it (a flame flickers, a bell rings, a heart beats). An
// emoji with no good icon (faces, flags and so on) is shown as the emoji itself, so nothing is lost.
//
// No hooks, so it works in server and client components. Motion is CSS only (globals.css) and
// stops for visitors who ask for reduced motion.

import type { CSSProperties, ReactElement } from 'react';
import {
  BarChart3, Banknote, Bandage, Bell, Book, BookOpen, Bot, Brain, Calendar, CalendarDays, Camera, Car, Check, CircleCheck, ClipboardList, Clapperboard,
  Coins, Compass, Construction, CreditCard, Dices, Dumbbell, Eye, FileText, Flag, Flame, Flower2, Footprints, Gamepad2, Gift, Goal,
  GraduationCap, Hammer, Hand, HandHeart, HandHelping, Handshake, Hash, Heart, HeartHandshake, HeartPulse, House, Landmark, Library,
  Lightbulb, Link as LinkIcon, Lock, Map as MapIcon, MapPin, Medal, Megaphone, MessageCircle, Moon, NotebookPen, PartyPopper, Pencil, Pin,
  Plane, Plus, PoundSterling, Puzzle, RefreshCw, Repeat, Ruler, ScanSearch, School, ScrollText, Search, Settings, Shirt, ShieldCheck,
  ShoppingBag, ShoppingCart, Shuffle, Siren, SlidersHorizontal, Skull, Smartphone, Sparkles, Sprout, Star, StickyNote, Swords, Tag, Target,
  Ticket, Tornado, TreePalm, TrendingDown, TrendingUp, Trophy, TriangleAlert, Upload, User, Users, Video, Vote, Wrench, X, Zap, CloudRain,
  type LucideIcon,
} from 'lucide-react';

type Motion = 'float' | 'beat' | 'twinkle' | 'ring' | 'flicker' | 'wiggle' | 'spin' | 'none';
type Def = { icon: LucideIcon | 'bat' | 'dot'; colour: string; motion: Motion; fill?: boolean };

const GOLD = '#EFC84A', BLUE = '#60A5FA', GREEN = '#22C55E', RED = '#F87171', ORANGE = '#F97316', PINK = '#F472B6', TEAL = '#2DD4BF', PURPLE = '#A78BFA', AMBER = '#FBBF24', MUTED = '#94A3B8';

const d = (icon: Def['icon'], colour: string, motion: Motion = 'float', fill = false): Def => ({ icon, colour, motion, fill });

const MAP: Record<string, Def> = {
  '🏏': d('bat', AMBER, 'wiggle'), '⭐': d(Star, GOLD, 'twinkle', true), '🌟': d(Star, GOLD, 'twinkle', true), '✨': d(Sparkles, GOLD, 'twinkle'),
  '🎯': d(Target, RED, 'float'), '🏆': d(Trophy, GOLD, 'wiggle'), '🏅': d(Medal, GOLD, 'wiggle'), '🎖️': d(Medal, GOLD, 'wiggle'),
  '🥇': d(Medal, GOLD, 'wiggle'), '🥈': d(Medal, '#CBD5E1', 'wiggle'), '🥉': d(Medal, '#D97706', 'wiggle'),
  '📋': d(ClipboardList, BLUE), '🧠': d(Brain, PINK), '🤝': d(Handshake, BLUE), '🏟️': d(Landmark, BLUE), '🏛️': d(Landmark, GOLD), '🏦': d(Landmark, MUTED),
  '🎁': d(Gift, GOLD, 'wiggle'), '📊': d(BarChart3, TEAL), '📈': d(TrendingUp, GREEN), '📉': d(TrendingDown, RED),
  '🎓': d(GraduationCap, TEAL), '🛡️': d(ShieldCheck, GREEN), '⚡': d(Zap, GOLD, 'flicker', true), '💥': d(Zap, ORANGE, 'flicker', true),
  '🔒': d(Lock, MUTED, 'none'), '💷': d(PoundSterling, GREEN), '💰': d(Coins, GOLD), '🪙': d(Coins, GOLD), '💸': d(Banknote, GREEN), '💳': d(CreditCard, BLUE),
  '🎟️': d(Ticket, GOLD), '🔥': d(Flame, ORANGE, 'flicker', true), '🎉': d(PartyPopper, PINK, 'wiggle'), '📅': d(CalendarDays, BLUE), '🗓️': d(Calendar, BLUE),
  '💪': d(Dumbbell, ORANGE, 'wiggle'), '🏋️': d(Dumbbell, ORANGE, 'wiggle'), '🎥': d(Video, AMBER), '🎬': d(Clapperboard, AMBER), '💬': d(MessageCircle, BLUE),
  '🔨': d(Hammer, AMBER, 'wiggle'), '🤖': d(Bot, TEAL), '🧘': d(Flower2, PINK), '📌': d(Pin, RED), '🏫': d(School, TEAL), '🧤': d(Hand, AMBER),
  '📄': d(FileText, BLUE), '📜': d(ScrollText, BLUE), '📍': d(MapPin, RED), '📱': d(Smartphone, BLUE, 'none'), '⚠️': d(TriangleAlert, AMBER), '⚠': d(TriangleAlert, AMBER),
  '🧡': d(Heart, ORANGE, 'beat', true), '❤️': d(Heart, RED, 'beat', true), '💓': d(HeartPulse, PINK, 'beat'), '💝': d(HeartHandshake, PINK, 'beat'),
  '📚': d(Library, TEAL), '📘': d(Book, BLUE), '📖': d(BookOpen, TEAL), '🛍️': d(ShoppingBag, PINK), '🛒': d(ShoppingCart, PINK), '🔍': d(Search, BLUE), '🕵️': d(ScanSearch, PURPLE),
  '👤': d(User, BLUE), '🧑': d(User, BLUE), '👨': d(User, BLUE), '👧': d(User, PINK), '🧍': d(User, MUTED), '👥': d(Users, BLUE), '👪': d(Users, PURPLE),
  '⚙️': d(Settings, MUTED, 'spin'), '🚶': d(Footprints, GREEN), '🏃': d(Footprints, GREEN), '👟': d(Footprints, GREEN), '🥾': d(Footprints, GREEN),
  '👋': d(Hand, AMBER, 'wiggle'), '🙋': d(Hand, AMBER, 'wiggle'), '🙌': d(HandHeart, PINK, 'wiggle'), '🤲': d(HandHelping, TEAL),
  '🧢': d(GraduationCap, ORANGE), '🌀': d(Tornado, BLUE, 'spin'), '🩹': d(Bandage, PINK), '✈️': d(Plane, BLUE), '✈': d(Plane, BLUE),
  '❌': d(X, RED, 'none'), '✕': d(X, RED, 'none'), '✗': d(X, RED, 'none'), '✓': d(Check, GREEN, 'none'), '✅': d(CircleCheck, GREEN, 'none'),
  '🏷️': d(Tag, PINK), '🔁': d(Repeat, BLUE), '🔄': d(RefreshCw, BLUE, 'spin'), '🔗': d(LinkIcon, BLUE), '📝': d(NotebookPen, BLUE), '🗒️': d(StickyNote, AMBER),
  '☝️': d(Hand, AMBER, 'wiggle'), '👕': d(Shirt, BLUE), '📣': d(Megaphone, ORANGE, 'wiggle'), '📢': d(Megaphone, ORANGE, 'wiggle'), '🧭': d(Compass, BLUE, 'spin'),
  '🎰': d(Dices, PURPLE, 'wiggle'), '🎲': d(Dices, PURPLE, 'wiggle'), '🔢': d(Hash, BLUE), '👁️': d(Eye, BLUE), '👁': d(Eye, BLUE), '🎛️': d(SlidersHorizontal, BLUE),
  '🌱': d(Sprout, GREEN), '📤': d(Upload, BLUE), '💡': d(Lightbulb, GOLD, 'twinkle'), '🏠': d(House, BLUE), '🧩': d(Puzzle, PURPLE), '📸': d(Camera, BLUE), '📷': d(Camera, BLUE),
  '💤': d(Moon, PURPLE), '🧰': d(Wrench, AMBER), '🚧': d(Construction, AMBER), '🚨': d(Siren, RED, 'flicker'), '🚗': d(Car, BLUE), '📐': d(Ruler, AMBER),
  '🎮': d(Gamepad2, PURPLE), '🕹️': d(Gamepad2, PURPLE), '✏️': d(Pencil, AMBER), '⚔️': d(Swords, RED), '🔔': d(Bell, GOLD, 'ring'), '🗺️': d(MapIcon, GREEN),
  '🌧️': d(CloudRain, BLUE), '🔀': d(Shuffle, BLUE), '🏁': d(Flag, GREEN), '🗳️': d(Vote, BLUE), '🥅': d(Goal, GREEN), '➕': d(Plus, GREEN), '☠️': d(Skull, MUTED), '💀': d(Skull, MUTED),
  '🌴': d(TreePalm, GREEN),
  '🔴': d('dot', RED, 'none'), '🟢': d('dot', GREEN, 'none'), '🟡': d('dot', AMBER, 'none'), '🟠': d('dot', ORANGE, 'none'), '🔵': d('dot', BLUE, 'none'),
};

const strip = (e: string) => e.replace(/️/g, '');
const LOOKUP = new Map(Object.entries(MAP).map(([k, v]) => [strip(k), v]));

export function hasGlyph(e: string): boolean { return LOOKUP.has(strip(e.trim())); }

type Props = {
  /** The emoji to draw an icon for */
  e: string;
  /** A number of pixels, or a CSS length. The default follows the surrounding text size. */
  size?: number | string;
  /** Turn the motion off, or force a different one. Default is the icon's own motion. */
  motion?: Motion;
  /** Colour override; otherwise each icon has its own */
  colour?: string;
  title?: string;
  style?: CSSProperties;
};

export function Glyph({ e, size = '1.2em', motion, colour, title, style }: Props): ReactElement {
  const def = LOOKUP.get(strip(e.trim()));
  if (!def) {
    return <span style={{ fontSize: typeof size === 'number' ? size : 'inherit', lineHeight: 1, ...style }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>{e}</span>;
  }
  const m = motion ?? def.motion;
  const c = colour ?? def.colour;
  const common = {
    className: `gl gl-${m}`,
    style: { display: 'inline-flex', flexShrink: 0, ...style } as CSSProperties,
    role: title ? ('img' as const) : undefined,
    'aria-label': title,
    'aria-hidden': title ? undefined : true,
  };
  if (def.icon === 'bat') {
    // A cricket bat and ball; no icon set has one
    return (
      <span {...common}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 3.5l6 6-9.2 9.2a2.2 2.2 0 01-3.1 0l-2.9-2.9a2.2 2.2 0 010-3.1z" fill={`${c}33`} />
          <path d="M6.3 15.2L3 18.5" />
          <circle cx="19" cy="19" r="2.2" fill={`${c}66`} />
        </svg>
      </span>
    );
  }
  if (def.icon === 'dot') {
    return <span {...common}><svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill={c} /></svg></span>;
  }
  const Icon = def.icon;
  return (
    <span {...common}>
      <Icon size={size} color={c} strokeWidth={2} fill={def.fill ? `${c}55` : 'none'} />
    </span>
  );
}
