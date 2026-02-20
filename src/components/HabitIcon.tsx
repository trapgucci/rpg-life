import {
  // RPG / Combat
  Sword, Swords, Shield, ShieldCheck, ShieldHalf, Crosshair, Flame, Zap, Crown, Trophy,
  Medal, Award, Skull, Wand2, WandSparkles, Ghost,
  // Items & Loot
  Gift, Package, Key, Gem, Coins, Star, Sparkles, Sparkle, Diamond, Tag, Bookmark, Ticket, Backpack,
  // Food & Drinks
  Coffee, Pizza, Cake, Wine, Beer, Apple, Cherry, Grape, Banana, Citrus, Carrot, Egg,
  Croissant, Cookie, Candy, Lollipop, IceCream, Sandwich, Salad, Soup, Beef, Ham, Milk, CupSoda,
  GlassWater, Martini, ChefHat, UtensilsCrossed, CookingPot,
  // Entertainment & Media
  Clapperboard, Film, Tv, MonitorPlay, Popcorn, Drama, Theater, Headphones, Music, Radio, Mic,
  Guitar, Drum, Disc3, Gamepad2, Joystick, Dice5, Dices, Puzzle, ToyBrick, Origami,
  // Sport & Health
  Dumbbell, Footprints, Heart, HeartPulse, Activity, Bike, Volleyball,
  Stethoscope, Pill, Syringe, Bandage, Accessibility, Brain,
  // Nature & Animals
  Leaf, Flower, TreePine, TreeDeciduous, TreePalm, Trees, Clover, Sprout, Wheat, Palmtree,
  Mountain, MountainSnow, Waves, Dog, Cat, Fish, Bird, Rabbit, Squirrel, Bug, Snail, Turtle,
  PawPrint, Bone, Feather,
  // Weather
  Sun, Moon, Cloud, Sunrise, Snowflake, Droplet, Rainbow, Wind, Umbrella,
  CloudRain, CloudSnow, CloudSun, CloudLightning, Tornado, Thermometer,
  // Home
  Home, Bed, BedSingle, Armchair, Sofa, Lamp, Bath, ShowerHead, WashingMachine, Refrigerator,
  Fan, DoorOpen, Blinds, Lightbulb,
  // Work & Productivity
  Briefcase, Laptop, Code, FileText, Clipboard, BookOpen, NotebookPen, PenTool, Pen, Pencil,
  Eraser, Highlighter, FolderOpen, Archive, Database, Ruler, Scissors,
  // Education & Science
  GraduationCap, BookMarked, School, Library, Notebook, Newspaper, Microscope, Telescope, Atom,
  Dna, TestTube, Beaker, FlaskConical, Languages,
  // Finance
  Wallet, PiggyBank, CreditCard, TrendingUp, Banknote, CircleDollarSign, BadgeDollarSign,
  Receipt, ShoppingCart, Store, Bitcoin, HandCoins, ChartCandlestick,
  // Transport & Travel
  Car, Train, Bus, Ship, Sailboat, Plane, Rocket, MapPin, Globe, Compass, Map, Signpost,
  Navigation, Tent, Luggage, Binoculars,
  // Technology
  Smartphone, Monitor, Keyboard, Mouse, Printer, Cpu, HardDrive, Wifi, Bluetooth, Cable, Router,
  Usb, BatteryCharging, Plug, QrCode,
  // Communication
  Mail, Phone, MessageSquare, MessageCircle, MessagesSquare, Bell, Megaphone, Users, Handshake,
  HeartHandshake, PartyPopper, Baby, CircleUser,
  // Creativity
  Palette, Paintbrush, Camera, Image, Brush, Sticker, Stamp, Pipette,
  // Tools
  Wrench, Cog, Settings, Hammer, Pickaxe, Scale, Gavel,
  // Security
  Lock, Eye, ScanFace, Fingerprint,
  // Time
  Calendar, Clock, Timer, Hourglass, Watch,
  // Misc
  Smile, Laugh, Meh, Frown, ThumbsUp, HandMetal, Flag, Infinity, Power, Ban, AlertTriangle,
  Link, Cigarette, Hand,
  // Fallback
  Target,
  // Legacy aliases
  User, Book, Utensils, BedDouble, BadgeCheck, ScrollText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Map of icon names to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  // RPG / Combat
  'Sword': Sword,
  'Swords': Swords,
  'Shield': Shield,
  'ShieldCheck': ShieldCheck,
  'ShieldHalf': ShieldHalf,
  'Crosshair': Crosshair,
  'Flame': Flame,
  'Zap': Zap,
  'Crown': Crown,
  'Trophy': Trophy,
  'Medal': Medal,
  'Award': Award,
  'Skull': Skull,
  'Wand2': Wand2,
  'WandSparkles': WandSparkles,
  'Ghost': Ghost,

  // Items & Loot
  'Gift': Gift,
  'Package': Package,
  'Key': Key,
  'Gem': Gem,
  'Coins': Coins,
  'Star': Star,
  'Sparkles': Sparkles,
  'Sparkle': Sparkle,
  'Diamond': Diamond,
  'Tag': Tag,
  'Bookmark': Bookmark,
  'Ticket': Ticket,
  'Backpack': Backpack,

  // Food & Drinks
  'Coffee': Coffee,
  'Pizza': Pizza,
  'Cake': Cake,
  'Wine': Wine,
  'Beer': Beer,
  'Apple': Apple,
  'Cherry': Cherry,
  'Grape': Grape,
  'Banana': Banana,
  'Citrus': Citrus,
  'Carrot': Carrot,
  'Egg': Egg,
  'Croissant': Croissant,
  'Cookie': Cookie,
  'Candy': Candy,
  'Lollipop': Lollipop,
  'IceCream': IceCream,
  'Sandwich': Sandwich,
  'Salad': Salad,
  'Soup': Soup,
  'Beef': Beef,
  'Ham': Ham,
  'Milk': Milk,
  'CupSoda': CupSoda,
  'GlassWater': GlassWater,
  'Martini': Martini,
  'ChefHat': ChefHat,
  'UtensilsCrossed': UtensilsCrossed,
  'CookingPot': CookingPot,

  // Entertainment & Media
  'Clapperboard': Clapperboard,
  'Film': Film,
  'Tv': Tv,
  'MonitorPlay': MonitorPlay,
  'Popcorn': Popcorn,
  'Drama': Drama,
  'Theater': Theater,
  'Headphones': Headphones,
  'Music': Music,
  'Radio': Radio,
  'Mic': Mic,
  'Guitar': Guitar,
  'Drum': Drum,
  'Disc3': Disc3,
  'Gamepad2': Gamepad2,
  'Joystick': Joystick,
  'Dice5': Dice5,
  'Dices': Dices,
  'Puzzle': Puzzle,
  'ToyBrick': ToyBrick,
  'Origami': Origami,

  // Sport & Health
  'Dumbbell': Dumbbell,
  'Footprints': Footprints,
  'Heart': Heart,
  'HeartPulse': HeartPulse,
  'Activity': Activity,
  'Bike': Bike,
  'Volleyball': Volleyball,
  'Stethoscope': Stethoscope,
  'Pill': Pill,
  'Syringe': Syringe,
  'Bandage': Bandage,
  'Accessibility': Accessibility,
  'Brain': Brain,

  // Nature & Animals
  'Leaf': Leaf,
  'Flower': Flower,
  'TreePine': TreePine,
  'TreeDeciduous': TreeDeciduous,
  'TreePalm': TreePalm,
  'Trees': Trees,
  'Clover': Clover,
  'Sprout': Sprout,
  'Wheat': Wheat,
  'Palmtree': Palmtree,
  'Mountain': Mountain,
  'MountainSnow': MountainSnow,
  'Waves': Waves,
  'Dog': Dog,
  'Cat': Cat,
  'Fish': Fish,
  'Bird': Bird,
  'Rabbit': Rabbit,
  'Squirrel': Squirrel,
  'Bug': Bug,
  'Snail': Snail,
  'Turtle': Turtle,
  'PawPrint': PawPrint,
  'Bone': Bone,
  'Feather': Feather,

  // Weather
  'Sun': Sun,
  'Moon': Moon,
  'Cloud': Cloud,
  'Sunrise': Sunrise,
  'Snowflake': Snowflake,
  'Droplet': Droplet,
  'Rainbow': Rainbow,
  'Wind': Wind,
  'Umbrella': Umbrella,
  'CloudRain': CloudRain,
  'CloudSnow': CloudSnow,
  'CloudSun': CloudSun,
  'CloudLightning': CloudLightning,
  'Tornado': Tornado,
  'Thermometer': Thermometer,

  // Home
  'Home': Home,
  'Bed': Bed,
  'BedSingle': BedSingle,
  'Armchair': Armchair,
  'Sofa': Sofa,
  'Lamp': Lamp,
  'Bath': Bath,
  'ShowerHead': ShowerHead,
  'WashingMachine': WashingMachine,
  'Refrigerator': Refrigerator,
  'Fan': Fan,
  'DoorOpen': DoorOpen,
  'Blinds': Blinds,
  'Lightbulb': Lightbulb,

  // Work & Productivity
  'Briefcase': Briefcase,
  'Laptop': Laptop,
  'Code': Code,
  'FileText': FileText,
  'Clipboard': Clipboard,
  'BookOpen': BookOpen,
  'NotebookPen': NotebookPen,
  'PenTool': PenTool,
  'Pen': Pen,
  'Pencil': Pencil,
  'Eraser': Eraser,
  'Highlighter': Highlighter,
  'FolderOpen': FolderOpen,
  'Archive': Archive,
  'Database': Database,
  'Ruler': Ruler,
  'Scissors': Scissors,

  // Education & Science
  'GraduationCap': GraduationCap,
  'BookMarked': BookMarked,
  'School': School,
  'Library': Library,
  'Notebook': Notebook,
  'Newspaper': Newspaper,
  'Microscope': Microscope,
  'Telescope': Telescope,
  'Atom': Atom,
  'Dna': Dna,
  'TestTube': TestTube,
  'Beaker': Beaker,
  'FlaskConical': FlaskConical,
  'Languages': Languages,

  // Finance
  'Wallet': Wallet,
  'PiggyBank': PiggyBank,
  'CreditCard': CreditCard,
  'TrendingUp': TrendingUp,
  'Banknote': Banknote,
  'CircleDollarSign': CircleDollarSign,
  'BadgeDollarSign': BadgeDollarSign,
  'Receipt': Receipt,
  'ShoppingCart': ShoppingCart,
  'Store': Store,
  'Bitcoin': Bitcoin,
  'HandCoins': HandCoins,
  'ChartCandlestick': ChartCandlestick,

  // Transport & Travel
  'Car': Car,
  'Train': Train,
  'Bus': Bus,
  'Ship': Ship,
  'Sailboat': Sailboat,
  'Plane': Plane,
  'Rocket': Rocket,
  'MapPin': MapPin,
  'Globe': Globe,
  'Compass': Compass,
  'Map': Map,
  'Signpost': Signpost,
  'Navigation': Navigation,
  'Tent': Tent,
  'Luggage': Luggage,
  'Binoculars': Binoculars,

  // Technology
  'Smartphone': Smartphone,
  'Monitor': Monitor,
  'Keyboard': Keyboard,
  'Mouse': Mouse,
  'Printer': Printer,
  'Cpu': Cpu,
  'HardDrive': HardDrive,
  'Wifi': Wifi,
  'Bluetooth': Bluetooth,
  'Cable': Cable,
  'Router': Router,
  'Usb': Usb,
  'BatteryCharging': BatteryCharging,
  'Plug': Plug,
  'QrCode': QrCode,

  // Communication
  'Mail': Mail,
  'Phone': Phone,
  'MessageSquare': MessageSquare,
  'MessageCircle': MessageCircle,
  'MessagesSquare': MessagesSquare,
  'Bell': Bell,
  'Megaphone': Megaphone,
  'Users': Users,
  'Handshake': Handshake,
  'HeartHandshake': HeartHandshake,
  'PartyPopper': PartyPopper,
  'Baby': Baby,
  'CircleUser': CircleUser,

  // Creativity
  'Palette': Palette,
  'Paintbrush': Paintbrush,
  'Camera': Camera,
  'Image': Image,
  'Brush': Brush,
  'Sticker': Sticker,
  'Stamp': Stamp,
  'Pipette': Pipette,

  // Tools
  'Wrench': Wrench,
  'Cog': Cog,
  'Settings': Settings,
  'Hammer': Hammer,
  'Pickaxe': Pickaxe,
  'Scale': Scale,
  'Gavel': Gavel,

  // Security
  'Lock': Lock,
  'Eye': Eye,
  'ScanFace': ScanFace,
  'Fingerprint': Fingerprint,

  // Time
  'Calendar': Calendar,
  'Clock': Clock,
  'Timer': Timer,
  'Hourglass': Hourglass,
  'Watch': Watch,

  // Misc
  'Smile': Smile,
  'Laugh': Laugh,
  'Meh': Meh,
  'Frown': Frown,
  'ThumbsUp': ThumbsUp,
  'HandMetal': HandMetal,
  'Flag': Flag,
  'Infinity': Infinity,
  'Power': Power,
  'Ban': Ban,
  'AlertTriangle': AlertTriangle,
  'Link': Link,
  'Cigarette': Cigarette,
  'Hand': Hand,

  // Legacy aliases (old names still used in stored data)
  'PersonStanding': User,
  'Book': Book,
  'Burger': Utensils,
  'BedDouble': BedDouble,
  'Certificate': BadgeCheck,
  'Scroll': ScrollText,
  'Target': Target,
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
