import {
  Dumbbell, User, Book, Trees, Droplet, Apple, Moon, Target, Pencil, Music,
  Gamepad2, Beer, Utensils, Smartphone, BedDouble, Brain, Heart, Flame,
  Briefcase, Laptop, Code, FileText, Clipboard, BookOpen, NotebookPen,
  PenTool, FolderOpen, Archive, Package, Database,
  GraduationCap, BookMarked, School, Award, Certificate,
  Home, Bed, UtensilsCrossed, CookingPot, Lightbulb,
  ShoppingCart, Store, CreditCard, Wallet, PiggyBank, TrendingUp, Coins,
  Stethoscope, HeartPulse, Pill, Activity, Footprints,
  Coffee, Wine, Pizza, Cake,
  Car, Train, Plane, Rocket, MapPin, Globe, Compass,
  Mail, Phone, MessageSquare, Bell,
  Users, Handshake, PartyPopper, Gift,
  Palette, Paintbrush, Camera, Film, Guitar,
  Dog, Cat, Fish, Flower, Leaf, Sunrise, Cloud,
  Star, Sparkles, Zap, Crown, Trophy, Flag, Bookmark,
  Wrench, Settings, Cog,
  Shield, Lock, Key,
  Calendar, Clock, Timer, Hourglass,
  Smile, ThumbsUp, Check, Info, AlertCircle, HelpCircle,
  Megaphone, Image, Link, Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Map of icon names to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  // Habit icons
  'Dumbbell': Dumbbell,
  'PersonStanding': User,
  'Book': Book,
  'Trees': Trees,
  'Droplet': Droplet,
  'Apple': Apple,
  'Moon': Moon,
  'Target': Target,
  'Pencil': Pencil,
  'Music': Music,
  'Gamepad2': Gamepad2,
  'Beer': Beer,
  'Burger': Utensils,
  'Smartphone': Smartphone,
  'BedDouble': BedDouble,
  'Brain': Brain,
  'Heart': Heart,
  'Flame': Flame,

  // Task icons - Работа и продуктивность
  'Briefcase': Briefcase,
  'Laptop': Laptop,
  'Code': Code,
  'FileText': FileText,
  'Clipboard': Clipboard,
  'BookOpen': BookOpen,
  'NotebookPen': NotebookPen,
  'PenTool': PenTool,
  'FolderOpen': FolderOpen,
  'Archive': Archive,
  'Package': Package,
  'Database': Database,

  // Образование
  'GraduationCap': GraduationCap,
  'BookMarked': BookMarked,
  'School': School,
  'Award': Award,
  'Certificate': Certificate,

  // Дом и быт
  'Home': Home,
  'Bed': Bed,
  'UtensilsCrossed': UtensilsCrossed,
  'CookingPot': CookingPot,
  'Lightbulb': Lightbulb,

  // Покупки и финансы
  'ShoppingCart': ShoppingCart,
  'Store': Store,
  'CreditCard': CreditCard,
  'Wallet': Wallet,
  'PiggyBank': PiggyBank,
  'TrendingUp': TrendingUp,
  'Coins': Coins,

  // Здоровье и фитнес
  'Stethoscope': Stethoscope,
  'HeartPulse': HeartPulse,
  'Pill': Pill,
  'Activity': Activity,
  'Footprints': Footprints,

  // Еда и напитки
  'Coffee': Coffee,
  'Wine': Wine,
  'Pizza': Pizza,
  'Cake': Cake,

  // Транспорт и путешествия
  'Car': Car,
  'Train': Train,
  'Plane': Plane,
  'Rocket': Rocket,
  'MapPin': MapPin,
  'Globe': Globe,
  'Compass': Compass,

  // Связь
  'Mail': Mail,
  'Phone': Phone,
  'MessageSquare': MessageSquare,
  'Bell': Bell,

  // Социальное
  'Users': Users,
  'Handshake': Handshake,
  'PartyPopper': PartyPopper,
  'Gift': Gift,

  // Творчество
  'Palette': Palette,
  'Paintbrush': Paintbrush,
  'Camera': Camera,
  'Film': Film,
  'Guitar': Guitar,

  // Природа и животные
  'Dog': Dog,
  'Cat': Cat,
  'Fish': Fish,
  'Flower': Flower,
  'Leaf': Leaf,
  'Sunrise': Sunrise,
  'Cloud': Cloud,

  // Важное
  'Star': Star,
  'Sparkles': Sparkles,
  'Zap': Zap,
  'Crown': Crown,
  'Trophy': Trophy,
  'Flag': Flag,
  'Bookmark': Bookmark,

  // Инструменты
  'Wrench': Wrench,
  'Settings': Settings,
  'Cog': Cog,

  // Безопасность
  'Shield': Shield,
  'Lock': Lock,
  'Key': Key,

  // Время
  'Calendar': Calendar,
  'Clock': Clock,
  'Timer': Timer,
  'Hourglass': Hourglass,

  // Разное
  'Smile': Smile,
  'ThumbsUp': ThumbsUp,
  'Check': Check,
  'Info': Info,
  'AlertCircle': AlertCircle,
  'HelpCircle': HelpCircle,
  'Megaphone': Megaphone,
  'Image': Image,
  'Link': Link,
  'Tag': Tag,
}

interface HabitIconProps {
  iconName: string
  className?: string
  size?: number
}

/**
 * Renders a Lucide icon for habits.
 * Falls back to Target icon if the icon name is not found.
 */
export function HabitIcon({ iconName, className, size }: HabitIconProps) {
  const IconComponent = ICON_MAP[iconName] || Target
  return <IconComponent className={className} size={size} />
}
