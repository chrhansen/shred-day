import {
  ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, Camera, ChartColumn,
  Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown,
  CircleAlert, CircleCheck, CircleHelp, Clock, Copy, Ellipsis,
  ExternalLink, Eye, EyeOff, Flame, Image as ImageIcon, ImageOff, Images, Info, Link,
  List, Lock, LogIn, LogOut, Mail, MapPin, Mountain, Pencil, Plus,
  RefreshCw, Search, Settings, Share, SlidersHorizontal, Tags,
  Trash2, TriangleAlert, Unlink, User, UserPlus, WifiOff, X,
  type LucideIcon,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { ColorValue } from "react-native";
import { colors } from "../../theme";

const icons = {
  "arrow-left": ArrowLeft, "arrow-up-right": ArrowUpRight,
  book: BookOpen, "book-open": BookOpen, calendar: CalendarDays,
  camera: Camera, chart: ChartColumn, "bar-chart-2": ChartColumn,
  "chart-column": ChartColumn, check: Check, "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft, "chevron-right": ChevronRight,
  "chevrons-up-down": ChevronsUpDown, alert: CircleAlert,
  "circle-alert": CircleAlert, "circle-check": CircleCheck,
  "check-circle": CircleCheck, help: CircleHelp, clock: Clock,
  copy: Copy, more: Ellipsis, ellipsis: Ellipsis,
  external: ExternalLink, "external-link": ExternalLink,
  eye: Eye, "eye-off": EyeOff, flame: Flame, "image-off": ImageOff,
  image: ImageIcon, images: Images, info: Info, link: Link, "link-off": Unlink,
  list: List, lock: Lock, login: LogIn, logout: LogOut, mail: Mail,
  pin: MapPin, "map-pin": MapPin, mountain: Mountain, pencil: Pencil,
  plus: Plus, refresh: RefreshCw, "refresh-cw": RefreshCw,
  search: Search, settings: Settings, share: Share,
  sliders: SlidersHorizontal, tags: Tags, trash: Trash2,
  "trash-2": Trash2, triangle: TriangleAlert, "triangle-alert": TriangleAlert,
  unlink: Unlink, user: User, "user-plus": UserPlus,
  "wifi-off": WifiOff, x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons | "ski";
export function Icon({ name, size = 20, color = colors.ink, strokeWidth = 1.75 }: {
  name: IconName; size?: number; color?: ColorValue; strokeWidth?: number;
}) {
  if (name === "ski") return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" accessible={false} accessibilityElementsHidden>
      <Path d="M7.5 2.5 4.6 19.8a1.6 1.6 0 0 0 3.1.6L10 3M15.5 2.5l-2.9 17.3a1.6 1.6 0 0 0 3.1.6L18 3" />
    </Svg>
  );
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={strokeWidth}
    accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
