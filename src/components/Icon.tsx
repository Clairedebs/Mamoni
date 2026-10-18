import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Baby, Bell, BellRing, Briefcase, Bus, Calendar, CalendarClock, Car, Check,
  ChevronLeft, ChevronRight, Church, CircleCheck, Clock3, CloudOff, Coffee, Coins, Delete, Dumbbell, Eye, EyeOff, Film,
  Flag, Fuel, Gem, Gift, GraduationCap, HandCoins, HeartHandshake, HeartPulse, House, HousePlug, Landmark, LoaderCircle,
  LogOut, Minus, Moon, Music, PawPrint, Pencil, PencilLine, PiggyBank, Pill, Plane, Plus, ReceiptText, RefreshCw, Scissors,
  Search, SearchX, Send, Settings2, Shirt, ShoppingBasket, ShoppingCart, Smartphone, Sparkles, Store, Sun, SunMoon, Tag,
  Tags, Trash2, TrendingUp, Users, Utensils, Wallet, Wifi, X, type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  'arrow-down-left': ArrowDownLeft, 'arrow-left-right': ArrowLeftRight, 'arrow-up-right': ArrowUpRight, baby: Baby,
  bell: Bell, 'bell-ring': BellRing, briefcase: Briefcase, bus: Bus, calendar: Calendar, 'calendar-clock': CalendarClock,
  car: Car, check: Check, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, church: Church,
  'circle-check': CircleCheck, 'clock-3': Clock3, 'cloud-off': CloudOff, coffee: Coffee, coins: Coins, delete: Delete,
  dumbbell: Dumbbell, eye: Eye, 'eye-off': EyeOff, film: Film, flag: Flag, fuel: Fuel, gem: Gem, gift: Gift,
  'graduation-cap': GraduationCap, 'hand-coins': HandCoins, 'heart-handshake': HeartHandshake, 'heart-pulse': HeartPulse,
  house: House, 'house-plug': HousePlug, landmark: Landmark, loader: LoaderCircle, 'log-out': LogOut, minus: Minus,
  moon: Moon, music: Music, 'paw-print': PawPrint, pencil: Pencil, 'pencil-line': PencilLine, 'piggy-bank': PiggyBank,
  pill: Pill, plane: Plane, plus: Plus, 'receipt-text': ReceiptText, 'refresh-cw': RefreshCw, scissors: Scissors,
  search: Search, 'search-x': SearchX, send: Send, 'settings-2': Settings2, shirt: Shirt,
  'shopping-basket': ShoppingBasket, 'shopping-cart': ShoppingCart, smartphone: Smartphone, sparkles: Sparkles,
  store: Store, sun: Sun, 'sun-moon': SunMoon, tag: Tag, tags: Tags, 'trash-2': Trash2, 'trending-up': TrendingUp,
  users: Users, utensils: Utensils, wallet: Wallet, wifi: Wifi, x: X,
}

export function Icon({ name, size, strokeWidth = 1.75, className, style }: {
  name: string
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}) {
  const C = ICONS[name] ?? Tag
  return <C size={size} strokeWidth={strokeWidth} className={['lucide', className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />
}
