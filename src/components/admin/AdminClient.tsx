"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  wellnessAdminSaveProgramDay,
  wellnessAdminDeleteProgramDay,
  wellnessAdminTogglePublishProgram,
  wellnessAdminUpdateProgramMeta,
  wellnessAdminDeleteProgram,
  wellnessAdminCreateProgram,
  wellnessAdminSetProgramStatus,
  wellnessAdminGetProgramSubmissions,
  ProgramSubmissionItem,
  ProgramSubmissionsPayload,
} from "@/wellness/actions/program";
import {
  wellnessCreateMasterCoach,
  wellnessUpdateMasterCoach,
  wellnessDeleteMasterCoach,
  wellnessCreateMasterTargetAudience,
  wellnessUpdateMasterTargetAudience,
  wellnessDeleteMasterTargetAudience,
  wellnessCreateMasterCategory,
  wellnessUpdateMasterCategory,
  wellnessDeleteMasterCategory,
  wellnessCreateMasterEquipment,
  wellnessUpdateMasterEquipment,
  wellnessDeleteMasterEquipment,
  wellnessCreateMasterDailyCommitment,
  wellnessUpdateMasterDailyCommitment,
  wellnessDeleteMasterDailyCommitment,
  MasterDataPayload,
} from "@/wellness/actions/master";
import {
  wellnessAdminApprovePayment,
  wellnessAdminUpdateUserStatus,
  wellnessAdminResetUserPassword,
  wellnessAdminUpdateUserRole,
  wellnessAdminDeleteUser,
  wellnessAdminUpdateCustomerProfile,
} from "@/wellness/actions/admin";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { normalizeVideoEmbed } from "@/wellness/integrations/video-provider";
import {
  DEFAULT_PROGRAM_TERMS,
  DEFAULT_PROGRAM_TERMS_CHAPTERS,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
  DEFAULT_WORKOUT_OPTION_GROUPS,
  ProgramTermChapter,
  ProgramReferenceItem,
  DayVideoLinkItem,
  WorkoutMovementItem,
  WorkoutOptionGroup,
  parseTermsList,
  serializeTermsList,
  parseTermsChapters,
  serializeTermsChapters,
  parseStringList,
  serializeStringList,
  parseReferencesList,
  serializeReferencesList,
  parseDayVideoLinks,
  serializeDayVideoLinks,
  parseWorkoutOptionGroups,
  serializeWorkoutOptionGroups,
  safeJsonParse,
} from "@/wellness/utils/json";
import {
  resolveProgramStatus,
  calculateProgramMemoryFootprint,
  formatByteSize,
  normalizeProgramStatus,
  ProgramDatabaseStatus,
} from "@/wellness/utils/timeline";
import { isProgramHeaderComplete, isProgramDayComplete } from "@/wellness/validators/program";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  Calendar,
  Users,
  Moon,
  QrCode,
  Plus,
  Pencil,
  CheckCircle2,
  LogOut,
  ArrowUpRight,
  Loader2,
  Save,
  Trash2,
  Video,
  Utensils,
  MapPin,
  Dumbbell,
  Coffee,
  AlertCircle,
  Globe,
  FileEdit,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  KeyRound,
  Ban,
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  CreditCard,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  X,
  UserCheck,
  Tag,
  Bell,
  Clock,
  Eye,
  ImageIcon,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  HardDrive,
  MessageSquareQuote,
  Camera,
  ZoomIn,
  Heart,
  Smile,
  Star,
  RefreshCw,
  Scale,
  Activity,
  Mail,
  Smartphone,
  MessageCircle,
  ExternalLink,
  Shield,
  Flame,
  FileText,
  CheckCircle,
} from "lucide-react";

export interface DayNotificationState {
  time: string;
  message: string;
  label?: string;
}

export function getDefaultNotificationsForType(dayType: string): DayNotificationState[] {
  if (dayType === "REST_DAY") {
    return [
      {
        time: "08:00",
        label: "Morning • Active Restoration",
        message: "Today is a Rest Day. Take a 20-minute gentle outdoor walk, hydrate, and allow your nervous system to recharge.",
      },
      {
        time: "20:30",
        label: "Evening • Recovery Diary & Sleep",
        message: "Log your restorative insights in Dear Diary and align your sleep environment for deep cellular recovery.",
      },
    ];
  }
  if (dayType === "CONNECTION_DAY" || dayType === "MEETUP_DAY") {
    return [
      {
        time: "08:30",
        label: "Morning • Live Studio / Zoom Circle",
        message: "Live Community Circle begins today. Check the studio directions or virtual link on your program dashboard.",
      },
      {
        time: "13:00",
        label: "Afternoon • Community Reflection",
        message: "Thank you for connecting! Nourish mindfully and log your nutrition compliance for today.",
      },
      {
        time: "20:30",
        label: "Evening • Gratitude & Sleep Track",
        message: "Record your shared insights in Dear Diary and commit to your target bedtime schedule.",
      },
    ];
  }
  return [
    {
      time: "07:00",
      label: "Morning • Movement Ritual",
      message: "Today's movement sequence is live. Dedicate 25 minutes for practice and capture your before/after check-in.",
    },
    {
      time: "12:30",
      label: "Afternoon • Clean Nourishment",
      message: "Time for mindful midday fuel. Review your coach's meal protocol and log your dietary compliance.",
    },
    {
      time: "20:30",
      label: "Evening • Dear Diary & Cutoff",
      message: "Complete your daily Dear Diary, rate your fulfillment index, and finalize logs prior to the 23:59 cutoff.",
    },
  ];
}

function formatDate(dateVal?: Date | string | null): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export interface AdminProgramDay {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  workoutOptions?: string[];
  sleepRecommendation?: string | null;
  dayNotifications?: DayNotificationState[];
  videoUrl: string | null;
  videoChecklist: string[];
  mealRecommendation: string | null;
  dailyAssessment: string | null;
  pendingReminder: string | null;
  completedReminder: string | null;
  meetupLink: string | null;
  mapLink?: string | null;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  eventTitle?: string | null;
  eventHost?: string | null;
  eventDetails?: string | null;
  restInstructions: string | null;
  coachName?: string | null;
  recommendedFor?: string | null;
  responseCount?: number;
}

export interface AdminProgram {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  equipment?: string | null;
  dailyCommitment?: string | null;
  recommendedFor: string;
  coachName: string;
  coachTitle?: string | null;
  durationDays: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  maxQuota: number;
  communityLink: string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean | null;
  termsType?: string | null;
  customTerms?: string | null;
  termsList?: string[];
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  scientificReferences?: ProgramReferenceItem[];
  programGuidelines?: string[];
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string;
  status?: string;
  isPublished: boolean;
  dayCount: number;
  activeSubscribers: number;
  pendingSubscribers: number;
  submissionCount?: number;
  days: AdminProgramDay[];
}

export interface AdminCustomerHealthProfile {
  id: string;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
  photoBackUrl: string | null;
  age?: number | null;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  currentMood: string | null;
  energyLevel: number | null;
  routineConfidence: number | null;
  workoutFrequency: string | null;
  averageBedtime: string | null;
  averageWakeTime: string | null;
  sleepQualityNotes: string | null;
  eatingPatterns: string | null;
  dietType?: string | null;
  injuriesOrConditions?: string | null;
  foodAllergies?: string | null;
  primaryGoal?: string | null;
  coachNotes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  role: string;
  status: string;
  createdAt: Date | string;
  healthProfile?: AdminCustomerHealthProfile | null;
  enrollments: {
    id: string;
    status: string;
    attendanceMode?: string;
    paymentReference: string | null;
    paidAt: Date | string | null;
    validUntil: Date | string | null;
    termsAgreedAt?: Date | string | null;
    program: {
      id: string;
      title: string;
      price: number;
      locationType?: string;
      city?: string | null;
      venueAddress?: string | null;
      _count: { days: number };
    };
  }[];
  dayProgress?: {
    id: string;
    videoWatched: boolean;
    isCompleted: boolean;
    checklistCompleted: string | null;
    selectedWorkout?: string | null;
    photoBeforeUrl?: string | null;
    photoAfterUrl?: string | null;
    workoutNotes?: string | null;
    eventFeedback?: string | null;
    mealCompliance?: string | null;
    mealNotes?: string | null;
    dailyReflection?: string | null;
    happinessRate?: number | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    sleepDurationMinutes?: number | null;
    assessmentResponse?: string | null;
    completedAt: Date | string | null;
    updatedAt?: Date | string | null;
    programDay: {
      id?: string;
      dayNumber: number;
      title: string;
      dayType?: string;
      programId: string;
      program?: {
        id: string;
        title: string;
      };
    };
  }[];
}

export interface AdminInitialRoute {
  menu: "dashboard" | "programs" | "master" | "members" | "payments";
  programId?: string | null;
  isCreating?: boolean;
  programTab?: "info" | "schedule" | "responses";
  day?: number;
  masterTab?: "coaches" | "audience" | "categories" | "equipment" | "commitments";
  customerId?: string | null;
  customerTab?: "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes";
}

interface AdminClientProps {
  initialUsers: AdminUserItem[];
  initialPrograms: AdminProgram[];
  initialMasterData: MasterDataPayload;
  currentAdminId: string;
  initialRoute?: AdminInitialRoute;
}

function isDayFilled(day: AdminProgramDay | undefined): boolean {
  if (!day) return false;
  return isProgramDayComplete(day);
}

function formatWIBDateISO(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

function formatWIBTimeDisplay(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "09:00";
  }
}

function formatWIBDateDisplay(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "Mon, 02 Nov 2026";
  }
}

function SidebarDefaultDateTimeWidget() {
  const [currentTime, setCurrentTime] = useState<string>(() =>
    formatWIBTimeDisplay(new Date())
  );
  const [currentDate, setCurrentDate] = useState<string>(() =>
    formatWIBDateDisplay(new Date())
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(formatWIBTimeDisplay(now));
      setCurrentDate(formatWIBDateDisplay(now));
    };
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pt-0.5">
      <span>{currentDate}</span>
      <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
      <span>{currentTime} WIB</span>
    </div>
  );
}

function toInputDate(d: Date | string): string {
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return formatWIBDateISO(new Date());
  return formatWIBDateISO(parsed);
}

function computeEndDate(startIso: string, durationDays: number): string {
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return startIso;
  const end = new Date(
    start.getTime() + Math.max(0, durationDays - 1) * 24 * 3600 * 1000
  );
  return formatWIBDateISO(end);
}

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  if (totalItems === 0 || totalPages <= 1) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="px-7 py-4 border-t border-zinc-900/[0.06] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        Showing <strong className="text-zinc-900 dark:text-white">{startItem}</strong> –{" "}
        <strong className="text-zinc-900 dark:text-white">{endItem}</strong> of{" "}
        <strong className="text-zinc-900 dark:text-white">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-35 flex items-center gap-1 whitespace-nowrap transition"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" /> Prev
        </button>

        <span className="px-2 text-xs font-mono text-zinc-500 whitespace-nowrap">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-35 flex items-center gap-1 whitespace-nowrap transition"
        >
          Next <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}

function parseTagList(val: string | null | undefined): string[] {
  if (!val) return [];
  return val
    .split(/[,•\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stringifyTagList(list: string[]): string {
  return list.filter(Boolean).join(", ");
}

function toggleTagInList(tag: string, currentVal: string): string {
  const currentTags = parseTagList(currentVal);
  const exists = currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());
  const nextTags = exists
    ? currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
    : [...currentTags, tag];
  return stringifyTagList(nextTags);
}

export const DIFFICULTY_LEVELS = [
  { value: "BEGINNER", label: "Beginner", description: "Foundational & gentle pace" },
  { value: "MODERATE", label: "Moderate", description: "Accessible steady rhythm" },
  { value: "INTERMEDIATE", label: "Intermediate", description: "Balanced endurance & technique" },
  { value: "ADVANCED", label: "Advanced", description: "High progression & load" },
  { value: "HIGH_INTENSITY", label: "High Intensity", description: "Maximum demand & athletic push" },
] as const;

interface DropdownTagPickerProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  options: Array<{ id: string; name: string; title?: string | null }>;
  selectPlaceholder?: string;
  onManage?: () => void;
  manageLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function DropdownTagPicker({
  label,
  subLabel,
  value,
  onChange,
  disabled = false,
  options = [],
  selectPlaceholder = "Select from directory...",
  onManage,
  manageLabel = "+ Manage in Directory",
  icon: Icon,
}: DropdownTagPickerProps) {
  const tags = parseTagList(value);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...tags, trimmed];
      onChange(stringifyTagList(next));
    }
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    const next = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(stringifyTagList(next));
  };

  const availableOptions = options.filter(
    (opt) => !tags.some((t) => t.toLowerCase() === opt.name.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
          <span className="text-[11px] text-zinc-400 font-normal">
            ({tags.length} selected)
          </span>
        </label>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
          {onManage && !disabled && (
            <button
              type="button"
              onClick={onManage}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition underline"
            >
              {manageLabel}
            </button>
          )}
        </div>
      </div>

      {!disabled && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              addTag(e.target.value);
            }
          }}
          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">+ {selectPlaceholder}</option>
          {availableOptions.map((opt) => (
            <option key={opt.id} value={opt.name} className="bg-white dark:bg-zinc-900">
              {opt.name} {opt.title ? `(${opt.title})` : ""}
            </option>
          ))}
        </select>
      )}

      {/* Badges Display */}
      <div className="min-h-[38px] p-2 rounded-xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 flex flex-wrap items-center gap-1.5">
        {tags.length === 0 ? (
          <span className="text-[11px] text-zinc-400 italic px-1">
            None selected yet. Select from the directory dropdown above.
          </span>
        ) : (
          tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 shadow-2xs"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(idx)}
                  className="hover:opacity-70 rounded-full p-0.5 text-zinc-400 hover:text-red-500 transition"
                  title={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

interface SingleSelectDirectoryPickerProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (val: string) => void;
  options: Array<{ id: string; name: string }>;
  disabled?: boolean;
  onManage?: () => void;
  manageLabel?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function SingleSelectDirectoryPicker({
  label,
  subLabel,
  value,
  onChange,
  options = [],
  disabled = false,
  onManage,
  manageLabel = "+ Manage in Directory",
  placeholder = "Select from directory...",
  icon: Icon,
}: SingleSelectDirectoryPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
          {onManage && !disabled && (
            <button
              type="button"
              onClick={onManage}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition underline"
            >
              {manageLabel}
            </button>
          )}
        </div>
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name} className="bg-white dark:bg-zinc-900">
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

interface MultiTagInputProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder: string;
  disabled?: boolean;
  quickSuggestions?: string[];
  icon?: React.ComponentType<{ className?: string }>;
  chipColor?: "zinc" | "chrome";
}

function MultiTagInput({
  label,
  subLabel,
  value,
  onChange,
  placeholder,
  disabled = false,
  quickSuggestions = [],
  icon: Icon,
  chipColor = "zinc",
}: MultiTagInputProps) {
  const [draft, setDraft] = useState("");
  const tags = parseTagList(value);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...tags, trimmed];
      onChange(stringifyTagList(next));
    }
    setDraft("");
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    const next = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(stringifyTagList(next));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span>{label}</span>
          <span className="text-[10px] text-zinc-400 font-normal">
            ({tags.length} added)
          </span>
        </label>
        {subLabel && <span className="text-[10px] text-zinc-400">{subLabel}</span>}
      </div>

      <div
        className={`min-h-[42px] p-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex flex-wrap items-center gap-1.5 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              chipColor === "chrome"
                ? "bg-zinc-200 dark:bg-white/15 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-white/20"
                : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10 shadow-xs"
            }`}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:opacity-70 rounded-full p-0.5 transition"
                title={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <div className="flex-1 min-w-[150px] flex items-center gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? placeholder : "+ Add another (press Enter)..."}
              className="w-full bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 px-1 py-1"
            />
            {draft.trim() && (
              <button
                type="button"
                onClick={() => addTag(draft)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-semibold shrink-0 shadow-2xs hover:opacity-90 transition"
              >
                + Add
              </button>
            )}
          </div>
        )}
      </div>

      {!disabled && quickSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-zinc-400">Quick suggestions:</span>
          {quickSuggestions
            .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
            .map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addTag(s)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Alternating Monochrome Contrast Helpers for Accordion Sections (1..8)
 * Odd Sections (1, 3, 5, 7): Pure White / Deep Zinc-950 surface with solid dark/light badge
 * Even Sections (2, 4, 6, 8): Distinct Soft-Slate Zinc-200 / Zinc-800 surface with framed badge
 */
function getSectionCardClass(secNum: number, expanded: boolean): string {
  const isEven = secNum % 2 === 0;
  if (isEven) {
    return expanded
      ? "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-300 dark:border-zinc-600 bg-zinc-200/90 dark:bg-zinc-800/90 shadow-xs"
      : "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-300 dark:border-zinc-600 bg-zinc-200/80 dark:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-2xs";
  }
  return expanded
    ? "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs"
    : "rounded-2xl border transition-all duration-200 overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs";
}

function getSectionHeaderClass(secNum: number): string {
  const isEven = secNum % 2 === 0;
  return isEven
    ? "w-full p-5 sm:p-6 flex items-center justify-between text-left bg-zinc-300/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700/80 transition cursor-pointer"
    : "w-full p-5 sm:p-6 flex items-center justify-between text-left bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition cursor-pointer";
}

function getSectionBadgeClass(secNum: number): string {
  const isEven = secNum % 2 === 0;
  return isEven
    ? "w-6 h-6 rounded-md bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400 inline-flex items-center justify-center text-[11px] font-bold tracking-tight shadow-2xs shrink-0"
    : "w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 inline-flex items-center justify-center text-[11px] font-bold tracking-tight shadow-2xs shrink-0";
}

interface DynamicItemListBuilderProps {
  label: string;
  subLabel?: string;
  addButtonLabel: string;
  placeholderPrefix: string;
  items: string[];
  onChange: (nextItems: string[]) => void;
  disabled?: boolean;
}

function DynamicItemListBuilder({
  label,
  subLabel,
  addButtonLabel,
  placeholderPrefix,
  items,
  onChange,
  disabled = false,
}: DynamicItemListBuilderProps) {
  const safeItems = items && items.length > 0 ? items : [""];

  const handleUpdate = (index: number, value: string) => {
    const next = [...safeItems];
    next[index] = value;
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...safeItems, ""]);
  };

  const handleRemove = (index: number) => {
    if (safeItems.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(safeItems.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {label}
          </label>
          {subLabel && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {subLabel}
            </p>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1.5 hover:opacity-90 transition self-start sm:self-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addButtonLabel}</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {safeItems.map((item, idx) => {
          const isEvenRow = idx % 2 === 1;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                isEvenRow
                  ? "bg-zinc-300/65 dark:bg-zinc-700/70 border-zinc-400/70 dark:border-zinc-600"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                  isEvenRow
                    ? "bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400"
                    : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                }`}
              >
                {idx + 1}
              </span>

              <input
                type="text"
                disabled={disabled}
                value={item}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!disabled) handleAdd();
                  }
                }}
                placeholder={`${placeholderPrefix}...`}
                className={`flex-1 px-3.5 py-2 rounded-lg border text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isEvenRow
                    ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                }`}
              />

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                  title="Remove item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ScientificReferencesBuilderProps {
  references: ProgramReferenceItem[];
  onChange: (nextRefs: ProgramReferenceItem[]) => void;
  disabled?: boolean;
}

function ScientificReferencesBuilder({
  references,
  onChange,
  disabled = false,
}: ScientificReferencesBuilderProps) {
  const safeRefs =
    references && references.length > 0 ? references : [{ title: "", url: "" }];

  const handleUpdate = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const next = safeRefs.map((r, idx) =>
      idx === index ? { ...r, [field]: value } : r
    );
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...safeRefs, { title: "", url: "" }]);
  };

  const handleRemove = (index: number) => {
    if (safeRefs.length <= 1) {
      onChange([{ title: "", url: "" }]);
      return;
    }
    onChange(safeRefs.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Scientific References &amp; Clinical Journals *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Peer-reviewed studies, clinical journals, or scientific literature supporting the program benefits
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1.5 hover:opacity-90 transition self-start sm:self-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reference</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {safeRefs.map((refItem, idx) => {
          const isEvenRow = idx % 2 === 1;
          return (
            <div
              key={idx}
              className={`flex flex-col sm:flex-row sm:items-center gap-2.5 p-2 rounded-xl border transition ${
                isEvenRow
                  ? "bg-zinc-300/65 dark:bg-zinc-700/70 border-zinc-400/70 dark:border-zinc-600"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span
                  className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    isEvenRow
                      ? "bg-white text-zinc-950 border border-zinc-500 dark:bg-zinc-950 dark:text-white dark:border-zinc-400"
                      : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                  }`}
                >
                  {idx + 1}
                </span>

                <input
                  type="text"
                  disabled={disabled}
                  value={refItem.title}
                  onChange={(e) => handleUpdate(idx, "title", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!disabled) handleAdd();
                    }
                  }}
                  placeholder="Enter scientific reference or journal title..."
                  className={`flex-1 px-3.5 py-2 rounded-lg border text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isEvenRow
                      ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pl-8 sm:pl-0 sm:w-72 shrink-0">
                <input
                  type="url"
                  disabled={disabled}
                  value={refItem.url || ""}
                  onChange={(e) => handleUpdate(idx, "url", e.target.value)}
                  placeholder="Enter reference URL..."
                  className={`flex-1 px-3.5 py-2 rounded-lg border text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isEvenRow
                      ? "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
                  }`}
                />

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                    title="Remove reference"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProgramBlueprintSectionContentProps {
  targetState: string;
  onChangeTargetState: (val: string) => void;
  methodology: string;
  onChangeMethodology: (val: string) => void;
  expectedBenefits: string[];
  onChangeBenefits: (next: string[]) => void;
  scientificReferences: ProgramReferenceItem[];
  onChangeReferences: (next: ProgramReferenceItem[]) => void;
  programGuidelines: string[];
  onChangeGuidelines: (next: string[]) => void;
  disabled?: boolean;
}

function ProgramBlueprintSectionContent({
  targetState,
  onChangeTargetState,
  methodology,
  onChangeMethodology,
  expectedBenefits,
  onChangeBenefits,
  scientificReferences,
  onChangeReferences,
  programGuidelines,
  onChangeGuidelines,
  disabled = false,
}: ProgramBlueprintSectionContentProps) {
  return (
    <div className="space-y-6 pt-3">
      {/* 1. Target Physical, Mental & Mind Condition */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Target Physical, Mental &amp; Mind Condition *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Physical condition, mental state, and mind patterns this program is designed to address
          </p>
          <textarea
            rows={4}
            required
            disabled={disabled}
            value={targetState}
            onChange={(e) => onChangeTargetState(e.target.value)}
            placeholder="Enter target physical, mental, and mind condition..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* 2. Program Objectives & Methodology */}
        <div className="space-y-2 pt-2 border-t border-zinc-300/70 dark:border-zinc-700">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Program Objectives &amp; Methodology *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Core goals and how the movement, nutrition, and recovery methodology works
          </p>
          <textarea
            rows={4}
            required
            disabled={disabled}
            value={methodology}
            onChange={(e) => onChangeMethodology(e.target.value)}
            placeholder="Enter program objectives and methodology..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* 3. Expected Benefits & Tangible Outcomes */}
      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <DynamicItemListBuilder
          label="Expected Benefits & Tangible Outcomes *"
          subLabel="Specific physical, mental, and daily life improvements participants will experience"
          addButtonLabel="Add Benefit"
          placeholderPrefix="Enter expected benefit"
          items={expectedBenefits}
          onChange={onChangeBenefits}
          disabled={disabled}
        />
      </div>

      {/* 4. Scientific References & Clinical Journals */}
      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <ScientificReferencesBuilder
          references={scientificReferences}
          onChange={onChangeReferences}
          disabled={disabled}
        />
      </div>

      {/* 5. Program Guidelines & Daily Principles */}
      <div className="pt-4 border-t border-zinc-300/70 dark:border-zinc-700/70">
        <DynamicItemListBuilder
          label="Program Guidelines & Daily Principles *"
          subLabel="Practical preparation habits, daily discipline rules, and participation standards"
          addButtonLabel="Add Guideline"
          placeholderPrefix="Enter program guideline"
          items={programGuidelines}
          onChange={onChangeGuidelines}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface ProgramTermsChapterBuilderProps {
  chapters: ProgramTermChapter[];
  onChange: (nextChapters: ProgramTermChapter[]) => void;
  disabled?: boolean;
}

function ProgramTermsChapterBuilder({
  chapters,
  onChange,
  disabled = false,
}: ProgramTermsChapterBuilderProps) {
  const currentChapters =
    chapters && chapters.length > 0
      ? chapters
      : DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
          chapter: c.chapter,
          clauses: [...c.clauses],
        }));

  const handleUpdateChapterTitle = (chapterIdx: number, val: string) => {
    const updated = currentChapters.map((ch, idx) =>
      idx === chapterIdx ? { ...ch, chapter: val } : ch
    );
    onChange(updated);
  };

  const handleAddChapter = () => {
    const nextChapterNumber = currentChapters.length + 1;
    onChange([
      ...currentChapters,
      {
        chapter: `Chapter ${nextChapterNumber}: Terms & Policies`,
        clauses: ["Enter enforceable clause details here..."],
      },
    ]);
  };

  const handleRemoveChapter = (chapterIdx: number) => {
    if (currentChapters.length <= 1) {
      onChange([{ chapter: "", clauses: [""] }]);
      return;
    }
    onChange(currentChapters.filter((_, idx) => idx !== chapterIdx));
  };

  const handleUpdateClause = (chapterIdx: number, clauseIdx: number, val: string) => {
    const updated = currentChapters.map((ch, idx) => {
      if (idx !== chapterIdx) return ch;
      const nextClauses = [...ch.clauses];
      nextClauses[clauseIdx] = val;
      return { ...ch, clauses: nextClauses };
    });
    onChange(updated);
  };

  const handleAddClause = (chapterIdx: number) => {
    const updated = currentChapters.map((ch, idx) => {
      if (idx !== chapterIdx) return ch;
      return { ...ch, clauses: [...ch.clauses, ""] };
    });
    onChange(updated);
  };

  const handleRemoveClause = (chapterIdx: number, clauseIdx: number) => {
    const updated = currentChapters.map((ch, idx) => {
      if (idx !== chapterIdx) return ch;
      if (ch.clauses.length <= 1) {
        return { ...ch, clauses: [""] };
      }
      return { ...ch, clauses: ch.clauses.filter((_, cIdx) => cIdx !== clauseIdx) };
    });
    onChange(updated);
  };

  const handleLoadDefaultPreset = () => {
    onChange(
      DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
        chapter: c.chapter,
        clauses: [...c.clauses],
      }))
    );
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-200 dark:border-white/10">
        <div>
          <label className="block text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
            Terms &amp; Conditions Chapters (Bab &amp; Sub-bab) *
          </label>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize program rules into structured chapters (e.g. Refund Policy, Medical Clearance) with specific numbered clauses.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleLoadDefaultPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition shrink-0"
            title="Reset to default legal & medical waiver chapters"
          >
            <RefreshCw className="w-3 h-3 text-zinc-400" />
            <span>Load Standard Preset</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {currentChapters.map((ch, cIdx) => (
          <div
            key={cIdx}
            className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02] space-y-3.5 transition"
          >
            {/* Chapter Header */}
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-200/90 dark:bg-zinc-800 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider shrink-0 select-none">
                Bab {cIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  disabled={disabled}
                  value={ch.chapter}
                  onChange={(e) => handleUpdateChapterTitle(cIdx, e.target.value)}
                  placeholder="Enter chapter title"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveChapter(cIdx)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                  title="Remove this chapter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sub-bab Clauses */}
            <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-zinc-200 dark:border-white/10 ml-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block pb-1">
                Sub-bab Clauses for Bab {cIdx + 1}
              </span>
              {ch.clauses.map((clause, clIdx) => (
                <div key={clIdx} className="flex items-center gap-2">
                  <span className="w-9 px-1.5 py-1 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 text-center shrink-0 select-none">
                    {cIdx + 1}.{clIdx + 1}
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    value={clause}
                    onChange={(e) => handleUpdateClause(cIdx, clIdx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!disabled) handleAddClause(cIdx);
                      }
                    }}
                    placeholder={`Enter clause ${cIdx + 1}.${clIdx + 1}...`}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveClause(cIdx, clIdx)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition shrink-0"
                      title="Remove clause"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {!disabled && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddClause(cIdx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-500 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Clause {cIdx + 1}.{ch.clauses.length + 1}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddChapter}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Chapter (Bab {currentChapters.length + 1})</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface TermsAndConditionsBuilderProps {
  terms: string[];
  onChange: (nextTerms: string[]) => void;
  disabled?: boolean;
}

function TermsAndConditionsBuilder({
  terms,
  onChange,
  disabled = false,
}: TermsAndConditionsBuilderProps) {
  const safeTerms = terms && terms.length > 0 ? terms : [...DEFAULT_PROGRAM_TERMS];
  return (
    <div className="pt-3">
      <DynamicItemListBuilder
        label="Terms & Conditions Clauses *"
        subLabel="Legal, medical disclaimer, and non-refundable enrollment terms agreed upon at checkout"
        addButtonLabel="Add Term"
        placeholderPrefix="Enter term and condition"
        items={safeTerms}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export function AdminClient({
  initialUsers,
  initialPrograms,
  initialMasterData,
  currentAdminId,
  initialRoute,
}: AdminClientProps) {
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<
    "dashboard" | "programs" | "master" | "members" | "payments"
  >(initialRoute?.menu || "dashboard");

  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);

  const initialCustomer = useMemo(() => {
    if (initialRoute?.menu === "members" && initialRoute?.customerId) {
      return initialUsers.find((u) => u.id === initialRoute.customerId) || null;
    }
    return null;
  }, [initialRoute, initialUsers]);

  const [inspectingUserHealth, setInspectingUserHealth] = useState<AdminUserItem | null>(initialCustomer);
  const [customerModalTab, setCustomerModalTab] = useState<
    "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes"
  >(initialRoute?.customerTab || "overview");
  const [customerResponseProgramFilter, setCustomerResponseProgramFilter] = useState<string>("ALL");
  const [customerResponseStatusFilter, setCustomerResponseStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");
  const [customerResponsePhotosOnly, setCustomerResponsePhotosOnly] = useState(false);
  const [customerResponseSearch, setCustomerResponseSearch] = useState("");
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});
  const [customerCoachNotes, setCustomerCoachNotes] = useState(
    initialCustomer?.healthProfile?.coachNotes || ""
  );
  const [customerCity, setCustomerCity] = useState(initialCustomer?.city || "");
  const [customerProvince, setCustomerProvince] = useState(initialCustomer?.province || "");
  const [customerEmergencyName, setCustomerEmergencyName] = useState(
    initialCustomer?.emergencyContactName || ""
  );
  const [customerEmergencyPhone, setCustomerEmergencyPhone] = useState(
    initialCustomer?.emergencyContactPhone || ""
  );
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.address || "");
  const [customerOccupation, setCustomerOccupation] = useState(initialCustomer?.occupation || "");
  const [customerGender, setCustomerGender] = useState(initialCustomer?.gender || "");
  const [customerAge, setCustomerAge] = useState<string | number>(initialCustomer?.age || "");
  const [customerDietType, setCustomerDietType] = useState(initialCustomer?.healthProfile?.dietType || "");
  const [customerHeight, setCustomerHeight] = useState<string | number>(initialCustomer?.healthProfile?.heightCm ?? "");
  const [customerWeight, setCustomerWeight] = useState<string | number>(initialCustomer?.healthProfile?.weightKg ?? "");
  const [selectedCustomerProgramId, setSelectedCustomerProgramId] = useState<string | null>(null);
  const [customerInjuries, setCustomerInjuries] = useState(
    initialCustomer?.healthProfile?.injuriesOrConditions || ""
  );
  const [customerAllergies, setCustomerAllergies] = useState(
    initialCustomer?.healthProfile?.foodAllergies || ""
  );
  const [customerPrimaryGoal, setCustomerPrimaryGoal] = useState(
    initialCustomer?.healthProfile?.primaryGoal || ""
  );
  const [savingCustomerProfile, setSavingCustomerProfile] = useState(false);
  const [customerProfileSuccess, setCustomerProfileSuccess] = useState<string | null>(null);

  const openCustomerDetail = (
    u: AdminUserItem,
    tab: "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes" = "overview"
  ) => {
    setInspectingUserHealth(u);
    setCustomerModalTab(tab);
    setCustomerResponseProgramFilter("ALL");
    setCustomerResponseStatusFilter("ALL");
    setCustomerResponsePhotosOnly(false);
    setCustomerResponseSearch("");
    setExpandedResponseIds({});
    setCustomerCoachNotes(u.healthProfile?.coachNotes || "");
    setCustomerCity(u.city || "");
    setCustomerProvince(u.province || "");
    setCustomerEmergencyName(u.emergencyContactName || "");
    setCustomerEmergencyPhone(u.emergencyContactPhone || "");
    setCustomerAddress(u.address || "");
    setCustomerOccupation(u.occupation || "");
    setCustomerGender(u.gender || "");
    setCustomerAge(u.age || u.healthProfile?.age || "");
    setCustomerDietType(u.healthProfile?.dietType || "");
    setCustomerHeight(u.healthProfile?.heightCm ?? "");
    setCustomerWeight(u.healthProfile?.weightKg ?? "");
    setSelectedCustomerProgramId(null);
    setCustomerInjuries(u.healthProfile?.injuriesOrConditions || "");
    setCustomerAllergies(u.healthProfile?.foodAllergies || "");
    setCustomerPrimaryGoal(u.healthProfile?.primaryGoal || "");
    setCustomerProfileSuccess(null);
    router.push(`/admin/customers/${u.id}?tab=${tab}`);
  };

  const closeCustomerDetail = () => {
    setInspectingUserHealth(null);
    setCustomerProfileSuccess(null);
    router.push("/admin/customers");
  };

  const switchCustomerTab = (
    tab: "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes"
  ) => {
    setCustomerModalTab(tab);
    setCustomerProfileSuccess(null);
    if (inspectingUserHealth) {
      router.push(`/admin/customers/${inspectingUserHealth.id}?tab=${tab}`);
    }
  };

  const handleSaveCustomerProfile = async () => {
    if (!inspectingUserHealth) return;
    setSavingCustomerProfile(true);
    setCustomerProfileSuccess(null);
    try {
      const res = await wellnessAdminUpdateCustomerProfile(inspectingUserHealth.id, {
        coachNotes: customerCoachNotes,
      });

      if (res.success) {
        setCustomerProfileSuccess("Coach notes saved successfully.");
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== inspectingUserHealth.id) return u;
            const updatedProfile: AdminCustomerHealthProfile = {
              ...(u.healthProfile || {
                id: `hp-${u.id}`,
                photoFrontUrl: null,
                photoSideUrl: null,
                photoBackUrl: null,
                weightKg: null,
                heightCm: null,
                waistCm: null,
                chestCm: null,
                hipsCm: null,
                currentMood: null,
                energyLevel: null,
                routineConfidence: null,
                workoutFrequency: null,
                averageBedtime: null,
                averageWakeTime: null,
                sleepQualityNotes: null,
                eatingPatterns: null,
              }),
              coachNotes: customerCoachNotes,
            };
            const updatedUser: AdminUserItem = {
              ...u,
              healthProfile: updatedProfile,
            };
            setInspectingUserHealth(updatedUser);
            return updatedUser;
          })
        );
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to save coach notes." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error saving coach notes." });
    } finally {
      setSavingCustomerProfile(false);
    }
  };

  const [programs, setPrograms] = useState<AdminProgram[]>(initialPrograms);
  const [masterData, setMasterData] = useState<MasterDataPayload>(
    initialMasterData || { coaches: [], targetAudiences: [], categories: [] }
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isCreatingProgram, setIsCreatingProgram] = useState(Boolean(initialRoute?.isCreating));

  // Master Data form inputs
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachTitle, setNewCoachTitle] = useState("");
  const [newAudienceName, setNewAudienceName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newCommitmentName, setNewCommitmentName] = useState("");
  const [masterActionLoading, setMasterActionLoading] = useState(false);

  // Master Directories View State & Pagination
  const [masterTab, setMasterTab] = useState<"coaches" | "audience" | "categories" | "equipment" | "commitments">(
    initialRoute?.masterTab && initialRoute.masterTab !== ("all" as any)
      ? (initialRoute.masterTab as any)
      : "coaches"
  );
  const [masterSearch, setMasterSearch] = useState("");
  const [masterPage, setMasterPage] = useState(1);
  const [masterSort, setMasterSort] = useState<"A_Z" | "Z_A">("A_Z");
  const MASTER_GRID_PAGE_SIZE = 15;
  const MASTER_PAGE_SIZE = 15;

  const [activeDirectoryModal, setActiveDirectoryModal] = useState<{
    mode: "add" | "edit";
    type: "coaches" | "audience" | "categories" | "equipment" | "commitments";
    item?: { id: string; name: string; title?: string };
  } | null>(null);
  const [modalFormName, setModalFormName] = useState("");
  const [modalFormTitle, setModalFormTitle] = useState("");

  const [showAddCoach, setShowAddCoach] = useState(false);
  const [editingCoach, setEditingCoach] = useState<{ id: string; name: string; title: string } | null>(null);

  const [showAddAudience, setShowAddAudience] = useState(false);
  const [editingAudience, setEditingAudience] = useState<{ id: string; name: string } | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<{ id: string; name: string } | null>(null);

  const [showAddCommitment, setShowAddCommitment] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<{ id: string; name: string } | null>(null);

  const navigateToDirectory = (
    tab: "coaches" | "audience" | "categories" | "equipment" | "commitments"
  ) => {
    setActiveMenu("master");
    setMasterTab(tab);
    setMasterPage(1);
    setActiveDirectoryModal({ mode: "add", type: tab });
    setModalFormName("");
    setModalFormTitle("");
    router.push(`/admin/directories?tab=${tab}`);
  };



  const defaultOpenDate = formatWIBDateISO(new Date());
  const defaultStart = formatWIBDateISO(
    new Date(Date.now() + 3 * 24 * 3600 * 1000)
  );
  const defaultDeadline = formatWIBDateISO(
    new Date(Date.now() + 2 * 24 * 3600 * 1000)
  );

  const getInitialCreateForm = () => ({
    title: "",
    description: "",
    targetState: "",
    methodology: "",
    expectedBenefits: [""],
    scientificReferences: [{ title: "", url: "" }] as ProgramReferenceItem[],
    programGuidelines: [""],
    coverImage: "",
    difficultyLevel: "",
    category: "",
    equipment: "",
    dailyCommitment: "",
    coachName: "",
    coachTitle: "",
    recommendedFor: "",
    durationDays: 7,
    startDate: defaultStart,
    endDate: computeEndDate(defaultStart, 7),
    registrationOpenDate: defaultOpenDate,
    registrationDeadline: defaultDeadline,
    actualPrice: 0,
    discountPercentage: 0,
    price: 0,
    maxQuota: 35,
    communityLink: "",
    locationType: "ONLINE" as "ONLINE" | "ONSITE" | "HYBRID",
    city: "Jakarta",
    venueAddress: "",
    virtualFallbackAvailable: true,
    termsType: "CUSTOM" as "STANDARD" | "CUSTOM",
    customTerms: serializeTermsChapters(DEFAULT_PROGRAM_TERMS_CHAPTERS),
    termsList: [...DEFAULT_PROGRAM_TERMS],
    termsChapters: DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    })),
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });

  const [createForm, setCreateForm] = useState(getInitialCreateForm);

  const resetCreateForm = () => {
    setCreateForm(getInitialCreateForm());
    setExpandedCreateSections({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false });
    setCreateError(null);
  };
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    initialRoute?.programId || null
  );

  const [programSearch, setProgramSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<
    "ALL" | ProgramDatabaseStatus
  >("ALL");
  const [programSort, setProgramSort] = useState<
    | "NEWEST"
    | "OLDEST"
    | "TITLE_ASC"
    | "TITLE_DESC"
    | "MEMORY_DESC"
    | "MEMORY_ASC"
    | "PRICE_DESC"
    | "PRICE_ASC"
  >("NEWEST");
  const [programPage, setProgramPage] = useState(1);
  const PROGRAM_PAGE_SIZE = 5;

  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<
    "ALL" | "ACTIVE" | "PENDING" | "SUSPENDED" | "SUPERADMIN"
  >("ALL");
  const [memberSort, setMemberSort] = useState<
    "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "ENROLLMENTS_DESC"
  >("NEWEST");
  const [memberPage, setMemberPage] = useState(1);
  const MEMBER_PAGE_SIZE = 10;

  const [qrisSearch, setQrisSearch] = useState("");
  const [qrisPage, setQrisPage] = useState(1);
  const QRIS_PAGE_SIZE = 5;

  const DAY_BATCH_SIZE = 7;
  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialRoute?.day || 1);
  const [dayBatchPage, setDayBatchPage] = useState<number>(
    Math.ceil((initialRoute?.day || 1) / 7)
  );
  const [scheduleWeekView, setScheduleWeekView] = useState<number | "ALL">("ALL");

  // Accordion Expand / Collapse states for Create Program & Program Detail (Default: Collapse All)
  const [expandedCreateSections, setExpandedCreateSections] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
  });

  const [expandedDetailSections, setExpandedDetailSections] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
  });

  const toggleCreateSection = (sec: number) => {
    setExpandedCreateSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllCreateSections = (expanded: boolean) => {
    setExpandedCreateSections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
      6: expanded,
      7: expanded,
      8: expanded,
    });
  };

  const toggleDetailSection = (sec: number) => {
    setExpandedDetailSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllDetailSections = (expanded: boolean) => {
    setExpandedDetailSections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
      6: expanded,
      7: expanded,
      8: expanded,
    });
  };

  const [expandedDaySections, setExpandedDaySections] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  const toggleDaySection = (sec: number) => {
    setExpandedDaySections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllDaySections = (expanded: boolean) => {
    setExpandedDaySections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
    });
  };

  const [programDetailTab, setProgramDetailTab] = useState<"info" | "schedule" | "responses">(
    initialRoute?.programTab || "info"
  );

  // Member Submissions / View Responses State
  const [programSubmissions, setProgramSubmissions] = useState<ProgramSubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionStats, setSubmissionStats] = useState<{
    totalSubmissions: number;
    completedSubmissions: number;
    photoSubmissions: number;
    uniqueMembers: number;
  }>({
    totalSubmissions: 0,
    completedSubmissions: 0,
    photoSubmissions: 0,
    uniqueMembers: 0,
  });
  const [submissionDayFilter, setSubmissionDayFilter] = useState<number | "ALL">("ALL");
  const [submissionMemberFilter, setSubmissionMemberFilter] = useState<string>("ALL");
  const [submissionPhotosOnly, setSubmissionPhotosOnly] = useState<boolean>(false);
  const [submissionSearch, setSubmissionSearch] = useState<string>("");
  const [lightboxData, setLightboxData] = useState<{
    beforeUrl?: string | null;
    afterUrl?: string | null;
    title: string;
    memberName: string;
    dayNumber: number;
    dateStr?: string | null;
  } | null>(null);

  const loadProgramSubmissions = async (
    progId: string,
    filters?: { dayNumber?: number; userId?: string; hasPhotosOnly?: boolean }
  ) => {
    if (!progId) return;
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const res = await wellnessAdminGetProgramSubmissions(progId, filters);
      if (res.success && res.data) {
        setProgramSubmissions(res.data.submissions);
        setSubmissionStats(res.data.stats);
      } else {
        setSubmissionsError(res.message || "Failed to load submissions.");
      }
    } catch {
      setSubmissionsError("An unexpected error occurred while loading member responses.");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return programSubmissions.filter((sub) => {
      if (submissionDayFilter !== "ALL" && sub.dayNumber !== submissionDayFilter) {
        return false;
      }
      if (submissionMemberFilter !== "ALL" && sub.userId !== submissionMemberFilter) {
        return false;
      }
      if (submissionPhotosOnly && !sub.photoBeforeUrl && !sub.photoAfterUrl) {
        return false;
      }
      if (submissionSearch.trim()) {
        const query = submissionSearch.toLowerCase();
        const matchesName = sub.userName.toLowerCase().includes(query);
        const matchesEmail = sub.userEmail.toLowerCase().includes(query);
        const matchesNotes = sub.workoutNotes?.toLowerCase().includes(query);
        const matchesReflection = sub.dailyReflection?.toLowerCase().includes(query);
        const matchesDayTitle = sub.dayTitle.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesNotes && !matchesReflection && !matchesDayTitle) {
          return false;
        }
      }
      return true;
    });
  }, [
    programSubmissions,
    submissionDayFilter,
    submissionMemberFilter,
    submissionPhotosOnly,
    submissionSearch,
  ]);
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    mode: "ERROR" | "CONFIRM";
    missingDays?: number[];
    errorList?: string[];
  } | null>(null);

  const [savingDay, setSavingDay] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingProgId, setDeletingProgId] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [metaError, setMetaError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || null;
  const currentAdmin = users.find((u) => u.id === currentAdminId);

  const [metaForm, setMetaForm] = useState({
    title: "",
    description: "",
    targetState: DEFAULT_TARGET_STATE,
    methodology: DEFAULT_METHODOLOGY,
    expectedBenefits: [...DEFAULT_PROGRAM_BENEFITS],
    scientificReferences: DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r })),
    programGuidelines: [...DEFAULT_PROGRAM_GUIDELINES],
    coverImage: "",
    difficultyLevel: "INTERMEDIATE",
    category: "Pilates",
    equipment: "Yoga Mat",
    dailyCommitment: "20 - 30 Mins / Day",
    coachName: "",
    coachTitle: "",
    recommendedFor: "",
    durationDays: 7,
    startDate: "",
    endDate: "",
    registrationOpenDate: "",
    registrationDeadline: "",
    actualPrice: 0,
    discountPercentage: 0,
    price: 0,
    maxQuota: 35,
    communityLink: "",
    locationType: "ONLINE" as "ONLINE" | "ONSITE" | "HYBRID",
    city: "Jakarta",
    venueAddress: "",
    virtualFallbackAvailable: true,
    termsType: "CUSTOM" as "STANDARD" | "CUSTOM",
    customTerms: serializeTermsChapters(DEFAULT_PROGRAM_TERMS_CHAPTERS),
    termsList: [...DEFAULT_PROGRAM_TERMS],
    termsChapters: DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    })),
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });

  const [dayForm, setDayForm] = useState<{
    title: string;
    dayType: "TRAINING_DAY" | "REST_DAY" | "CONNECTION_DAY" | "MEETUP_DAY";
    coachName: string;
    recommendedFor: string;
    videoUrl: string;
    videoLinks: DayVideoLinkItem[];
    workoutGroups: WorkoutOptionGroup[];
    videoChecklist: string[];
    mealRecommendation: string;
    dailyAssessment: string;
    workoutOptions: string[];
    sleepRecommendation: string;
    dayNotifications: DayNotificationState[];
    restInstructions: string;
    onsiteVenue: string;
    onsiteSchedule: string;
    meetupLink: string;
    mapLink: string;
    eventTitle: string;
    eventHost: string;
    eventDetails: string;
    pendingReminder: string;
    completedReminder: string;
  }>({
    title: "",
    dayType: "TRAINING_DAY",
    coachName: "",
    recommendedFor: "",
    workoutOptions: ["Workout", "Pilates", "Yoga"],
    workoutGroups: DEFAULT_WORKOUT_OPTION_GROUPS.map((g) => ({
      optionName: g.optionName,
      movements: g.movements.map((m) => ({ ...m })),
    })),
    sleepRecommendation: "Target 8 Hours • Wind down before 22:30 WIB",
    dayNotifications: getDefaultNotificationsForType("TRAINING_DAY"),
    videoUrl: "",
    videoLinks: [
      {
        title: "Primary Workout Session",
        url: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      },
    ],
    videoChecklist: ["[Workout] Push-up = 30 reps", "[Workout] Sit-up = 50 reps", "[Workout] Pull-up = 10 reps"],
    mealRecommendation: "",
    dailyAssessment: "",
    restInstructions: "",
    onsiteVenue: "Jakarta",
    onsiteSchedule: "09:00 – 11:00 WIB",
    meetupLink: "",
    mapLink: "",
    eventTitle: "",
    eventHost: "",
    eventDetails: "",
    pendingReminder: "",
    completedReminder: "",
  });

  // Section Field Progress Calculation Helper Functions
  const getProgramSectionStats = (
    section: number,
    form: typeof createForm | typeof metaForm
  ): { filled: number; total: number } => {
    switch (section) {
      case 1: {
        const items = [
          Boolean(form.title?.trim()),
          Boolean(form.difficultyLevel?.trim()),
          Boolean(form.coverImage?.trim()),
          Boolean(form.description?.trim()),
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 2: {
        const items = [
          Boolean(form.targetState?.trim()),
          Boolean(form.methodology?.trim()),
          (form.expectedBenefits || []).filter((b) => b.trim()).length > 0,
          (form.scientificReferences || []).filter((r) => r.title.trim()).length > 0,
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 3: {
        const items = [
          parseTagList(form.category || "").length > 0,
          Boolean(form.dailyCommitment?.trim()),
          parseTagList(form.equipment || "").length > 0,
          parseTagList(form.coachName || "").length > 0,
          parseTagList(form.recommendedFor || "").length > 0,
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 4: {
        const items = [
          Boolean(form.startDate),
          Boolean(form.endDate),
          Boolean(form.registrationOpenDate),
          Boolean(form.registrationDeadline),
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 5: {
        if (form.locationType === "ONLINE") {
          return { filled: 1, total: 1 };
        }
        const items = [
          Boolean(form.locationType),
          Boolean(form.city?.trim()),
          Boolean(form.venueAddress?.trim()),
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 6: {
        const items = [
          Boolean(form.maxQuota && Number(form.maxQuota) > 0),
          form.actualPrice !== undefined && form.actualPrice !== null && Number(form.actualPrice) >= 0,
          form.discountPercentage !== undefined && form.discountPercentage !== null,
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 7: {
        const items = [Boolean(form.communityLink?.trim())];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 8: {
        const hasChapters = ((form as any).termsChapters || []).some(
          (c: ProgramTermChapter) => c.chapter.trim().length > 0 && c.clauses.some((cl) => cl.trim().length > 0)
        );
        const hasLegacyTerms = (form.termsList || []).filter((t) => t.trim()).length > 0;
        const isFilled = hasChapters || hasLegacyTerms;
        return { filled: isFilled ? 1 : 0, total: 1 };
      }
      default:
        return { filled: 0, total: 0 };
    }
  };

  const getDaySectionStats = (
    section: number,
    form: typeof dayForm
  ): { filled: number; total: number } => {
    switch (section) {
      case 1: {
        if (form.dayType === "REST_DAY") {
          const items = [Boolean(form.title?.trim())];
          return { filled: items.filter(Boolean).length, total: items.length };
        }
        const items = [
          Boolean(form.title?.trim()),
          Boolean(form.coachName?.trim()),
          Boolean(form.recommendedFor?.trim()),
        ];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 2: {
        if (form.dayType === "TRAINING_DAY") {
          const hasVideos = (form.videoLinks || []).some((v) => v.url.trim().length > 0);
          const hasWorkouts = (form.workoutGroups || []).some(
            (g) =>
              g.optionName.trim().length > 0 &&
              g.movements.some((m) => m.name.trim().length > 0)
          );
          const items = [hasVideos, hasWorkouts];
          return { filled: items.filter(Boolean).length, total: items.length };
        }
        if (form.dayType === "REST_DAY") {
          const items = [Boolean(form.restInstructions?.trim())];
          return { filled: items.filter(Boolean).length, total: items.length };
        }
        // CONNECTION_DAY / MEETUP_DAY
        const hasTitle = Boolean(form.eventTitle?.trim() || form.title?.trim());
        const hasLocationOrLink = Boolean(
          (form.onsiteVenue?.trim() && form.onsiteSchedule?.trim()) ||
          form.meetupLink?.trim()
        );
        const items = [hasTitle, hasLocationOrLink];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 3: {
        const items = [Boolean(form.mealRecommendation?.trim())];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 4: {
        const items = [Boolean(form.sleepRecommendation?.trim())];
        return { filled: items.filter(Boolean).length, total: items.length };
      }
      case 5: {
        const notifs = form.dayNotifications || [];
        const total = notifs.length || (form.dayType === "REST_DAY" ? 2 : 3);
        const filled = notifs.filter((n) => Boolean(n.message?.trim())).length;
        return { filled, total };
      }
      default:
        return { filled: 0, total: 0 };
    }
  };

  const renderSectionProgressBadge = (filled: number, total: number) => {
    const isComplete = total > 0 && filled === total;
    return (
      <span
        className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-full transition whitespace-nowrap ${
          isComplete
            ? "bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-950/40 dark:text-zinc-400 dark:border-zinc-800/60 font-semibold"
            : filled > 0
            ? "bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/10"
            : "bg-zinc-100/60 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 border border-zinc-200/40 dark:border-white/5"
        }`}
      >
        ( {filled} / {total} )
      </span>
    );
  };

  const loadDayIntoForm = (prog: AdminProgram, dayNumber: number) => {
    const existing = prog.days.find((d) => d.dayNumber === dayNumber);
    const progCoaches = parseTagList(prog.coachName);
    const progRecommended = parseTagList(prog.recommendedFor);

    if (existing) {
      const normalizedType =
        existing.dayType === "REST_DAY"
          ? "REST_DAY"
          : existing.dayType === "CONNECTION_DAY" || existing.dayType === "MEETUP_DAY"
          ? "CONNECTION_DAY"
          : "TRAINING_DAY";

      const parsedVideoLinks = parseDayVideoLinks(existing.videoUrl);
      const parsedWorkoutGroups = parseWorkoutOptionGroups(
        existing.workoutOptions,
        existing.videoChecklist
      );
      const serializedGroups = serializeWorkoutOptionGroups(parsedWorkoutGroups);

      setDayForm({
        title: existing.title,
        dayType: normalizedType,
        coachName: existing.coachName || (progCoaches[0] || ""),
        recommendedFor: existing.recommendedFor || (progRecommended[0] || ""),
        workoutOptions: serializedGroups.workoutOptions,
        workoutGroups: parsedWorkoutGroups,
        sleepRecommendation:
          existing.sleepRecommendation || "Target 8 Hours • Wind down before 22:30 WIB",
        dayNotifications:
          existing.dayNotifications && existing.dayNotifications.length > 0
            ? existing.dayNotifications
            : getDefaultNotificationsForType(normalizedType),
        videoUrl: existing.videoUrl || "",
        videoLinks:
          parsedVideoLinks.length > 0
            ? parsedVideoLinks
            : [{ title: "Primary Workout Session", url: "" }],
        videoChecklist: serializedGroups.videoChecklist,
        mealRecommendation:
          existing.mealRecommendation ||
          "High-protein breakfast, balanced lunch with greens, and light dinner before 19:30 WIB.",
        dailyAssessment: existing.dailyAssessment || "",
        restInstructions: existing.restInstructions || "",
        onsiteVenue: existing.onsiteVenue || prog.city || "Jakarta",
        onsiteSchedule: existing.onsiteSchedule || "09:00 – 11:00 WIB",
        meetupLink: existing.meetupLink || "",
        mapLink: existing.mapLink || "",
        eventTitle: existing.eventTitle || "",
        eventHost: existing.eventHost || "",
        eventDetails: existing.eventDetails || "",
        pendingReminder: existing.pendingReminder || "",
        completedReminder: existing.completedReminder || "",
      });
    } else {
      const defaultGroups = DEFAULT_WORKOUT_OPTION_GROUPS.map((g) => ({
        optionName: g.optionName,
        movements: g.movements.map((m) => ({ ...m })),
      }));
      const serializedDefaultGroups = serializeWorkoutOptionGroups(defaultGroups);

      setDayForm({
        title: `Day ${dayNumber}: Daily Session`,
        dayType: "TRAINING_DAY",
        coachName: progCoaches[0] || "",
        recommendedFor: progRecommended[0] || "",
        workoutOptions: serializedDefaultGroups.workoutOptions,
        workoutGroups: defaultGroups,
        sleepRecommendation: "Target 8 Hours • Wind down before 22:30 WIB",
        dayNotifications: getDefaultNotificationsForType("TRAINING_DAY"),
        videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
        videoLinks: [
          {
            title: "Primary Workout Session",
            url: "https://www.youtube.com/watch?v=sTANio_2E0Q",
          },
        ],
        videoChecklist: serializedDefaultGroups.videoChecklist,
        mealRecommendation:
          "High-protein breakfast, balanced lunch with greens, and light dinner before 19:30 WIB.",
        dailyAssessment: "How did your body feel during today's session?",
        restInstructions: "",
        onsiteVenue: prog.city || "Jakarta",
        onsiteSchedule: "09:00 – 11:00 WIB",
        meetupLink: "",
        mapLink: "",
        eventTitle: "",
        eventHost: "",
        eventDetails: "",
        pendingReminder: `Day ${dayNumber} is ready. Complete your session before 23:59 WIB.`,
        completedReminder: `Well done on completing Day ${dayNumber}! Rest well tonight.`,
      });
    }
  };

  const loadMetaIntoForm = (prog: AdminProgram) => {
    const resolvedChapters = parseTermsChapters(prog.customTerms);
    const resolvedTerms =
      prog.termsList && prog.termsList.length > 0
        ? [...prog.termsList]
        : parseTermsList(prog.customTerms);
    const resolvedBenefits =
      prog.expectedBenefits && prog.expectedBenefits.length > 0
        ? [...prog.expectedBenefits]
        : [...DEFAULT_PROGRAM_BENEFITS];
    const resolvedRefs =
      prog.scientificReferences && prog.scientificReferences.length > 0
        ? prog.scientificReferences.map((r) => ({ ...r }))
        : DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r }));
    const resolvedGuidelines =
      prog.programGuidelines && prog.programGuidelines.length > 0
        ? [...prog.programGuidelines]
        : [...DEFAULT_PROGRAM_GUIDELINES];

    setMetaForm({
      title: prog.title,
      description: prog.description,
      targetState: prog.targetState || DEFAULT_TARGET_STATE,
      methodology: prog.methodology || DEFAULT_METHODOLOGY,
      expectedBenefits: resolvedBenefits,
      scientificReferences: resolvedRefs,
      programGuidelines: resolvedGuidelines,
      coverImage: prog.coverImage || "",
      difficultyLevel: prog.difficultyLevel || "INTERMEDIATE",
      category: prog.category || "Pilates",
      equipment: prog.equipment || "Yoga Mat",
      dailyCommitment: prog.dailyCommitment || "20 - 30 Mins / Day",
      coachName: prog.coachName,
      coachTitle: prog.coachTitle || "",
      recommendedFor: prog.recommendedFor || "All Levels",
      durationDays: prog.durationDays || 7,
      actualPrice: prog.actualPrice ?? prog.price,
      discountPercentage: prog.discountPercentage ?? 0,
      price: prog.price,
      maxQuota: prog.maxQuota,
      communityLink: prog.communityLink || "",
      locationType: ((prog.locationType as "ONLINE" | "ONSITE" | "HYBRID") || "ONLINE"),
      city: prog.city || "Jakarta",
      venueAddress: prog.venueAddress || "",
      virtualFallbackAvailable: prog.virtualFallbackAvailable ?? true,
      termsType: "CUSTOM",
      customTerms: prog.customTerms || serializeTermsChapters(resolvedChapters),
      termsList: resolvedTerms,
      termsChapters: resolvedChapters,
      startDate: toInputDate(prog.startDate),
      endDate: toInputDate(prog.endDate),
      registrationOpenDate: prog.registrationOpenDate ? toInputDate(prog.registrationOpenDate) : "",
      registrationDeadline: toInputDate(prog.registrationDeadline),
      status: (prog.status as "DRAFT" | "PUBLISHED") || (prog.isPublished ? "PUBLISHED" : "DRAFT"),
    });
  };

  const openProgramDetail = (
    prog: AdminProgram,
    initialDay?: number,
    tab: "info" | "schedule" | "responses" = "info"
  ) => {
    setSelectedProgramId(prog.id);
    setIsCreatingProgram(false);
    setActiveMenu("programs");
    setFeedback(null);
    setAllDetailSections(false);
    setAllDaySections(false);
    loadMetaIntoForm(prog);

    if (tab === "responses") {
      loadProgramSubmissions(prog.id);
    }

    const targetDay =
      initialDay ??
      (() => {
        for (let d = 1; d <= (prog.durationDays || 21); d++) {
          const found = prog.days.find((x) => x.dayNumber === d);
          if (!isDayFilled(found)) return d;
        }
        return 1;
      })();

    setSelectedDayNum(targetDay);
    setDayBatchPage(Math.ceil(targetDay / DAY_BATCH_SIZE));
    loadDayIntoForm(prog, targetDay);
    setProgramDetailTab(tab);
    router.push(`/admin/programs/${prog.id}?tab=${tab}&day=${targetDay}`);
  };

  // Sync authoritative server state & URL route on every route load / refresh
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setPrograms(initialPrograms);
  }, [initialPrograms]);

  useEffect(() => {
    if (initialMasterData) {
      setMasterData(initialMasterData);
    }
  }, [initialMasterData]);

  useEffect(() => {
    if (!initialRoute) return;
    setActiveMenu(initialRoute.menu);
    setIsCreatingProgram(Boolean(initialRoute.isCreating));
    if (initialRoute.masterTab) {
      if ((initialRoute.masterTab as string) === "all") {
        setMasterTab("coaches");
      } else {
        setMasterTab(initialRoute.masterTab);
      }
    }
    if (initialRoute.menu === "programs" && initialRoute.programId) {
      const targetProg = initialPrograms.find((p) => p.id === initialRoute.programId);
      if (targetProg) {
        setSelectedProgramId(targetProg.id);
        loadMetaIntoForm(targetProg);
        const resolvedTab = initialRoute.programTab || "info";
        setProgramDetailTab(resolvedTab);
        if (resolvedTab === "responses") {
          loadProgramSubmissions(targetProg.id);
        }
        const resolvedDay =
          initialRoute.day ??
          (() => {
            for (let d = 1; d <= (targetProg.durationDays || 21); d++) {
              const found = targetProg.days.find((x) => x.dayNumber === d);
              if (!isDayFilled(found)) return d;
            }
            return 1;
          })();
        const clampedDay = Math.min(Math.max(1, resolvedDay), targetProg.durationDays || 21);
        setSelectedDayNum(clampedDay);
        setDayBatchPage(Math.ceil(clampedDay / DAY_BATCH_SIZE));
        loadDayIntoForm(targetProg, clampedDay);
      }
    } else if (initialRoute.menu !== "programs" || !initialRoute.programId) {
      setSelectedProgramId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialRoute?.menu,
    initialRoute?.programId,
    initialRoute?.isCreating,
    initialRoute?.programTab,
    initialRoute?.day,
    initialRoute?.masterTab,
  ]);

  const handleSelectDay = (prog: AdminProgram, dayNum: number) => {
    setSelectedDayNum(dayNum);
    setDayBatchPage(Math.ceil(dayNum / DAY_BATCH_SIZE));
    setFeedback(null);
    setAllDaySections(false);
    loadDayIntoForm(prog, dayNum);
    router.push(`/admin/programs/${prog.id}?tab=schedule&day=${dayNum}`);
  };

  const handleSaveDay = async (prog: AdminProgram, moveNext = false) => {
    setSavingDay(true);
    setFeedback(null);
    setDayError(null);

    try {
      const serializedVideos = serializeDayVideoLinks(dayForm.videoLinks);
      const serializedWorkouts = serializeWorkoutOptionGroups(dayForm.workoutGroups);

      const isConnect = dayForm.dayType === "CONNECTION_DAY" || dayForm.dayType === "MEETUP_DAY";

      const res = await wellnessAdminSaveProgramDay({
        programId: prog.id,
        dayNumber: selectedDayNum,
        title: dayForm.title,
        dayType: dayForm.dayType,
        workoutOptions:
          dayForm.dayType === "TRAINING_DAY" ? serializedWorkouts.workoutOptions : [],
        sleepRecommendation: dayForm.sleepRecommendation,
        dayNotifications: dayForm.dayNotifications,
        coachName: dayForm.dayType === "REST_DAY" ? "" : dayForm.coachName,
        recommendedFor: dayForm.dayType === "REST_DAY" ? "" : dayForm.recommendedFor,
        videoUrl: dayForm.dayType === "TRAINING_DAY" ? serializedVideos : "",
        videoChecklist:
          dayForm.dayType === "TRAINING_DAY"
            ? serializedWorkouts.videoChecklist
            : [],
        mealRecommendation: dayForm.mealRecommendation,
        dailyAssessment: dayForm.dailyAssessment,
        restInstructions:
          dayForm.dayType === "REST_DAY" ? dayForm.restInstructions : "",
        onsiteVenue: isConnect ? dayForm.onsiteVenue : "",
        onsiteSchedule: isConnect ? dayForm.onsiteSchedule : "",
        meetupLink: isConnect ? dayForm.meetupLink : "",
        mapLink: isConnect ? dayForm.mapLink : "",
        eventTitle: isConnect ? dayForm.eventTitle : "",
        eventHost: isConnect ? dayForm.eventHost : "",
        eventDetails: isConnect ? dayForm.eventDetails : "",
        pendingReminder: dayForm.pendingReminder,
        completedReminder: dayForm.completedReminder,
      });

      if (res.success && res.data) {
        setDayError(null);
        const savedDay = res.data as AdminProgramDay;
        const updatedPrograms = programs.map((p) => {
          if (p.id !== prog.id) return p;
          const otherDays = p.days.filter((d) => d.dayNumber !== selectedDayNum);
          const nextDays = [...otherDays, savedDay].sort(
            (a, b) => a.dayNumber - b.dayNumber
          );
          return {
            ...p,
            days: nextDays,
            dayCount: nextDays.length,
          };
        });
        setPrograms(updatedPrograms);
        const updatedProg = updatedPrograms.find((p) => p.id === prog.id)!;

        if (moveNext && selectedDayNum < updatedProg.durationDays) {
          const nextDay = selectedDayNum + 1;
          setSelectedDayNum(nextDay);
          setDayBatchPage(Math.ceil(nextDay / DAY_BATCH_SIZE));
          loadDayIntoForm(updatedProg, nextDay);
          setFeedback({
            type: "success",
            text: `Day ${selectedDayNum} saved. Moved to Day ${nextDay}.`,
          });
          router.push(`/admin/programs/${prog.id}?tab=schedule&day=${nextDay}`);
        } else {
          setFeedback({
            type: "success",
            text: `Day ${selectedDayNum} saved.`,
          });
          router.refresh();
        }
      } else {
        const errMsg = res.message || "Unable to save day curriculum.";
        setDayError(errMsg);
        setFeedback({
          type: "error",
          text: errMsg,
        });
      }
    } catch {
      const netErr = "Network error while saving day curriculum.";
      setDayError(netErr);
      setFeedback({
        type: "error",
        text: netErr,
      });
    } finally {
      setSavingDay(false);
    }
  };

  const handleClearDay = async (prog: AdminProgram) => {
    setSavingDay(true);
    setFeedback(null);
    try {
      const res = await wellnessAdminDeleteProgramDay(prog.id, selectedDayNum);
      if (res.success) {
        const updatedPrograms = programs.map((p) => {
          if (p.id !== prog.id) return p;
          const nextDays = p.days.filter((d) => d.dayNumber !== selectedDayNum);
          return {
            ...p,
            days: nextDays,
            dayCount: nextDays.length,
            isPublished: false,
          };
        });
        setPrograms(updatedPrograms);
        const updatedProg = updatedPrograms.find((p) => p.id === prog.id)!;
        loadDayIntoForm(updatedProg, selectedDayNum);
        setFeedback({
          type: "success",
          text: `Day ${selectedDayNum} cleared. Program moved to Draft.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to clear day.",
        });
      }
    } finally {
      setSavingDay(false);
    }
  };

  const handleSaveMeta = async (prog: AdminProgram) => {
    setSavingMeta(true);
    setFeedback(null);
    setMetaError(null);
    try {
      const calculatedFinalPrice = Math.max(
        0,
        Math.round((Number(metaForm.actualPrice) || 0) * (1 - (Number(metaForm.discountPercentage) || 0) / 100))
      );

      const cleanedChapters = (metaForm.termsChapters || [])
        .map((c) => ({
          chapter: c.chapter.trim(),
          clauses: (c.clauses || []).map((cl) => cl.trim()).filter((cl) => cl.length > 0),
        }))
        .filter((c) => c.chapter.length > 0 || c.clauses.length > 0);

      const finalChapters =
        cleanedChapters.length > 0
          ? cleanedChapters
          : DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
              chapter: c.chapter,
              clauses: [...c.clauses],
            }));

      const serializedCustomTerms = serializeTermsChapters(finalChapters);
      const finalTermsList = finalChapters.flatMap((c) => c.clauses);

      const isOnline = metaForm.locationType === "ONLINE";
      const resolvedCity = isOnline ? "Online" : metaForm.city.trim() || undefined;
      const resolvedVenue = isOnline ? undefined : metaForm.venueAddress.trim() || undefined;

      const cleanedBenefits = (metaForm.expectedBenefits || [])
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
      const finalBenefits =
        cleanedBenefits.length > 0 ? cleanedBenefits : [...DEFAULT_PROGRAM_BENEFITS];

      const cleanedRefs = (metaForm.scientificReferences || [])
        .map((r) => ({ title: r.title.trim(), url: r.url?.trim() || "" }))
        .filter((r) => r.title.length > 0);
      const finalRefs =
        cleanedRefs.length > 0 ? cleanedRefs : DEFAULT_PROGRAM_REFERENCES.map((r) => ({ ...r }));

      const cleanedGuidelines = (metaForm.programGuidelines || [])
        .map((g) => g.trim())
        .filter((g) => g.length > 0);
      const finalGuidelines =
        cleanedGuidelines.length > 0 ? cleanedGuidelines : [...DEFAULT_PROGRAM_GUIDELINES];

      const res = await wellnessAdminUpdateProgramMeta({
        programId: prog.id,
        title: metaForm.title.trim(),
        description: metaForm.description.trim(),
        targetState: metaForm.targetState.trim() || DEFAULT_TARGET_STATE,
        methodology: metaForm.methodology.trim() || DEFAULT_METHODOLOGY,
        expectedBenefits: finalBenefits,
        scientificReferences: finalRefs,
        programGuidelines: finalGuidelines,
        coverImage: metaForm.coverImage?.trim() || undefined,
        difficultyLevel: metaForm.difficultyLevel,
        category: metaForm.category.trim(),
        equipment: metaForm.equipment?.trim() || undefined,
        dailyCommitment: metaForm.dailyCommitment?.trim() || undefined,
        coachName: metaForm.coachName.trim(),
        coachTitle: metaForm.coachTitle?.trim() || undefined,
        recommendedFor: metaForm.recommendedFor.trim(),
        durationDays: Number(metaForm.durationDays) || 7,
        actualPrice: Number(metaForm.actualPrice) || 0,
        discountPercentage: Number(metaForm.discountPercentage) || 0,
        price: calculatedFinalPrice,
        maxQuota: Number(metaForm.maxQuota) || 35,
        communityLink: metaForm.communityLink?.trim() || undefined,
        locationType: metaForm.locationType,
        city: resolvedCity,
        venueAddress: resolvedVenue,
        virtualFallbackAvailable: metaForm.virtualFallbackAvailable,
        termsType: "CUSTOM",
        customTerms: serializedCustomTerms,
        termsList: finalTermsList,
        startDate: new Date(metaForm.startDate),
        endDate: new Date(metaForm.endDate),
        registrationOpenDate: metaForm.registrationOpenDate
          ? new Date(metaForm.registrationOpenDate)
          : null,
        registrationDeadline: new Date(metaForm.registrationDeadline),
        status: metaForm.status,
      });

      if (res.success) {
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === prog.id
              ? {
                  ...p,
                  title: metaForm.title,
                  description: metaForm.description,
                  targetState: metaForm.targetState.trim() || DEFAULT_TARGET_STATE,
                  methodology: metaForm.methodology.trim() || DEFAULT_METHODOLOGY,
                  expectedBenefits: finalBenefits,
                  scientificReferences: finalRefs,
                  programGuidelines: finalGuidelines,
                  coverImage: metaForm.coverImage?.trim() || null,
                  difficultyLevel: metaForm.difficultyLevel,
                  category: metaForm.category,
                  equipment: metaForm.equipment?.trim() || null,
                  dailyCommitment: metaForm.dailyCommitment?.trim() || null,
                  coachName: metaForm.coachName,
                  coachTitle: metaForm.coachTitle || null,
                  recommendedFor: metaForm.recommendedFor,
                  durationDays: Number(metaForm.durationDays) || 7,
                  actualPrice: Number(metaForm.actualPrice) || 0,
                  discountPercentage: Number(metaForm.discountPercentage) || 0,
                  price: calculatedFinalPrice,
                  maxQuota: Number(metaForm.maxQuota) || 35,
                  communityLink: metaForm.communityLink || null,
                  locationType: metaForm.locationType,
                  city: isOnline ? "Online" : metaForm.city.trim() || null,
                  venueAddress: isOnline ? null : metaForm.venueAddress.trim() || null,
                  virtualFallbackAvailable: metaForm.virtualFallbackAvailable,
                  termsType: "CUSTOM",
                  customTerms: serializedCustomTerms,
                  termsList: finalTermsList,
                  startDate: metaForm.startDate,
                  endDate: metaForm.endDate,
                  registrationOpenDate: metaForm.registrationOpenDate || null,
                  registrationDeadline: metaForm.registrationDeadline,
                  status: metaForm.status,
                  // If days were truncated because duration was reduced:
                  days: p.days.filter((d) => d.dayNumber <= (Number(metaForm.durationDays) || 7)),
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          text: `Header information updated for "${metaForm.title}".`,
        });
        setMetaError(null);
        router.refresh();
      } else {
        const errMsg = res.message || "Unable to update program info.";
        setMetaError(errMsg);
        setFeedback({
          type: "error",
          text: errMsg,
        });
      }
    } catch {
      const netErr = "Network error while updating program info.";
      setMetaError(netErr);
      setFeedback({
        type: "error",
        text: netErr,
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCreateProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError("Please enter a Program Title.");
      return;
    }

    setCreatingLoading(true);
    setCreateError(null);

    const calculatedFinalPrice = Math.max(
      0,
      Math.round((Number(createForm.actualPrice) || 0) * (1 - (Number(createForm.discountPercentage) || 0) / 100))
    );

    const cleanedCreateBenefits = (createForm.expectedBenefits || [])
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    const cleanedCreateRefs = (createForm.scientificReferences || [])
      .map((r) => ({ title: r.title.trim(), url: r.url?.trim() || "" }))
      .filter((r) => r.title.length > 0);
    const cleanedCreateGuidelines = (createForm.programGuidelines || [])
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    const cleanedCreateChapters = (createForm.termsChapters || [])
      .map((c) => ({
        chapter: c.chapter.trim(),
        clauses: (c.clauses || []).map((cl) => cl.trim()).filter((cl) => cl.length > 0),
      }))
      .filter((c) => c.chapter.length > 0 || c.clauses.length > 0);

    const finalCreateChapters =
      cleanedCreateChapters.length > 0
        ? cleanedCreateChapters
        : DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
            chapter: c.chapter,
            clauses: [...c.clauses],
          }));

    const serializedCreateTerms = serializeTermsChapters(finalCreateChapters);
    const finalCreateTerms = finalCreateChapters.flatMap((c) => c.clauses);

    const isCreateOnline = createForm.locationType === "ONLINE";
    const resolvedCreateCity = isCreateOnline ? "Online" : createForm.city.trim() || "Jakarta";
    const resolvedCreateVenue = isCreateOnline ? undefined : createForm.venueAddress.trim() || undefined;

    try {
      const res = await wellnessAdminCreateProgram({
        title: createForm.title.trim(),
        description: createForm.description.trim() || "Program description will be configured soon.",
        targetState: createForm.targetState.trim() || "",
        methodology: createForm.methodology.trim() || "",
        expectedBenefits: cleanedCreateBenefits,
        scientificReferences: cleanedCreateRefs,
        programGuidelines: cleanedCreateGuidelines,
        coverImage: createForm.coverImage?.trim() || undefined,
        difficultyLevel: createForm.difficultyLevel || "INTERMEDIATE",
        category: createForm.category?.trim() || "Pilates",
        equipment: createForm.equipment?.trim() || undefined,
        dailyCommitment: createForm.dailyCommitment?.trim() || undefined,
        coachName: createForm.coachName.trim() || "TBA",
        coachTitle: createForm.coachTitle?.trim() || undefined,
        recommendedFor: createForm.recommendedFor.trim() || "All Levels",
        durationDays: Number(createForm.durationDays) || 21,
        actualPrice: Number(createForm.actualPrice) || 0,
        discountPercentage: Number(createForm.discountPercentage) || 0,
        price: calculatedFinalPrice,
        maxQuota: Number(createForm.maxQuota) || 35,
        communityLink: createForm.communityLink.trim() || undefined,
        locationType: createForm.locationType || "ONLINE",
        city: resolvedCreateCity,
        venueAddress: resolvedCreateVenue,
        virtualFallbackAvailable: createForm.virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: serializedCreateTerms,
        termsList: finalCreateTerms,
        startDate: createForm.startDate ? new Date(createForm.startDate) : undefined,
        endDate: createForm.endDate ? new Date(createForm.endDate) : undefined,
        registrationOpenDate: createForm.registrationOpenDate
          ? new Date(createForm.registrationOpenDate)
          : null,
        registrationDeadline: createForm.registrationDeadline
          ? new Date(createForm.registrationDeadline)
          : undefined,
        status: "DRAFT",
        isPublished: false,
        days: [],
      });

      if (res.success && res.data) {
        const created = res.data as any;

        const formattedNewProgram: AdminProgram = {
          id: created.id,
          title: created.title,
          slug: created.slug,
          description: created.description,
          targetState: createForm.targetState.trim(),
          methodology: createForm.methodology.trim(),
          expectedBenefits: cleanedCreateBenefits,
          scientificReferences: cleanedCreateRefs,
          programGuidelines: cleanedCreateGuidelines,
          coverImage: created.coverImage || createForm.coverImage || null,
          difficultyLevel: created.difficultyLevel || createForm.difficultyLevel || "INTERMEDIATE",
          category: created.category || createForm.category,
          equipment: created.equipment || createForm.equipment || null,
          dailyCommitment: created.dailyCommitment || createForm.dailyCommitment || null,
          recommendedFor: created.recommendedFor,
          coachName: created.coachName,
          coachTitle: created.coachTitle || createForm.coachTitle,
          durationDays: created.durationDays,
          actualPrice: created.actualPrice ?? createForm.actualPrice,
          discountPercentage: created.discountPercentage ?? createForm.discountPercentage,
          price: created.price ?? calculatedFinalPrice,
          maxQuota: created.maxQuota,
          communityLink: created.communityLink,
          locationType: created.locationType || createForm.locationType,
          city: isCreateOnline ? "Online" : (created.city || createForm.city || null),
          venueAddress: isCreateOnline ? null : (created.venueAddress || createForm.venueAddress || null),
          virtualFallbackAvailable: created.virtualFallbackAvailable ?? createForm.virtualFallbackAvailable,
          termsType: "CUSTOM",
          customTerms: serializedCreateTerms,
          termsList: finalCreateTerms,
          startDate: created.startDate,
          endDate: created.endDate,
          registrationOpenDate: created.registrationOpenDate || null,
          registrationDeadline: created.registrationDeadline,
          status: "DRAFT",
          isPublished: false,
          dayCount: 0,
          activeSubscribers: 0,
          pendingSubscribers: 0,
          days: [],
        };

        setPrograms((prev) => [formattedNewProgram, ...prev]);
        resetCreateForm();
        setIsCreatingProgram(false);
        openProgramDetail(formattedNewProgram, 1);
        setFeedback({
          type: "success",
          text: `Draft program "${formattedNewProgram.title}" created. You can now build daily routines or publish when ready.`,
        });
        router.refresh();
      } else {
        setCreateError(res.message || "Failed to create program.");
      }
    } catch {
      setCreateError("An unexpected error occurred while creating program.");
    } finally {
      setCreatingLoading(false);
    }
  };

  // Master Data action handlers
  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName.trim() || !newCoachTitle.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessCreateMasterCoach({
        name: newCoachName.trim(),
        title: newCoachTitle.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          coaches: [...prev.coaches, res.data as any],
        }));
        setNewCoachName("");
        setNewCoachTitle("");
        setFeedback({ type: "success", text: `Coach added to master records.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add coach." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleDeleteCoach = async (id: string, name: string) => {
    if (!confirm(`Delete coach "${name}" from master records?`)) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessDeleteMasterCoach(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          coaches: prev.coaches.filter((c) => c.id !== id),
        }));
        setFeedback({ type: "success", text: `Coach "${name}" deleted.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete coach." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleAddAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudienceName.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessCreateMasterTargetAudience(newAudienceName.trim());
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          targetAudiences: [...prev.targetAudiences, res.data as any],
        }));
        setNewAudienceName("");
        setFeedback({ type: "success", text: `Target audience added.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add target audience." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleDeleteAudience = async (id: string, name: string) => {
    setMasterActionLoading(true);
    try {
      const res = await wellnessDeleteMasterTargetAudience(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          targetAudiences: prev.targetAudiences.filter((a) => a.id !== id),
        }));
        setFeedback({ type: "success", text: `Target audience "${name}" removed.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete audience." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessCreateMasterCategory(newCategoryName.trim());
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          categories: [...prev.categories, res.data as any],
        }));
        setNewCategoryName("");
        setFeedback({ type: "success", text: `Category added.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add category." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setMasterActionLoading(true);
    try {
      const res = await wellnessDeleteMasterCategory(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== id),
        }));
        setFeedback({ type: "success", text: `Category "${name}" removed.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete category." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleUpdateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach || !editingCoach.name.trim() || !editingCoach.title.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessUpdateMasterCoach({
        id: editingCoach.id,
        name: editingCoach.name.trim(),
        title: editingCoach.title.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          coaches: prev.coaches.map((c) =>
            c.id === editingCoach.id ? (res.data as any) : c
          ),
        }));
        setEditingCoach(null);
        setFeedback({ type: "success", text: `Coach updated.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update coach." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleUpdateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAudience || !editingAudience.name.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessUpdateMasterTargetAudience({
        id: editingAudience.id,
        name: editingAudience.name.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          targetAudiences: prev.targetAudiences.map((a) =>
            a.id === editingAudience.id ? (res.data as any) : a
          ),
        }));
        setEditingAudience(null);
        setFeedback({ type: "success", text: `Target audience updated.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update target audience." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessUpdateMasterCategory({
        id: editingCategory.id,
        name: editingCategory.name.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === editingCategory.id ? (res.data as any) : c
          ),
        }));
        setEditingCategory(null);
        setFeedback({ type: "success", text: `Category updated.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update category." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentName.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessCreateMasterEquipment(newEquipmentName.trim());
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          equipment: [...(prev.equipment || []), res.data as any],
        }));
        setNewEquipmentName("");
        setFeedback({ type: "success", text: `Equipment item added.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add equipment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleDeleteEquipment = async (id: string, name: string) => {
    if (!confirm(`Delete equipment "${name}" from master records?`)) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessDeleteMasterEquipment(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          equipment: (prev.equipment || []).filter((e) => e.id !== id),
        }));
        setFeedback({ type: "success", text: `Equipment "${name}" removed.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete equipment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment || !editingEquipment.name.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessUpdateMasterEquipment({
        id: editingEquipment.id,
        name: editingEquipment.name.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          equipment: (prev.equipment || []).map((e) =>
            e.id === editingEquipment.id ? (res.data as any) : e
          ),
        }));
        setEditingEquipment(null);
        setFeedback({ type: "success", text: `Equipment updated.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update equipment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleAddCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentName.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessCreateMasterDailyCommitment(newCommitmentName.trim());
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          dailyCommitments: [...(prev.dailyCommitments || []), res.data as any],
        }));
        setNewCommitmentName("");
        setFeedback({ type: "success", text: `Daily commitment option added.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to add commitment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleDeleteCommitment = async (id: string, name: string) => {
    if (!confirm(`Delete daily commitment "${name}" from master records?`)) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessDeleteMasterDailyCommitment(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          dailyCommitments: (prev.dailyCommitments || []).filter((c) => c.id !== id),
        }));
        setFeedback({ type: "success", text: `Daily commitment "${name}" removed.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete commitment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleUpdateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommitment || !editingCommitment.name.trim()) return;
    setMasterActionLoading(true);
    try {
      const res = await wellnessUpdateMasterDailyCommitment({
        id: editingCommitment.id,
        name: editingCommitment.name.trim(),
      });
      if (res.success && res.data) {
        setMasterData((prev) => ({
          ...prev,
          dailyCommitments: (prev.dailyCommitments || []).map((c) =>
            c.id === editingCommitment.id ? (res.data as any) : c
          ),
        }));
        setEditingCommitment(null);
        setFeedback({ type: "success", text: `Daily commitment updated.` });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update commitment." });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const validateProgramForPublish = (prog: AdminProgram) => {
    const missingDays: number[] = [];
    const targetDays = prog.durationDays || 21;
    for (let d = 1; d <= targetDays; d++) {
      const found = prog.days.find((x) => x.dayNumber === d);
      if (!isDayFilled(found)) {
        missingDays.push(d);
      }
    }

    const errors: string[] = [];

    // Dual-Gate Gate 1: Comprehensive Program Header verification (all 8 points)
    const headerCheck = isProgramHeaderComplete({
      title: prog.title,
      description: prog.description,
      difficultyLevel: prog.difficultyLevel,
      targetState: prog.targetState,
      methodology: prog.methodology,
      expectedBenefits: prog.expectedBenefits,
      category: prog.category,
      dailyCommitment: prog.dailyCommitment,
      coachName: prog.coachName,
      recommendedFor: prog.recommendedFor,
      startDate: prog.startDate,
      endDate: prog.endDate,
      registrationDeadline: prog.registrationDeadline,
      locationType: prog.locationType,
      city: prog.city,
      venueAddress: prog.venueAddress,
      maxQuota: prog.maxQuota,
      price: prog.price,
      communityLink: prog.communityLink,
      termsList: prog.termsList,
      customTerms: prog.customTerms,
    });

    if (!headerCheck.isComplete) {
      headerCheck.missingSections.forEach((s) => {
        errors.push(`Header Point ${s.point} (${s.title}): ${s.reason}`);
      });
    }

    // Dual-Gate Gate 2: Full Curriculum Days completeness
    if (missingDays.length > 0) {
      errors.push(
        `Curriculum Incomplete: ${missingDays.length} out of ${targetDays} days are missing required routines (Day ${missingDays.slice(0, 7).join(", ")}${missingDays.length > 7 ? "..." : ""}).`
      );
    }

    return {
      valid: errors.length === 0,
      missingDays,
      errors,
    };
  };

  const handleInitiatePublish = (prog: AdminProgram) => {
    if (prog.isPublished) {
      // Unpublishing: allow direct toggle back to Draft so it can be revised
      handleTogglePublish(prog, false);
      return;
    }

    // Strict validation
    const validation = validateProgramForPublish(prog);
    if (!validation.valid) {
      setPublishModal({
        isOpen: true,
        mode: "ERROR",
        missingDays: validation.missingDays,
        errorList: validation.errors,
      });
      return;
    }

    // Passed validation: prompt confirmation guard
    setPublishModal({
      isOpen: true,
      mode: "CONFIRM",
    });
  };

  const handleTogglePublish = async (
    prog: AdminProgram,
    nextPublishState?: boolean
  ) => {
    const shouldPublish = nextPublishState ?? !prog.isPublished;
    setPublishingId(prog.id);
    setFeedback(null);
    try {
      const res = await wellnessAdminTogglePublishProgram(
        prog.id,
        shouldPublish
      );
      if (res.success && res.data) {
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === prog.id
              ? { ...p, isPublished: res.data!.isPublished, status: res.data!.status }
              : p
          )
        );
        setPublishModal(null);
        setFeedback({
          type: "success",
          text: shouldPublish
            ? `Program "${prog.title}" is now published and live on catalog!`
            : `Program "${prog.title}" has been moved back to Draft.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update publication status.",
        });
      }
    } finally {
      setPublishingId(null);
    }
  };

  const handleSetProgramStatus = async (
    progId: string,
    newStatus: ProgramDatabaseStatus
  ) => {
    setPublishingId(progId);
    setFeedback(null);
    try {
      const res = await wellnessAdminSetProgramStatus(progId, newStatus);
      if (res.success && res.data) {
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === progId
              ? {
                  ...p,
                  status: res.data!.status,
                  isPublished: res.data!.isPublished,
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          text: res.message || "Program status successfully updated.",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update program status.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "An unexpected system error occurred while updating status.",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteProgram = async (prog: AdminProgram) => {
    setDeletingProgId(prog.id);
    try {
      const res = await wellnessAdminDeleteProgram(prog.id);
      if (res.success) {
        setPrograms((prev) => prev.filter((p) => p.id !== prog.id));
        if (selectedProgramId === prog.id) {
          setSelectedProgramId(null);
        }
        router.push("/admin/programs");
      }
    } finally {
      setDeletingProgId(null);
    }
  };

  const handleApprovePayment = async (enrollmentId: string) => {
    setApprovingId(enrollmentId);
    try {
      const res = await wellnessAdminApprovePayment(enrollmentId);
      if (res.success) {
        let approvedProgId: string | null = null;
        setUsers((prev) =>
          prev.map((u) => ({
            ...u,
            enrollments: u.enrollments.map((e) => {
              if (e.id === enrollmentId) {
                approvedProgId = e.program.id;
                return { ...e, status: "ACTIVE" };
              }
              return e;
            }),
          }))
        );

        if (approvedProgId) {
          setPrograms((prev) =>
            prev.map((p) =>
              p.id === approvedProgId
                ? {
                    ...p,
                    activeSubscribers: p.activeSubscribers + 1,
                    pendingSubscribers: Math.max(0, p.pendingSubscribers - 1),
                  }
                : p
            )
          );
        }

        setFeedback({
          type: "success",
          text: res.message || "Payment verified and activated.",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to approve payment.",
        });
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleToggleUserRole = async (user: AdminUserItem) => {
    setUserActionLoading(user.id);
    try {
      const nextRole = user.role === "SUPERADMIN" ? "USER" : "SUPERADMIN";
      const res = await wellnessAdminUpdateUserRole(user.id, nextRole);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
        );
        setFeedback({
          type: "success",
          text: res.message || `Role updated to ${nextRole}.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update role.",
        });
      }
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${user.fullName} (${user.email})? This action cannot be undone.`
      )
    ) {
      return;
    }
    setUserActionLoading(user.id);
    try {
      const res = await wellnessAdminDeleteUser(user.id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setFeedback({
          type: "success",
          text: res.message || `Account ${user.fullName} deleted.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to delete account.",
        });
      }
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    setUserActionLoading(user.id);
    try {
      const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const res = await wellnessAdminUpdateUserStatus(user.id, nextStatus);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
        router.refresh();
      }
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleResetPassword = async (user: AdminUserItem) => {
    setUserActionLoading(user.id);
    try {
      const res = await wellnessAdminResetUserPassword(user.id);
      if (res.success && res.data) {
        setFeedback({
          type: "success",
          text: `Temporary password for ${user.fullName}: ${res.data.temporaryPassword}`,
        });
      }
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await wellnessSignOut();
    router.push("/");
    router.refresh();
  };

  const pendingEnrollments = users.flatMap((u) =>
    u.enrollments
      .filter((e) => e.status === "PENDING")
      .map((e) => ({
        id: e.id,
        userFullName: u.fullName,
        userEmail: u.email,
        userPhone: u.phone,
        programTitle: e.program.title,
        amountPaid: e.program.price,
        paymentRef: e.paymentReference,
      }))
  );

  const liveProgramsCount = programs.filter((p) => p.isPublished).length;
  const draftProgramsCount = programs.length - liveProgramsCount;

  const approvedEnrollments = users.flatMap((u) =>
    u.enrollments.filter((e) => e.status === "ACTIVE")
  );

  const approvedRevenue = approvedEnrollments.reduce(
    (sum, e) => sum + (e.program.price || 0),
    0
  );

  const pendingRevenue = pendingEnrollments.reduce(
    (sum, e) => sum + (e.amountPaid || 0),
    0
  );

  const curriculumReadyCount = programs.filter((p) => {
    const targetDays = p.durationDays || 21;
    let filled = 0;
    for (let d = 1; d <= targetDays; d++) {
      const dayObj = p.days.find((x) => x.dayNumber === d);
      if (isDayFilled(dayObj)) filled++;
    }
    return filled >= targetDays;
  }).length;

  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsersCount = users.filter((u) => u.status === "SUSPENDED").length;
  const enrolledUsersCount = users.filter((u) => u.enrollments.length > 0).length;

  const totalProgramsMemoryBytes = programs.reduce(
    (acc, p) => acc + calculateProgramMemoryFootprint(p).bytes,
    0
  );

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.coachName.toLowerCase().includes(programSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (programFilter !== "ALL") {
      const normStatus = normalizeProgramStatus(p.status);
      if (programFilter === "REVIEW") {
        if (normStatus === "REVIEW" || normStatus === "OPEN") return true;
        let filled = 0;
        const dur = p.durationDays || 21;
        for (let d = 1; d <= dur; d++) {
          if (isDayFilled(p.days?.find((x) => x.dayNumber === d))) filled++;
        }
        if (!p.isPublished && filled === dur) {
          const hc = isProgramHeaderComplete({
            title: p.title,
            description: p.description,
            difficultyLevel: p.difficultyLevel,
            targetState: p.targetState,
            methodology: p.methodology,
            expectedBenefits: p.expectedBenefits,
            category: p.category,
            dailyCommitment: p.dailyCommitment,
            coachName: p.coachName,
            recommendedFor: p.recommendedFor,
            startDate: p.startDate,
            endDate: p.endDate,
            registrationDeadline: p.registrationDeadline,
            locationType: p.locationType,
            city: p.city,
            venueAddress: p.venueAddress,
            maxQuota: p.maxQuota,
            price: p.price,
            communityLink: p.communityLink,
            termsList: p.termsList,
            customTerms: p.customTerms,
          });
          if (hc.isComplete) return true;
        }
        return false;
      }
      if (normStatus !== programFilter) return false;
    }

    return true;
  });

  // Sort programs
  filteredPrograms.sort((a, b) => {
    switch (programSort) {
      case "NEWEST": {
        const timeA = new Date(a.startDate || 0).getTime();
        const timeB = new Date(b.startDate || 0).getTime();
        return timeB - timeA;
      }
      case "OLDEST": {
        const timeA = new Date(a.startDate || 0).getTime();
        const timeB = new Date(b.startDate || 0).getTime();
        return timeA - timeB;
      }
      case "TITLE_ASC":
        return a.title.localeCompare(b.title);
      case "TITLE_DESC":
        return b.title.localeCompare(a.title);
      case "MEMORY_DESC": {
        const memA = calculateProgramMemoryFootprint(a).bytes;
        const memB = calculateProgramMemoryFootprint(b).bytes;
        return memB - memA;
      }
      case "MEMORY_ASC": {
        const memA = calculateProgramMemoryFootprint(a).bytes;
        const memB = calculateProgramMemoryFootprint(b).bytes;
        return memA - memB;
      }
      case "PRICE_DESC":
        return b.price - a.price;
      case "PRICE_ASC":
        return a.price - b.price;
      default:
        return 0;
    }
  });

  const totalProgramPages = Math.max(
    1,
    Math.ceil(filteredPrograms.length / PROGRAM_PAGE_SIZE)
  );
  const safeProgramPage = Math.min(programPage, totalProgramPages);
  const paginatedPrograms = filteredPrograms.slice(
    (safeProgramPage - 1) * PROGRAM_PAGE_SIZE,
    safeProgramPage * PROGRAM_PAGE_SIZE
  );

  const filteredMembers = users
    .filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.phone || "").toLowerCase().includes(memberSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (memberFilter === "ACTIVE") {
        return m.status === "ACTIVE";
      }
      if (memberFilter === "PENDING") {
        return m.enrollments.some((e) => e.status === "PENDING");
      }
      if (memberFilter === "SUSPENDED") {
        return m.status === "SUSPENDED";
      }
      if (memberFilter === "SUPERADMIN") {
        return m.role === "SUPERADMIN";
      }
      return true;
    })
    .sort((a, b) => {
      if (memberSort === "NEWEST") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (memberSort === "OLDEST") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (memberSort === "NAME_ASC") {
        return a.fullName.localeCompare(b.fullName);
      }
      if (memberSort === "NAME_DESC") {
        return b.fullName.localeCompare(a.fullName);
      }
      if (memberSort === "ENROLLMENTS_DESC") {
        return b.enrollments.length - a.enrollments.length;
      }
      return 0;
    });
  const totalMemberPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE)
  );
  const safeMemberPage = Math.min(memberPage, totalMemberPages);
  const paginatedMembers = filteredMembers.slice(
    (safeMemberPage - 1) * MEMBER_PAGE_SIZE,
    safeMemberPage * MEMBER_PAGE_SIZE
  );

  const filteredQris = pendingEnrollments.filter(
    (q) =>
      q.userFullName.toLowerCase().includes(qrisSearch.toLowerCase()) ||
      q.userEmail.toLowerCase().includes(qrisSearch.toLowerCase()) ||
      q.programTitle.toLowerCase().includes(qrisSearch.toLowerCase())
  );
  const totalQrisPages = Math.max(
    1,
    Math.ceil(filteredQris.length / QRIS_PAGE_SIZE)
  );
  const safeQrisPage = Math.min(qrisPage, totalQrisPages);
  const paginatedQris = filteredQris.slice(
    (safeQrisPage - 1) * QRIS_PAGE_SIZE,
    safeQrisPage * QRIS_PAGE_SIZE
  );

  // Dynamic Breadcrumb Trail for every admin view & sub-page
  const breadcrumbItems: { label: string; onClick?: () => void; isCurrent?: boolean }[] = [
    {
      label: "Admin",
      onClick: () => {
        setActiveMenu("dashboard");
        setSelectedProgramId(null);
        setIsCreatingProgram(false);
        setInspectingUserHealth(null);
        router.push("/admin");
      },
    },
  ];

  if (activeMenu === "dashboard") {
    breadcrumbItems.push({ label: "Dashboard", isCurrent: true });
  } else if (activeMenu === "programs") {
    breadcrumbItems.push({
      label: "Programs",
      onClick:
        isCreatingProgram || Boolean(selectedProgram)
          ? () => {
              setSelectedProgramId(null);
              setIsCreatingProgram(false);
              router.push("/admin/programs");
            }
          : undefined,
      isCurrent: !isCreatingProgram && !selectedProgram,
    });

    if (isCreatingProgram) {
      breadcrumbItems.push({ label: "Create New Program", isCurrent: true });
    } else if (selectedProgram) {
      breadcrumbItems.push({
        label: selectedProgram.title,
        onClick:
          programDetailTab !== "schedule"
            ? () => setProgramDetailTab("schedule")
            : undefined,
        isCurrent: false,
      });
      breadcrumbItems.push({
        label:
          programDetailTab === "schedule"
            ? "Curriculum Schedule"
            : programDetailTab === "info"
            ? "Program Settings"
            : "Survey Responses",
        isCurrent: true,
      });
    }
  } else if (activeMenu === "master") {
    breadcrumbItems.push({
      label: "Directories",
      onClick: () => {
        setMasterTab("coaches");
        router.push("/admin/directories?tab=coaches");
      },
      isCurrent: false,
    });

    const activeDirectoryLabel =
      masterTab === "coaches"
        ? "Coaches"
        : masterTab === "audience"
        ? "Target Audience"
        : masterTab === "categories"
        ? "Categories"
        : masterTab === "equipment"
        ? "Equipment"
        : "Daily Commitments";

    breadcrumbItems.push({
      label: activeDirectoryLabel,
      isCurrent: true,
    });
  } else if (activeMenu === "members") {
    breadcrumbItems.push({
      label: "Customers",
      onClick: inspectingUserHealth
        ? () => closeCustomerDetail()
        : undefined,
      isCurrent: !inspectingUserHealth,
    });

    if (inspectingUserHealth) {
      breadcrumbItems.push({
        label: inspectingUserHealth.fullName,
        onClick:
          customerModalTab !== "overview"
            ? () => switchCustomerTab("overview")
            : undefined,
        isCurrent: customerModalTab === "overview",
      });
      if (customerModalTab !== "overview") {
        const tabLabels: Record<string, string> = {
          responses: "Daily Responses",
          health: "Health & Medical",
          medical: "Health & Medical",
          lifestyle: "Health & Medical",
          notes: "Coach Notes",
        };
        breadcrumbItems.push({
          label: tabLabels[customerModalTab] || "Detail",
          isCurrent: true,
        });
      }
    }
  } else if (activeMenu === "payments") {
    breadcrumbItems.push({ label: "Payments", isCurrent: true });
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-xs font-sans selection:bg-zinc-800 selection:text-white bg-zinc-100/70 dark:bg-zinc-950">
      {/* ================================================================= */}
      {/* STICKY MINIMALIST SIDEBAR                                         */}
      {/* ================================================================= */}
      <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-white/10 flex flex-col justify-between p-6 z-30">
        <div className="space-y-7">
          {/* Brand Header */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <Link href="/" className="group inline-block">
                  <h1 className="flex items-center gap-1.5 font-mono font-light text-base text-zinc-900 dark:text-white leading-none">
                    <span>+</span>
                    <span className="font-geometric font-light text-xs tracking-[0.28em] uppercase">BMS</span>
                  </h1>
                </Link>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-normal">
                  {currentAdmin?.fullName || "Sanctuary Admin"}
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Default Time, Date & Location Reference Card */}
            <SidebarDefaultDateTimeWidget />
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveMenu("dashboard");
                setSelectedProgramId(null);
                setIsCreatingProgram(false);
                setFeedback(null);
                router.push("/admin");
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeMenu === "dashboard"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMenu("programs");
                setSelectedProgramId(null);
                setIsCreatingProgram(false);
                setFeedback(null);
                router.push("/admin/programs");
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeMenu === "programs"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Programs</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMenu("master");
                setMasterTab("coaches");
                setSelectedProgramId(null);
                setIsCreatingProgram(false);
                setFeedback(null);
                router.push("/admin/directories?tab=coaches");
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeMenu === "master"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 shrink-0" />
                <span>Directories</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMenu("members");
                setSelectedProgramId(null);
                setIsCreatingProgram(false);
                setInspectingUserHealth(null);
                setFeedback(null);
                router.push("/admin/customers");
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeMenu === "members"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>Customers</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMenu("payments");
                setSelectedProgramId(null);
                setIsCreatingProgram(false);
                setFeedback(null);
                router.push("/admin/payments");
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                activeMenu === "payments"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 shrink-0" />
                <span>Payments</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 space-y-1">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Public Website</span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          </Link>

          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Member View</span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN WORKSPACE                                                    */}
      {/* ================================================================= */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
        {/* MINIMALIST BREADCRUMB TRAIL */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-zinc-500 dark:text-zinc-400 -mt-2">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-zinc-300 dark:text-zinc-700 select-none">/</span>
                )}
                {isLast ? (
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    disabled={!item.onClick}
                    className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors disabled:pointer-events-none"
                  >
                    {item.label}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* CONTEXTUAL TOP WIDGETS (Compact 4-column strip, only shown on primary menu views) */}
        {!(activeMenu === "programs" && (isCreatingProgram || Boolean(selectedProgram))) && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {activeMenu === "dashboard" && (
            <>
              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Total Programs
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {programs.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Total Customers
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {users.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Pending Approvals
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {pendingEnrollments.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Verified Revenue
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono mt-0.5 truncate">
                  Rp {approvedRevenue.toLocaleString("id-ID")}
                </div>
              </div>
            </>
          )}

          {activeMenu === "programs" && (
            <>
              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Total Programs
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {programs.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Published Programs
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {liveProgramsCount}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Draft Programs
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {draftProgramsCount}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                    Total Memory Footprint
                  </span>
                  <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight font-mono text-zinc-900 dark:text-white mt-0.5 truncate">
                  {formatByteSize(totalProgramsMemoryBytes)}
                </div>
              </div>
            </>
          )}

          {activeMenu === "master" && (
            <>
              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Master Coaches
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {masterData.coaches.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Target Audiences
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {masterData.targetAudiences.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Categories
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {masterData.categories.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Active Programs
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {programs.length}
                </div>
              </div>
            </>
          )}

          {activeMenu === "members" && (
            <>
              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Total Customers
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {users.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Active Standing
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {activeUsersCount}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Suspended Accounts
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-400 mt-0.5">
                  {suspendedUsersCount}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Enrolled Customers
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {enrolledUsersCount}
                </div>
              </div>
            </>
          )}

          {activeMenu === "payments" && (
            <>
              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Pending Approvals
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {pendingEnrollments.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Approved Orders
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-0.5">
                  {approvedEnrollments.length}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Settled Revenue
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white font-mono mt-0.5 truncate">
                  Rp {approvedRevenue.toLocaleString("id-ID")}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 rounded-xl p-3.5 sm:p-4 border border-zinc-200/80 dark:border-white/10 shadow-2xs min-w-0">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                  Pending Volume
                </span>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                  Rp {pendingRevenue.toLocaleString("id-ID")}
                </div>
              </div>
            </>
          )}
        </section>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div className="bg-white dark:bg-zinc-900/90 rounded-2xl px-5 py-3.5 text-xs flex items-center justify-between gap-3 border border-zinc-200/80 dark:border-white/10 shadow-xs">
            <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 0: EXECUTIVE DASHBOARD (ALL WIDGETS COCKPIT)                 */}
        {/* ================================================================= */}
        {activeMenu === "dashboard" && (
          <div className="space-y-6">
            {/* Quick Actions & Welcome Bar */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 block">
                  Operations Cockpit
                </span>
                <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white">
                  Platform Overview
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                  Monitor live programs, verify member payments, and review customer standings in real time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("programs");
                    setSelectedProgramId(null);
                    resetCreateForm();
                    setIsCreatingProgram(true);
                    router.push("/admin/programs/new");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 transition hover:opacity-90 shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>New Program</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("payments");
                    router.push("/admin/payments");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition hover:bg-zinc-100 dark:hover:bg-white/10 whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                  <span>Pending Payments ({pendingEnrollments.length})</span>
                </button>
              </div>
            </div>

            {/* 2-Column Split: Programs Health & Pending Approvals */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column: Programs Directory Snapshot */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Active Programs ({programs.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu("programs");
                      router.push("/admin/programs");
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
                  >
                    View Directory <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-white/5 flex-1">
                  {programs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No programs created yet.
                    </div>
                  ) : (
                    programs.slice(0, 4).map((prog) => {
                      const targetDays = prog.durationDays || 21;
                      let filledCount = 0;
                      for (let d = 1; d <= targetDays; d++) {
                        if (isDayFilled(prog.days.find((x) => x.dayNumber === d))) filledCount++;
                      }
                      const pct = Math.min(100, Math.round((filledCount / targetDays) * 100));

                      return (
                        <div
                          key={prog.id}
                          onClick={() => {
                            setActiveMenu("programs");
                            openProgramDetail(prog);
                          }}
                          className="p-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] cursor-pointer transition flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  prog.isPublished
                                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-white/20 font-medium"
                                    : "bg-zinc-50 text-zinc-500 border-zinc-200 dark:border-white/10"
                                }`}
                              >
                                {prog.isPublished ? "Published" : "Draft"}
                              </span>
                              <span className="text-[11px] text-zinc-500 truncate">
                                {prog.coachName}
                              </span>
                            </div>
                            <h4 className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                              {prog.title}
                            </h4>
                            <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                              <span>{filledCount}/{targetDays} days ({pct}%)</span>
                              <span>•</span>
                              <span>{prog.durationDays} Days</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                              Rp {prog.price.toLocaleString("id-ID")}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Pending Payment Approvals */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Payment Queue ({pendingEnrollments.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu("payments");
                      router.push("/admin/payments");
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-white/5 flex-1">
                  {pendingEnrollments.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <CheckCircle2 className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto" />
                      <p className="text-xs font-medium text-zinc-900 dark:text-white">
                        All payments verified
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Zero pending customer transactions.
                      </p>
                    </div>
                  ) : (
                    pendingEnrollments.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {item.userFullName}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {item.programTitle}
                          </p>
                          <p className="text-[11px] font-mono font-medium text-zinc-900 dark:text-white">
                            Rp {item.amountPaid.toLocaleString("id-ID")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApprovePayment(item.id)}
                          disabled={approvingId === item.id}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs hover:opacity-90 transition"
                        >
                          {approvingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-zinc-200 dark:text-zinc-800" />
                              <span>Approve</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Customers Overview Snapshot */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Recent Customer Accounts
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu("members");
                    router.push("/admin/customers");
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
                >
                  Manage All Customers ({users.length}) <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-white/5">
                {users.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {u.fullName}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                            u.status === "ACTIVE"
                              ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {u.email} • {u.phone || "No phone"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        {u.enrollments.length} Program{u.enrollments.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 1A: PROGRAMS LIST                                            */}
        {/* ================================================================= */}
        {activeMenu === "programs" && !selectedProgram && !isCreatingProgram && (
          <div className="space-y-6">
            {/* MIDDLE WIDGET: Search & New Program (Top Row) + Filters (Bottom Row - Stacked) */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
              {/* Row 1: Search Bar (Left) side-by-side with New Program Button (Right) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={programSearch}
                    onChange={(e) => {
                      setProgramSearch(e.target.value);
                      setProgramPage(1);
                    }}
                    placeholder="Search programs by title or coach..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition"
                  />
                  {programSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProgramSearch("");
                        setProgramPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreatingProgram(true);
                    setSelectedProgramId(null);
                    router.push("/admin/programs/new");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shadow-xs hover:opacity-90 transition shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>New Program</span>
                </button>
              </div>

              {/* Row 2: Filters (Status Pills & Sort) - Visually Balanced */}
              <div className="pt-3.5 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono">
                {/* Status Filter Group */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "ALL", label: `All (${programs.length})` },
                    { key: "DRAFT", label: "Draft" },
                    { key: "REVIEW", label: "Review" },
                    { key: "PUBLISH", label: "Publish" },
                    { key: "DONE", label: "Done" },
                    { key: "ARCHIVE", label: "Archive" },
                  ].map((tab) => {
                    const isSelected = programFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setProgramFilter(tab.key as any);
                          setProgramPage(1);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                            : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sort By Dropdown - Symmetrically styled with status pills */}
                <div className="relative inline-flex items-center shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                  <select
                    value={programSort}
                    onChange={(e) => {
                      setProgramSort(e.target.value as any);
                      setProgramPage(1);
                    }}
                    className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
                  >
                    <option value="NEWEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Newest Date</option>
                    <option value="OLDEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Oldest Date</option>
                    <option value="TITLE_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Title (A - Z)</option>
                    <option value="TITLE_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Title (Z - A)</option>
                    <option value="MEMORY_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Memory (Largest First)</option>
                    <option value="MEMORY_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Memory (Smallest First)</option>
                    <option value="PRICE_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Price (High to Low)</option>
                    <option value="PRICE_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Price (Low to High)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* BOTTOM WIDGET: Programs Directory Header + Cards + Pagination */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Programs Directory ({filteredPrograms.length})
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                  Page {safeProgramPage} of {totalProgramPages}
                </span>
              </div>

              {paginatedPrograms.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-14 text-center border border-zinc-200/80 dark:border-white/10 shadow-xs">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    No programs found matching the selected filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {paginatedPrograms.map((prog, idx) => {
                    const targetDays = prog.durationDays || 21;
                    let filledCount = 0;
                    for (let d = 1; d <= targetDays; d++) {
                      const dayObj = prog.days.find((x) => x.dayNumber === d);
                      if (isDayFilled(dayObj)) filledCount++;
                    }
                    const progressPct = Math.min(
                      100,
                      Math.round((filledCount / targetDays) * 100)
                    );

                    const headerCheck = isProgramHeaderComplete(prog);
                    const isCurriculumComplete = filledCount === targetDays;
                    const statusRes = resolveProgramStatus({
                      isPublished: prog.isPublished,
                      status: prog.status,
                      startDate: prog.startDate,
                      endDate: prog.endDate,
                      registrationOpenDate: prog.registrationOpenDate,
                      registrationDeadline: prog.registrationDeadline,
                      maxQuota: prog.maxQuota,
                      enrolledCount: prog.activeSubscribers,
                      headerComplete: headerCheck.isComplete,
                      curriculumComplete: isCurriculumComplete,
                    });

                    const progMemory = calculateProgramMemoryFootprint(prog);

                    const defaultCovers = ["/test.webp", "/pic.webp", "/image.webp", "/coach.webp", "/coach2.webp"];
                    const coverSrc =
                      prog.coverImage && prog.coverImage.trim().length > 0
                        ? prog.coverImage
                        : defaultCovers[idx % defaultCovers.length];

                    const isResponseDisabled =
                      statusRes.dbStatus === "DRAFT" || statusRes.dbStatus === "OPEN";

                    return (
                      <div
                        key={prog.id}
                        className="relative rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-white/10 shadow-lg group hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 min-h-[190px] sm:min-h-[210px] flex flex-col justify-between p-5 sm:p-6"
                      >
                        {/* Background Image */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden bg-zinc-950">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverSrc}
                            alt={prog.title}
                            className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                          {/* Subtle Bottom & Top Scrim for Text Legibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 pointer-events-none" />
                        </div>

                        {/* TOP ROW: DB Status Badge + Dynamic Public Condition Badge (Left) & Memory Footprint (Right) */}
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Authoritative DB Status Badge */}
                            <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-semibold border border-white/20 shadow-sm">
                              {statusRes.dbStatus}
                            </span>

                            {/* Dynamic Public Condition Badge (Only when PUBLISH) - Strict Monochrome */}
                            {statusRes.dbStatus === "PUBLISH" && statusRes.publicBadge ? (
                              <span
                                className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-semibold border backdrop-blur-md shadow-sm bg-white/10 border-white/25 text-white"
                                title={statusRes.badgeSublabel}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span>{statusRes.publicBadge}</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Right: Memory Footprint - Monochrome */}
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 border border-white/20 shadow-sm"
                              title={`Entire program payload footprint: ${progMemory.bytes.toLocaleString()} bytes across ${progMemory.daysCount} days`}
                            >
                              <HardDrive className="w-3 h-3 text-zinc-400" />
                              <span>{progMemory.formatted}</span>
                            </span>
                          </div>
                        </div>

                        {/* MIDDLE: Compact Program Title + Schedule Dates */}
                        <div className="relative z-10 py-3 my-auto space-y-1.5">
                          <h3 className="text-base sm:text-lg font-geometric font-semibold text-white tracking-tight drop-shadow-md leading-snug line-clamp-2 max-w-2xl">
                            {prog.title}
                          </h3>
                          {prog.startDate && prog.endDate ? (
                            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] drop-shadow-sm">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>
                                {formatDate(prog.startDate)} &ndash; {formatDate(prog.endDate)}
                              </span>
                            </div>
                          ) : prog.startDate ? (
                            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] drop-shadow-sm">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>Starts {formatDate(prog.startDate)}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* BOTTOM ROW: Clean Floating Bar (Price + Capacity + Action Buttons) */}
                        <div className="relative z-10 p-2.5 sm:p-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-lg">
                          {/* Left: Minimal Icon & Values - Strict Monochrome */}
                          <div className="flex items-center gap-3 text-white">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
                                Rp {prog.price.toLocaleString("id-ID")}
                              </span>
                              {prog.discountPercentage && prog.discountPercentage > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="line-through text-zinc-400 text-[11px] font-mono">
                                    Rp {(prog.actualPrice && prog.actualPrice > prog.price ? prog.actualPrice : Math.round(prog.price / (1 - prog.discountPercentage / 100))).toLocaleString("id-ID")}
                                  </span>
                                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/25">
                                    -{prog.discountPercentage}%
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <span className="text-zinc-600">•</span>

                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>
                                {prog.activeSubscribers}/{prog.maxQuota}
                              </span>
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isResponseDisabled}
                              onClick={() => {
                                if (!isResponseDisabled) {
                                  openProgramDetail(prog, undefined, "responses");
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition backdrop-blur-md shadow-xs ${
                                isResponseDisabled
                                  ? "bg-white/5 border-white/10 text-zinc-500 cursor-not-allowed opacity-40"
                                  : "bg-white/10 hover:bg-white/20 border-white/20 text-zinc-200 hover:text-white"
                              }`}
                              title={
                                isResponseDisabled
                                  ? "Responses unavailable in Draft/Open state"
                                  : `View responses (${prog.submissionCount ?? 0})`
                              }
                            >
                              View Response
                            </button>

                            <button
                              type="button"
                              onClick={() => openProgramDetail(prog)}
                              className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] duration-150"
                            >
                              <span>Manage</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <PaginationBar
                currentPage={safeProgramPage}
                totalPages={totalProgramPages}
                totalItems={filteredPrograms.length}
                pageSize={PROGRAM_PAGE_SIZE}
                onPageChange={setProgramPage}
                itemLabel="programs"
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 1B: CREATE NEW PROGRAM                                       */}
        {/* ================================================================= */}
        {activeMenu === "programs" && isCreatingProgram && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Back Button and Expand/Collapse Controls */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-7 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingProgram(false);
                    router.push("/admin/programs");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Programs
                </button>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Create Program Header
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
                  Configure program metadata, schedule duration, master coach, audience, pricing, and terms. Saved as Draft until you choose to publish.
                </p>
              </div>

              {/* Global Expand All / Collapse All Controls */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setAllCreateSections(true)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => setAllCreateSections(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Program Header Form */}
            <form onSubmit={handleCreateProgramSubmit} className="space-y-6">
              
              {/* 1. PROGRAM INFORMATION (ODD) */}
              <div className={getSectionCardClass(1, expandedCreateSections[1])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(1)}
                  className={getSectionHeaderClass(1)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(1)}>
                      1
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Program Information
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Core identity, intensity level, banner imagery, and public synopsis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(1, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[1] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[1] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="grid sm:grid-cols-3 gap-5 pt-3">
                      <div className="sm:col-span-2 space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Program Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={createForm.title}
                          onChange={(e) =>
                            setCreateForm((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="Enter the program title..."
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Difficulty / Intensity *
                        </label>
                        <select
                          required
                          value={createForm.difficultyLevel}
                          onChange={(e) =>
                            setCreateForm((p) => ({ ...p, difficultyLevel: e.target.value }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        >
                          <option value="" disabled>
                            Choose difficulty...
                          </option>
                          {DIFFICULTY_LEVELS.map((lvl) => (
                            <option key={lvl.value} value={lvl.value} className="bg-white dark:bg-zinc-900">
                              {lvl.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cover / Banner Image with Preview */}
                      <div className="sm:col-span-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Cover / Banner Image URL</span>
                          </label>
                          {createForm.coverImage && (
                            <button
                              type="button"
                              onClick={() => setCreateForm((p) => ({ ...p, coverImage: "" }))}
                              className="text-[10px] text-zinc-500 hover:text-red-500 transition underline"
                            >
                              Clear Image
                            </button>
                          )}
                        </div>
                        <input
                          type="url"
                          value={createForm.coverImage}
                          onChange={(e) =>
                            setCreateForm((p) => ({ ...p, coverImage: e.target.value }))
                          }
                          placeholder="Enter cover image URL..."
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                        <div className="relative h-28 sm:h-36 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                          {createForm.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={createForm.coverImage}
                              alt="Banner Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-zinc-400 text-center px-4">
                              <ImageIcon className="w-6 h-6 stroke-1 text-zinc-400" />
                              <span className="text-[11px]">Recommended 16:9 banner preview will appear here</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3 space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Short Description *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={createForm.description}
                          onChange={(e) =>
                            setCreateForm((p) => ({ ...p, description: e.target.value }))
                          }
                          placeholder="Enter program description..."
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. PURPOSE, TARGET STATE & SCIENTIFIC BASIS (EVEN) */}
              <div className={getSectionCardClass(2, expandedCreateSections[2])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(2)}
                  className={getSectionHeaderClass(2)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(2)}>
                      2
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Purpose, Target State &amp; Scientific Basis
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Target physical/mental condition, methodology, tangible benefits, clinical references, and daily guidelines
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(2, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[2] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[2] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
                    <ProgramBlueprintSectionContent
                      targetState={createForm.targetState}
                      onChangeTargetState={(val) =>
                        setCreateForm((p) => ({ ...p, targetState: val }))
                      }
                      methodology={createForm.methodology}
                      onChangeMethodology={(val) =>
                        setCreateForm((p) => ({ ...p, methodology: val }))
                      }
                      expectedBenefits={createForm.expectedBenefits}
                      onChangeBenefits={(next) =>
                        setCreateForm((p) => ({ ...p, expectedBenefits: next }))
                      }
                      scientificReferences={createForm.scientificReferences}
                      onChangeReferences={(next) =>
                        setCreateForm((p) => ({ ...p, scientificReferences: next }))
                      }
                      programGuidelines={createForm.programGuidelines}
                      onChangeGuidelines={(next) =>
                        setCreateForm((p) => ({ ...p, programGuidelines: next }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* 3. DIRECTORIES & CLASSIFICATION (ODD) */}
              <div className={getSectionCardClass(3, expandedCreateSections[3])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(3)}
                  className={getSectionHeaderClass(3)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(3)}>
                      3
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Directories &amp; Classification
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Taxonomy, coaching team, target personas, equipment, and daily time requirement
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(3, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[3] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[3] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-6">
                    <DropdownTagPicker
                      label="Category / Categories *"
                      subLabel="Program taxonomy &amp; disciplines (select from master list)"
                      value={createForm.category}
                      onChange={(val) => setCreateForm((p) => ({ ...p, category: val }))}
                      options={masterData.categories.map((c) => ({
                        id: c.id,
                        name: c.name,
                      }))}
                      selectPlaceholder="Enter or select category..."
                      onManage={() => navigateToDirectory("categories")}
                      manageLabel="+ Manage in Categories Directory"
                      icon={Tag}
                    />

                    <SingleSelectDirectoryPicker
                      label="Daily Time Commitment *"
                      subLabel="Estimated daily session length"
                      value={createForm.dailyCommitment}
                      onChange={(val) => setCreateForm((p) => ({ ...p, dailyCommitment: val }))}
                      options={masterData.dailyCommitments || []}
                      onManage={() => navigateToDirectory("commitments")}
                      manageLabel="+ Manage in Commitments Directory"
                      placeholder="Enter or select daily time commitment..."
                      icon={Clock}
                    />

                    <DropdownTagPicker
                      label="Equipment Needed"
                      subLabel="Required tools & gear (select from master list)"
                      value={createForm.equipment}
                      onChange={(val) => setCreateForm((p) => ({ ...p, equipment: val }))}
                      options={masterData.equipment || []}
                      selectPlaceholder="Enter or select equipment..."
                      onManage={() => navigateToDirectory("equipment")}
                      manageLabel="+ Manage in Equipment Directory"
                      icon={Dumbbell}
                    />

                    <DropdownTagPicker
                      label="Coach / Coaches *"
                      subLabel="Assign instructors leading this program"
                      value={createForm.coachName}
                      onChange={(val) => setCreateForm((p) => ({ ...p, coachName: val }))}
                      options={masterData.coaches.map((c) => ({
                        id: c.id,
                        name: c.name,
                        title: c.title,
                      }))}
                      selectPlaceholder="Enter or select coach..."
                      onManage={() => navigateToDirectory("coaches")}
                      manageLabel="+ Manage in Coaches Directory"
                      icon={UserCheck}
                    />

                    <DropdownTagPicker
                      label="Target Audience (Recommended For) *"
                      subLabel="Ideal demographics & participant personas (e.g. Private Sector Employees, Creative Workers)"
                      value={createForm.recommendedFor}
                      onChange={(val) => setCreateForm((p) => ({ ...p, recommendedFor: val }))}
                      options={masterData.targetAudiences.map((a) => ({
                        id: a.id,
                        name: a.name,
                      }))}
                      selectPlaceholder="Enter or select target audience..."
                      onManage={() => navigateToDirectory("audience")}
                      manageLabel="+ Manage in Audience Directory"
                      icon={Sparkles}
                    />
                  </div>
                )}
              </div>

              {/* 4. SCHEDULE & REGISTRATION DATES (EVEN) */}
              <div className={getSectionCardClass(4, expandedCreateSections[4])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(4)}
                  className={getSectionHeaderClass(4)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(4)}>
                      4
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Schedule &amp; Registration Dates
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Start, end, and cutoff timelines in WIB ({createForm.durationDays} Days &bull; Asia/Jakarta)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(4, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[4] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[4] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Start Date (WIB) *
                        </label>
                        <input
                          type="date"
                          required
                          value={createForm.startDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const s = new Date(newStart);
                            const en = new Date(createForm.endDate);
                            const days =
                              !isNaN(s.getTime()) && !isNaN(en.getTime()) && en >= s
                                ? Math.max(1, Math.round((en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                : createForm.durationDays;
                            setCreateForm((p) => ({
                              ...p,
                              startDate: newStart,
                              durationDays: days,
                            }));
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          End Date (WIB) *
                        </label>
                        <input
                          type="date"
                          required
                          value={createForm.endDate}
                          onChange={(e) => {
                            const newEnd = e.target.value;
                            const s = new Date(createForm.startDate);
                            const en = new Date(newEnd);
                            const days =
                              !isNaN(s.getTime()) && !isNaN(en.getTime()) && en >= s
                                ? Math.max(1, Math.round((en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                : 1;
                            setCreateForm((p) => ({
                              ...p,
                              endDate: newEnd,
                              durationDays: days,
                            }));
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Registration Open Date (WIB)
                        </label>
                        <input
                          type="date"
                          value={createForm.registrationOpenDate}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              registrationOpenDate: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Registration Cutoff Date (WIB) *
                        </label>
                        <input
                          type="date"
                          required
                          value={createForm.registrationDeadline}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              registrationDeadline: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. ATTENDANCE MODE & LOCATION (ODD) */}
              <div className={getSectionCardClass(5, expandedCreateSections[5])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(5)}
                  className={getSectionHeaderClass(5)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(5)}>
                      5
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Attendance Mode &amp; Location
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Delivery format (Online, On-Site studio, or Hybrid) and default location
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(5, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[5] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[5] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3 pt-3">
                      {[
                        { key: "ONLINE", label: "Online" },
                        { key: "ONSITE", label: "On-Site" },
                        { key: "HYBRID", label: "Online + Onsite" },
                      ].map((mode) => (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={() =>
                            setCreateForm((p) => ({
                              ...p,
                              locationType: mode.key as "ONLINE" | "ONSITE" | "HYBRID",
                            }))
                          }
                          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                            createForm.locationType === mode.key
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs border-transparent"
                              : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    {createForm.locationType === "ONLINE" ? (
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 text-zinc-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            Virtual Online Delivery Selected
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            No physical venue or city address is required for 100% online programs. Sessions take place virtually via daily video links and community access.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            City / Region *
                          </label>
                          <input
                            type="text"
                            required
                            value={createForm.city}
                            onChange={(e) =>
                              setCreateForm((p) => ({ ...p, city: e.target.value }))
                            }
                            placeholder="Enter city"
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Studio Physical Venue Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={createForm.venueAddress}
                            onChange={(e) =>
                              setCreateForm((p) => ({ ...p, venueAddress: e.target.value }))
                            }
                            placeholder="Enter venue address"
                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. PRICING & QUOTA (EVEN) */}
              <div className={getSectionCardClass(6, expandedCreateSections[6])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(6)}
                  className={getSectionHeaderClass(6)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(6)}>
                      6
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Pricing &amp; Participant Quota
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Tuition structure, promotional discount, and participant seat cap
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(6, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[6] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[6] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Capacity (Seats) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={createForm.maxQuota}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              maxQuota: Number(e.target.value),
                            }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Actual Tuition (IDR) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          required
                          value={createForm.actualPrice || ""}
                          onChange={(e) => {
                            const actual = Number(e.target.value) || 0;
                            const disc = Number(createForm.discountPercentage) || 0;
                            setCreateForm((p) => ({
                              ...p,
                              actualPrice: actual,
                              price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                            }));
                          }}
                          placeholder="Enter actual tuition..."
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Discount (5% Multiples)
                        </label>
                        <select
                          value={createForm.discountPercentage}
                          onChange={(e) => {
                            const disc = Number(e.target.value) || 0;
                            const actual = Number(createForm.actualPrice) || 0;
                            setCreateForm((p) => ({
                              ...p,
                              discountPercentage: disc,
                              price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                            }));
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        >
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((d) => (
                            <option key={d} value={d} className="dark:bg-zinc-900">
                              {d === 0 ? "0% (No Discount)" : `${d}% Off`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Final Calculated Tuition
                        </label>
                        <div className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                          <span>Rp {createForm.price.toLocaleString("id-ID")}</span>
                          {createForm.discountPercentage > 0 && (
                            <span className="text-[10px] text-zinc-400 font-normal">
                              -{createForm.discountPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. COMMUNITY CHANNEL LINK (ODD) */}
              <div className={getSectionCardClass(7, expandedCreateSections[7])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(7)}
                  className={getSectionHeaderClass(7)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(7)}>
                      7
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Community Channel / Group URL
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Private group or channel link for enrolled members (WhatsApp, Discord, etc.)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(7, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[7] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[7] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                    <div className="space-y-2 pt-3">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Community Channel / Group URL
                      </label>
                      <input
                        type="url"
                        value={createForm.communityLink}
                        onChange={(e) =>
                          setCreateForm((p) => ({
                            ...p,
                            communityLink: e.target.value,
                          }))
                        }
                        placeholder="Enter community link (WhatsApp, Discord, Slack, etc.)..."
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 8. TERMS & CONDITIONS (EVEN) */}
              <div className={getSectionCardClass(8, expandedCreateSections[8])}>
                <button
                  type="button"
                  onClick={() => toggleCreateSection(8)}
                  className={getSectionHeaderClass(8)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={getSectionBadgeClass(8)}>
                      8
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Terms &amp; Conditions
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        Program rules, health disclaimer, and enrollment terms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {(() => {
                      const { filled, total } = getProgramSectionStats(8, createForm);
                      return renderSectionProgressBadge(filled, total);
                    })()}
                    <div className="p-1 rounded-lg text-zinc-400">
                      {expandedCreateSections[8] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {expandedCreateSections[8] && (
                  <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
                    <ProgramTermsChapterBuilder
                      chapters={createForm.termsChapters}
                      onChange={(nextChapters) => {
                        const serialized = serializeTermsChapters(nextChapters);
                        const flattened = nextChapters.flatMap((c) => c.clauses);
                        setCreateForm((p) => ({
                          ...p,
                          termsType: "CUSTOM",
                          termsChapters: nextChapters,
                          termsList: flattened,
                          customTerms: serialized,
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              {/* SUBMIT / CANCEL ACTIONS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Save as Quick Draft or Complete Program Header
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                    Requires Program Title. Remaining 8 header sections and day-by-day routines can be filled at your own pace before publishing.
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingProgram(false);
                      router.push("/admin/programs");
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingLoading}
                    className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition shadow-xs disabled:opacity-50"
                  >
                    {creatingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Create Program (Quick Draft)</span>
                  </button>
                </div>
              </div>

              {/* Validation error message directly below action buttons */}
              {createError && (
                <div className="p-4 rounded-xl text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{createError}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW: MASTER DIRECTORIES MANAGEMENT (Stacked with Pagination & CRUD)*/}
        {/* ================================================================= */}
        {activeMenu === "master" && (() => {
          interface MasterDirectoryItem {
            id: string;
            type: "coaches" | "audience" | "categories" | "equipment" | "commitments";
            masterCategoryName: string;
            name: string;
            icon: any;
            raw: any;
          }

          const directoryTabs: {
            key: "coaches" | "audience" | "categories" | "equipment" | "commitments";
            label: string;
            singular: string;
            masterCategoryName: string;
            icon: any;
            count: number;
          }[] = [
            {
              key: "coaches",
              label: "Coaches",
              singular: "Coach",
              masterCategoryName: "Master Coach",
              icon: UserCheck,
              count: (masterData?.coaches || []).length,
            },
            {
              key: "audience",
              label: "Audience",
              singular: "Audience",
              masterCategoryName: "Master Target Audience",
              icon: Sparkles,
              count: (masterData?.targetAudiences || []).length,
            },
            {
              key: "categories",
              label: "Categories",
              singular: "Category",
              masterCategoryName: "Master Category",
              icon: Tag,
              count: (masterData?.categories || []).length,
            },
            {
              key: "equipment",
              label: "Equipment",
              singular: "Equipment",
              masterCategoryName: "Master Equipment",
              icon: Dumbbell,
              count: (masterData?.equipment || []).length,
            },
            {
              key: "commitments",
              label: "Commitments",
              singular: "Commitment",
              masterCategoryName: "Master Daily Commitment",
              icon: Clock,
              count: (masterData?.dailyCommitments || []).length,
            },
          ];

          const currentTabMeta = directoryTabs.find((t) => t.key === masterTab) || directoryTabs[0];

          const currentTabItems: MasterDirectoryItem[] = [];

          if (masterTab === "coaches") {
            (masterData?.coaches || []).forEach((c) => {
              currentTabItems.push({
                id: c.id,
                type: "coaches",
                masterCategoryName: "Master Coach",
                name: c.name,
                icon: UserCheck,
                raw: c,
              });
            });
          } else if (masterTab === "audience") {
            (masterData?.targetAudiences || []).forEach((a) => {
              currentTabItems.push({
                id: a.id,
                type: "audience",
                masterCategoryName: "Master Target Audience",
                name: a.name,
                icon: Sparkles,
                raw: a,
              });
            });
          } else if (masterTab === "categories") {
            (masterData?.categories || []).forEach((cat) => {
              currentTabItems.push({
                id: cat.id,
                type: "categories",
                masterCategoryName: "Master Category",
                name: cat.name,
                icon: Tag,
                raw: cat,
              });
            });
          } else if (masterTab === "equipment") {
            (masterData?.equipment || []).forEach((eq) => {
              currentTabItems.push({
                id: eq.id,
                type: "equipment",
                masterCategoryName: "Master Equipment",
                name: eq.name,
                icon: Dumbbell,
                raw: eq,
              });
            });
          } else if (masterTab === "commitments") {
            (masterData?.dailyCommitments || []).forEach((cm) => {
              currentTabItems.push({
                id: cm.id,
                type: "commitments",
                masterCategoryName: "Master Daily Commitment",
                name: cm.name,
                icon: Clock,
                raw: cm,
              });
            });
          }

          const filteredItems = currentTabItems
            .filter((item) => {
              if (masterSearch.trim().length > 0) {
                const q = masterSearch.toLowerCase().trim();
                return item.name.toLowerCase().includes(q);
              }
              return true;
            })
            .sort((a, b) => {
              if (masterSort === "Z_A") {
                return b.name.localeCompare(a.name);
              }
              return a.name.localeCompare(b.name);
            });

          const totalPages = Math.max(1, Math.ceil(filteredItems.length / MASTER_GRID_PAGE_SIZE));
          const safePage = Math.min(masterPage, totalPages);
          const paginatedItems = filteredItems.slice(
            (safePage - 1) * MASTER_GRID_PAGE_SIZE,
            safePage * MASTER_GRID_PAGE_SIZE
          );

          const handleDeleteItem = async (item: MasterDirectoryItem) => {
            if (item.type === "coaches") {
              await handleDeleteCoach(item.id, item.name);
            } else if (item.type === "audience") {
              await handleDeleteAudience(item.id, item.name);
            } else if (item.type === "categories") {
              await handleDeleteCategory(item.id, item.name);
            } else if (item.type === "equipment") {
              await handleDeleteEquipment(item.id, item.name);
            } else if (item.type === "commitments") {
              await handleDeleteCommitment(item.id, item.name);
            }
          };

          const handleOpenEdit = (item: MasterDirectoryItem) => {
            setActiveDirectoryModal({
              mode: "edit",
              type: item.type,
              item: {
                id: item.id,
                name: item.name,
                title: item.type === "coaches" ? item.raw.title : undefined,
              },
            });
            setModalFormName(item.name);
            setModalFormTitle(item.type === "coaches" ? (item.raw.title || "") : "");
          };

          const handleOpenCreate = () => {
            setActiveDirectoryModal({
              mode: "add",
              type: masterTab,
            });
            setModalFormName("");
            setModalFormTitle("");
          };

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* TOP WIDGET: Search & Action Stack (Row 1) + Filter Tabs & Sort (Row 2) */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
                {/* Row 1: Search Bar (Left) + New Entry Button (Right) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={masterSearch}
                      onChange={(e) => {
                        setMasterSearch(e.target.value);
                        setMasterPage(1);
                      }}
                      placeholder={`Search in ${currentTabMeta.label.toLowerCase()}...`}
                      className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition"
                    />
                    {masterSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setMasterSearch("");
                          setMasterPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New {currentTabMeta.singular}</span>
                  </button>
                </div>

                {/* Row 2: Filter Tabs + Sort Dropdown */}
                <div className="pt-3.5 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono">
                  {/* Filter Tabs (Strictly per Master Directory, No "All") */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {directoryTabs.map((tab) => {
                      const isSelected = masterTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => {
                            setMasterTab(tab.key);
                            setMasterPage(1);
                            setMasterSearch("");
                            router.push(`/admin/directories?tab=${tab.key}`);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                            isSelected
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                              : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5"
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative inline-flex items-center shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                    <select
                      value={masterSort}
                      onChange={(e) => {
                        setMasterSort(e.target.value as any);
                        setMasterPage(1);
                      }}
                      className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
                    >
                      <option value="A_Z" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (A - Z)</option>
                      <option value="Z_A" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (Z - A)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* BOTTOM WIDGET: Directories Header + Cards Grid + Pagination */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      {currentTabMeta.masterCategoryName} ({filteredItems.length})
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                    Page {safePage} of {totalPages}
                  </span>
                </div>

                {paginatedItems.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-12 text-center border border-zinc-200/80 dark:border-white/10 shadow-xs">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      No entries found in {currentTabMeta.masterCategoryName}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
                    {paginatedItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isCoach = item.type === "coaches";
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {item.name}
                              </h4>
                              {isCoach && item.raw?.title && (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block truncate">
                                  {item.raw.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 transition flex items-center gap-1.5"
                              title="Edit item"
                            >
                              <Pencil className="w-3 h-3 text-zinc-400" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <PaginationBar
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  pageSize={MASTER_GRID_PAGE_SIZE}
                  onPageChange={setMasterPage}
                  itemLabel="entries"
                />
              </div>

              {/* Master Directory Add / Edit Modal Drawer */}
              {activeDirectoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
                            Master Directory
                          </span>
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
                          {activeDirectoryModal.mode === "add" ? "Create New" : "Edit"}{" "}
                          {activeDirectoryModal.type === "coaches"
                            ? "Coach"
                            : activeDirectoryModal.type === "audience"
                            ? "Target Audience"
                            : activeDirectoryModal.type === "categories"
                            ? "Category"
                            : activeDirectoryModal.type === "equipment"
                            ? "Equipment"
                            : "Daily Commitment"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDirectoryModal(null)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>



                    {/* Form Fields */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!modalFormName.trim()) return;

                        setMasterActionLoading(true);
                        try {
                          if (activeDirectoryModal.mode === "add") {
                            if (activeDirectoryModal.type === "coaches") {
                              if (!modalFormTitle.trim()) return;
                              const res = await wellnessCreateMasterCoach({
                                name: modalFormName.trim(),
                                title: modalFormTitle.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  coaches: [...prev.coaches, res.data as any],
                                }));
                                setFeedback({ type: "success", text: "Coach added." });
                              }
                            } else if (activeDirectoryModal.type === "audience") {
                              const res = await wellnessCreateMasterTargetAudience(modalFormName.trim());
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  targetAudiences: [...prev.targetAudiences, res.data as any],
                                }));
                                setFeedback({ type: "success", text: "Target audience added." });
                              }
                            } else if (activeDirectoryModal.type === "categories") {
                              const res = await wellnessCreateMasterCategory(modalFormName.trim());
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  categories: [...prev.categories, res.data as any],
                                }));
                                setFeedback({ type: "success", text: "Category added." });
                              }
                            } else if (activeDirectoryModal.type === "equipment") {
                              const res = await wellnessCreateMasterEquipment(modalFormName.trim());
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  equipment: [...(prev.equipment || []), res.data as any],
                                }));
                                setFeedback({ type: "success", text: "Equipment added." });
                              }
                            } else if (activeDirectoryModal.type === "commitments") {
                              const res = await wellnessCreateMasterDailyCommitment(modalFormName.trim());
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  dailyCommitments: [...(prev.dailyCommitments || []), res.data as any],
                                }));
                                setFeedback({ type: "success", text: "Commitment added." });
                              }
                            }
                          } else if (activeDirectoryModal.mode === "edit" && activeDirectoryModal.item) {
                            const itemId = activeDirectoryModal.item.id;
                            if (activeDirectoryModal.type === "coaches") {
                              if (!modalFormTitle.trim()) return;
                              const res = await wellnessUpdateMasterCoach({
                                id: itemId,
                                name: modalFormName.trim(),
                                title: modalFormTitle.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  coaches: prev.coaches.map((c) => (c.id === itemId ? (res.data as any) : c)),
                                }));
                                setFeedback({ type: "success", text: "Coach updated." });
                              }
                            } else if (activeDirectoryModal.type === "audience") {
                              const res = await wellnessUpdateMasterTargetAudience({
                                id: itemId,
                                name: modalFormName.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  targetAudiences: prev.targetAudiences.map((a) => (a.id === itemId ? (res.data as any) : a)),
                                }));
                                setFeedback({ type: "success", text: "Audience updated." });
                              }
                            } else if (activeDirectoryModal.type === "categories") {
                              const res = await wellnessUpdateMasterCategory({
                                id: itemId,
                                name: modalFormName.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  categories: prev.categories.map((c) => (c.id === itemId ? (res.data as any) : c)),
                                }));
                                setFeedback({ type: "success", text: "Category updated." });
                              }
                            } else if (activeDirectoryModal.type === "equipment") {
                              const res = await wellnessUpdateMasterEquipment({
                                id: itemId,
                                name: modalFormName.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  equipment: (prev.equipment || []).map((eq) => (eq.id === itemId ? (res.data as any) : eq)),
                                }));
                                setFeedback({ type: "success", text: "Equipment updated." });
                              }
                            } else if (activeDirectoryModal.type === "commitments") {
                              const res = await wellnessUpdateMasterDailyCommitment({
                                id: itemId,
                                name: modalFormName.trim(),
                              });
                              if (res.success && res.data) {
                                setMasterData((prev) => ({
                                  ...prev,
                                  dailyCommitments: (prev.dailyCommitments || []).map((cm) => (cm.id === itemId ? (res.data as any) : cm)),
                                }));
                                setFeedback({ type: "success", text: "Commitment updated." });
                              }
                            }
                          }
                          setActiveDirectoryModal(null);
                          router.refresh();
                        } finally {
                          setMasterActionLoading(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {activeDirectoryModal.type === "coaches" ? "Coach Name *" : "Entry Name *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={modalFormName}
                          onChange={(e) => setModalFormName(e.target.value)}
                          placeholder={
                            activeDirectoryModal.type === "coaches"
                              ? "Enter coach name"
                              : activeDirectoryModal.type === "categories"
                              ? "Enter category name"
                              : activeDirectoryModal.type === "equipment"
                              ? "Enter equipment name"
                              : activeDirectoryModal.type === "commitments"
                              ? "Enter time commitment"
                              : "Enter target audience"
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      {activeDirectoryModal.type === "coaches" && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                            Title / Specialization *
                          </label>
                          <input
                            type="text"
                            required
                            value={modalFormTitle}
                            onChange={(e) => setModalFormTitle(e.target.value)}
                            placeholder="Enter coach title"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-white/10 font-mono">
                        <button
                          type="button"
                          onClick={() => setActiveDirectoryModal(null)}
                          className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-white/20 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={masterActionLoading}
                          className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                        >
                          {masterActionLoading ? "Saving..." : activeDirectoryModal.mode === "add" ? "Save Entry" : "Update Entry"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* VIEW 1C: PROGRAM DETAIL (INFO + DAILY SCHEDULE)                   */}
        {/* ================================================================= */}
        {activeMenu === "programs" && selectedProgram && (() => {
          const targetDays = selectedProgram.durationDays || 21;
          let filledCount = 0;
          for (let d = 1; d <= targetDays; d++) {
            if (isDayFilled(selectedProgram.days.find((x) => x.dayNumber === d))) {
              filledCount++;
            }
          }
          const allFilled = filledCount >= targetDays;

          const headerCheck = isProgramHeaderComplete({
            title: selectedProgram.title,
            description: selectedProgram.description,
            difficultyLevel: selectedProgram.difficultyLevel,
            targetState: selectedProgram.targetState,
            methodology: selectedProgram.methodology,
            expectedBenefits: selectedProgram.expectedBenefits,
            category: selectedProgram.category,
            dailyCommitment: selectedProgram.dailyCommitment,
            coachName: selectedProgram.coachName,
            recommendedFor: selectedProgram.recommendedFor,
            startDate: selectedProgram.startDate,
            endDate: selectedProgram.endDate,
            registrationDeadline: selectedProgram.registrationDeadline,
            locationType: selectedProgram.locationType,
            city: selectedProgram.city,
            venueAddress: selectedProgram.venueAddress,
            maxQuota: selectedProgram.maxQuota,
            price: selectedProgram.price,
            communityLink: selectedProgram.communityLink,
            termsList: selectedProgram.termsList,
            customTerms: selectedProgram.customTerms,
          });

          const isCurriculumComplete = filledCount === targetDays;
          const isReadyToPublish = headerCheck.isComplete && isCurriculumComplete;

          const statusRes = resolveProgramStatus({
            isPublished: selectedProgram.isPublished,
            status: selectedProgram.status,
            startDate: selectedProgram.startDate,
            endDate: selectedProgram.endDate,
            registrationOpenDate: selectedProgram.registrationOpenDate,
            registrationDeadline: selectedProgram.registrationDeadline,
            maxQuota: selectedProgram.maxQuota,
            enrolledCount: selectedProgram.activeSubscribers,
            headerComplete: headerCheck.isComplete,
            curriculumComplete: isCurriculumComplete,
          });

          return (
            <div className="space-y-6">
              {/* Program Detail Header Summary Widget */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-7 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-5">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgramId(null);
                      router.push("/admin/programs");
                    }}
                    className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Programs
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Automated Dynamic Lifecycle Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${statusRes.colorClass}`}
                        title={statusRes.badgeSublabel}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{statusRes.badgeLabel}</span>
                      </span>
                    </div>

                    {/* Publish / Unpublish Program Button */}
                    {selectedProgram.isPublished ? (
                      <button
                        type="button"
                        onClick={() => handleInitiatePublish(selectedProgram)}
                        disabled={publishingId === selectedProgram.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 transition flex items-center gap-1.5"
                        title="Unpublish program to return to review state"
                      >
                        {publishingId === selectedProgram.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        <span>Unpublish Program</span>
                      </button>
                    ) : !isReadyToPublish ? (
                      <button
                        type="button"
                        disabled
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-white/10 opacity-40 cursor-not-allowed flex items-center gap-1.5 shadow-none"
                        title={
                          !headerCheck.isComplete
                            ? `Publish locked: Complete all 8 Program Header sections (${headerCheck.completedCount}/8 completed).`
                            : `Publish locked: Complete all ${targetDays} daily modules (${filledCount}/${targetDays} completed).`
                        }
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>Publish Locked</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInitiatePublish(selectedProgram)}
                        disabled={publishingId === selectedProgram.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02] duration-150"
                        title="Validate completeness and launch program"
                      >
                        {publishingId === selectedProgram.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Publish Program</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteProgram(selectedProgram)}
                      disabled={deletingProgId === selectedProgram.id}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-zinc-200/70 dark:border-white/10 hover:border-red-200 dark:hover:border-red-900/50"
                      title="Delete Program"
                    >
                      {deletingProgId === selectedProgram.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {(() => {
                  const headerCheck = isProgramHeaderComplete({
                    title: selectedProgram.title,
                    description: selectedProgram.description,
                    difficultyLevel: selectedProgram.difficultyLevel,
                    targetState: selectedProgram.targetState,
                    methodology: selectedProgram.methodology,
                    expectedBenefits: selectedProgram.expectedBenefits,
                    category: selectedProgram.category,
                    dailyCommitment: selectedProgram.dailyCommitment,
                    coachName: selectedProgram.coachName,
                    recommendedFor: selectedProgram.recommendedFor,
                    startDate: selectedProgram.startDate,
                    endDate: selectedProgram.endDate,
                    registrationDeadline: selectedProgram.registrationDeadline,
                    locationType: selectedProgram.locationType,
                    city: selectedProgram.city,
                    venueAddress: selectedProgram.venueAddress,
                    maxQuota: selectedProgram.maxQuota,
                    price: selectedProgram.price,
                    communityLink: selectedProgram.communityLink,
                    termsList: selectedProgram.termsList,
                    customTerms: selectedProgram.customTerms,
                  });

                  const isCurriculumComplete = filledCount === targetDays;

                  const statusRes = resolveProgramStatus({
                    isPublished: selectedProgram.isPublished,
                    status: selectedProgram.status,
                    startDate: selectedProgram.startDate,
                    endDate: selectedProgram.endDate,
                    registrationOpenDate: selectedProgram.registrationOpenDate,
                    registrationDeadline: selectedProgram.registrationDeadline,
                    maxQuota: selectedProgram.maxQuota,
                    enrolledCount: selectedProgram.activeSubscribers,
                    headerComplete: headerCheck.isComplete,
                    curriculumComplete: isCurriculumComplete,
                  });

                  const attendanceLabel =
                    selectedProgram.locationType === "ONLINE"
                      ? "Online"
                      : selectedProgram.locationType === "ONSITE"
                      ? `On-Site • ${selectedProgram.city || "Jakarta"}`
                      : `Online + Onsite • ${selectedProgram.city || "Jakarta"}`;

                  return (
                    <div className="space-y-5">
                      {/* Title, Badges & Synopsis */}
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-2 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-2xs">
                              DB: {statusRes.dbStatus}
                            </span>

                            {statusRes.dbStatus === "PUBLISH" && statusRes.publicBadge ? (
                              <span
                                className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-semibold border ${statusRes.colorClass}`}
                                title={statusRes.badgeSublabel}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                <span>Live: {statusRes.publicBadge}</span>
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-semibold border ${statusRes.colorClass}`}
                                title={statusRes.badgeSublabel}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span>{statusRes.badgeLabel}</span>
                              </span>
                            )}

                            {!selectedProgram.isPublished && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                                {statusRes.authoringStatus === "CONCEPT"
                                  ? `Header Incomplete (${headerCheck.completedCount}/8 points)`
                                  : statusRes.authoringStatus === "DRAFT"
                                  ? `Header Complete • Curriculum Day ${filledCount}/${targetDays}`
                                  : "Review • Ready to Launch"}
                              </span>
                            )}

                            {parseTagList(selectedProgram.category || "Pilates").map((cat, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10"
                              >
                                {cat}
                              </span>
                            ))}

                            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                              {attendanceLabel}
                            </span>
                          </div>

                          <h2 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug">
                            {selectedProgram.title}
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                            {selectedProgram.description}
                          </p>
                        </div>

                        {selectedProgram.communityLink && (
                          <a
                            href={selectedProgram.communityLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1.5 shrink-0 w-fit transition"
                          >
                            <Globe className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Community Group</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Clean 4-Column Executive Summary Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                            Duration &amp; Dates
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {selectedProgram.durationDays} Days ({filledCount}/{targetDays} filled)
                          </p>
                          <span className="text-[11px] text-zinc-500 block truncate">
                            {formatDate(selectedProgram.startDate)} &ndash; {formatDate(selectedProgram.endDate)}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                            Tuition Fee
                          </span>
                          <p className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-white">
                            {selectedProgram.price === 0
                              ? "Free"
                              : `Rp ${selectedProgram.price.toLocaleString("id-ID")}`}
                          </p>
                          {selectedProgram.discountPercentage && selectedProgram.discountPercentage > 0 ? (
                            <span className="text-[11px] text-zinc-500 block truncate">
                              <span className="line-through">
                                Rp {(selectedProgram.actualPrice || selectedProgram.price).toLocaleString("id-ID")}
                              </span>{" "}
                              (-{selectedProgram.discountPercentage}%)
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-500 block">Standard tuition</span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                            Assigned Coach
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                            {selectedProgram.coachName}
                          </p>
                          <span className="text-[11px] text-zinc-500 truncate block">
                            {selectedProgram.coachTitle || "Lead Instructor"}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                            Quota &amp; Registration
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {selectedProgram.maxQuota} Seats ({selectedProgram.activeSubscribers} active)
                          </p>
                          <span className="text-[11px] text-zinc-500 truncate block">
                            Cutoff: {formatDate(selectedProgram.registrationDeadline)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ============================================================= */}
              {/* PRIMARY 3 NAVIGATION OPTIONS: Program Header | Daily Management | Responses */}
              {/* ============================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* OPTION 1: PROGRAM HEADER */}
                <button
                  type="button"
                  onClick={() => {
                    setProgramDetailTab("info");
                    router.push(
                      `/admin/programs/${selectedProgram.id}?tab=info&day=${selectedDayNum}`
                    );
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
                    programDetailTab === "info"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          programDetailTab === "info"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                            : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                        }`}
                      >
                        <FileEdit className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                          <span>Program Header</span>
                          {programDetailTab === "info" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          )}
                        </h4>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                          Blueprint, Settings &amp; Terms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Audit: <strong className="text-zinc-900 dark:text-white font-semibold">{headerCheck.completedCount}/8</strong> Points
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        headerCheck.isComplete
                          ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                          : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {headerCheck.isComplete ? "8/8 Complete" : `${8 - headerCheck.completedCount} Points Missing`}
                    </span>
                  </div>
                </button>

                {/* OPTION 2: DAILY MANAGEMENT */}
                <button
                  type="button"
                  onClick={() => {
                    setProgramDetailTab("schedule");
                    router.push(
                      `/admin/programs/${selectedProgram.id}?tab=schedule&day=${selectedDayNum}`
                    );
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
                    programDetailTab === "schedule"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          programDetailTab === "schedule"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                            : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                        }`}
                      >
                        <Calendar className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                          <span>Daily Management</span>
                          {programDetailTab === "schedule" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          )}
                        </h4>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                          Day 1–{targetDays} Curriculum Modules
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Progress: <strong className="text-zinc-900 dark:text-white font-semibold">{filledCount}/{targetDays}</strong> Days
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isCurriculumComplete
                          ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                          : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {isCurriculumComplete ? "100% Ready" : `${targetDays - filledCount} Days Remaining`}
                    </span>
                  </div>
                </button>

                {/* OPTION 3: MEMBER RESPONSES */}
                <button
                  type="button"
                  onClick={() => {
                    setProgramDetailTab("responses");
                    router.push(
                      `/admin/programs/${selectedProgram.id}?tab=responses&day=${selectedDayNum}`
                    );
                    loadProgramSubmissions(selectedProgram.id);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 relative group ${
                    programDetailTab === "responses"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10 scale-[1.01]"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          programDetailTab === "responses"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                            : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200/70 dark:group-hover:bg-white/15"
                        }`}
                      >
                        <MessageSquareQuote className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 font-geometric">
                          <span>Responses</span>
                          {programDetailTab === "responses" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          )}
                        </h4>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                          Member Accountability Logs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-white/5 w-full">
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Total Submissions
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 font-mono">
                      {selectedProgram.submissionCount ?? programSubmissions.length} Submissions Logged
                    </span>
                  </div>
                </button>
              </div>

              {/* ============================================================= */}
              {/* TAB 1: PROGRAM INFORMATION (EXACT SAME FORM AS CREATE)        */}
              {/* ============================================================= */}
              {programDetailTab === "info" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Lock Warning Card if Program is Published */}
                  {selectedProgram.isPublished && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-5 border border-zinc-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span>Program Terms Locked</span>
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold">
                              Live &amp; Active
                            </span>
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            This program is published and active. Core parameters (pricing, duration, quota, and dates) are locked to protect data integrity and public trust. You can unpublish if no active enrolled members exist.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInitiatePublish(selectedProgram)}
                        disabled={publishingId === selectedProgram.id}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition shrink-0 flex items-center gap-1.5"
                      >
                        {publishingId === selectedProgram.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span>Unpublish Program</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Program Configuration
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Manage metadata, schedule, pricing, community channel, and legal terms.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAllDetailSections(true)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllDetailSections(false)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (selectedProgram.isPublished) return;
                      handleSaveMeta(selectedProgram);
                    }}
                    className="space-y-6"
                  >
                    {/* SECTION 1: PROGRAM INFORMATION (ODD) */}
                    <div className={getSectionCardClass(1, expandedDetailSections[1])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(1)}
                        className={getSectionHeaderClass(1)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(1)}>
                            1
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Program Information
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Core identity, intensity level, banner imagery, and public synopsis
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(1, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[1] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[1] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                          <div className="grid sm:grid-cols-3 gap-5 pt-3">
                            <div className="sm:col-span-2 space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Program Title *
                              </label>
                              <input
                                type="text"
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.title}
                                onChange={(e) =>
                                  setMetaForm((p) => ({ ...p, title: e.target.value }))
                                }
                                placeholder="Enter the program title..."
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Difficulty / Intensity *
                              </label>
                              <select
                                disabled={selectedProgram.isPublished}
                                value={metaForm.difficultyLevel}
                                onChange={(e) =>
                                  setMetaForm((p) => ({ ...p, difficultyLevel: e.target.value }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              >
                                <option value="" disabled>
                                  Choose difficulty...
                                </option>
                                {DIFFICULTY_LEVELS.map((lvl) => (
                                  <option key={lvl.value} value={lvl.value} className="bg-white dark:bg-zinc-900">
                                    {lvl.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Cover / Banner Image with Preview */}
                            <div className="sm:col-span-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Cover / Banner Image URL</span>
                                </label>
                                {metaForm.coverImage && !selectedProgram.isPublished && (
                                  <button
                                    type="button"
                                    onClick={() => setMetaForm((p) => ({ ...p, coverImage: "" }))}
                                    className="text-[10px] text-zinc-500 hover:text-red-500 transition underline"
                                  >
                                    Clear Image
                                  </button>
                                )}
                              </div>
                              <input
                                type="url"
                                disabled={selectedProgram.isPublished}
                                value={metaForm.coverImage}
                                onChange={(e) =>
                                  setMetaForm((p) => ({ ...p, coverImage: e.target.value }))
                                }
                                placeholder="Enter cover image URL..."
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                              <div className="relative h-28 sm:h-36 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                                {metaForm.coverImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={metaForm.coverImage}
                                    alt="Banner Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5 text-zinc-400 text-center px-4">
                                    <ImageIcon className="w-6 h-6 stroke-1 text-zinc-400" />
                                    <span className="text-[11px]">Recommended 16:9 banner preview will appear here</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="sm:col-span-3 space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Short Description *
                              </label>
                              <textarea
                                rows={3}
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.description}
                                onChange={(e) =>
                                  setMetaForm((p) => ({
                                    ...p,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Enter program description..."
                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: PURPOSE, TARGET STATE & SCIENTIFIC BASIS (EVEN) */}
                    <div className={getSectionCardClass(2, expandedDetailSections[2])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(2)}
                        className={getSectionHeaderClass(2)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(2)}>
                            2
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Purpose, Target State &amp; Scientific Basis
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Target physical/mental condition, methodology, tangible benefits, clinical references, and daily guidelines
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(2, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[2] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[2] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
                          <ProgramBlueprintSectionContent
                            disabled={selectedProgram.isPublished}
                            targetState={metaForm.targetState}
                            onChangeTargetState={(val) =>
                              setMetaForm((p) => ({ ...p, targetState: val }))
                            }
                            methodology={metaForm.methodology}
                            onChangeMethodology={(val) =>
                              setMetaForm((p) => ({ ...p, methodology: val }))
                            }
                            expectedBenefits={metaForm.expectedBenefits}
                            onChangeBenefits={(next) =>
                              setMetaForm((p) => ({ ...p, expectedBenefits: next }))
                            }
                            scientificReferences={metaForm.scientificReferences}
                            onChangeReferences={(next) =>
                              setMetaForm((p) => ({ ...p, scientificReferences: next }))
                            }
                            programGuidelines={metaForm.programGuidelines}
                            onChangeGuidelines={(next) =>
                              setMetaForm((p) => ({ ...p, programGuidelines: next }))
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: DIRECTORIES & CLASSIFICATION (ODD) */}
                    <div className={getSectionCardClass(3, expandedDetailSections[3])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(3)}
                        className={getSectionHeaderClass(3)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(3)}>
                            3
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Directories &amp; Classification
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Taxonomy, coaching team, target personas, equipment, and daily commitment
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(3, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[3] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[3] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-6">
                          <div className="space-y-6 pt-3">
                            <DropdownTagPicker
                              label="Category / Categories *"
                              subLabel="Program taxonomy & disciplines (select from master list)"
                              disabled={selectedProgram.isPublished}
                              value={metaForm.category}
                              onChange={(val) => setMetaForm((p) => ({ ...p, category: val }))}
                              options={masterData.categories.map((c) => ({
                                id: c.id,
                                name: c.name,
                              }))}
                              selectPlaceholder="Enter or select category..."
                              onManage={() => navigateToDirectory("categories")}
                              manageLabel="+ Manage in Categories Directory"
                              icon={Tag}
                            />

                            <SingleSelectDirectoryPicker
                              label="Daily Time Commitment *"
                              subLabel="Estimated daily session length"
                              value={metaForm.dailyCommitment}
                              onChange={(val) => setMetaForm((p) => ({ ...p, dailyCommitment: val }))}
                              options={masterData.dailyCommitments || []}
                              onManage={() => navigateToDirectory("commitments")}
                              manageLabel="+ Manage in Commitments Directory"
                              placeholder="Enter or select daily time commitment..."
                              icon={Clock}
                              disabled={selectedProgram.isPublished}
                            />

                            <DropdownTagPicker
                              label="Equipment Needed"
                              subLabel="Required tools & gear (select from master list)"
                              disabled={selectedProgram.isPublished}
                              value={metaForm.equipment}
                              onChange={(val) => setMetaForm((p) => ({ ...p, equipment: val }))}
                              options={masterData.equipment || []}
                              selectPlaceholder="Enter or select equipment..."
                              onManage={() => navigateToDirectory("equipment")}
                              manageLabel="+ Manage in Equipment Directory"
                              icon={Dumbbell}
                            />

                            <DropdownTagPicker
                              label="Coach / Coaches *"
                              subLabel="Instructors assigned to lead this program"
                              disabled={selectedProgram.isPublished}
                              value={metaForm.coachName}
                              onChange={(val) => setMetaForm((p) => ({ ...p, coachName: val }))}
                              options={masterData.coaches.map((c) => ({
                                id: c.id,
                                name: c.name,
                                title: c.title,
                              }))}
                              selectPlaceholder="Enter or select coach..."
                              onManage={() => navigateToDirectory("coaches")}
                              manageLabel="+ Manage in Coaches Directory"
                              icon={UserCheck}
                            />

                            <DropdownTagPicker
                              label="Target Audience (Recommended For) *"
                              subLabel="Ideal participant demographics & personas (e.g. Private Sector Employees, Creative Workers)"
                              disabled={selectedProgram.isPublished}
                              value={metaForm.recommendedFor}
                              onChange={(val) => setMetaForm((p) => ({ ...p, recommendedFor: val }))}
                              options={masterData.targetAudiences.map((a) => ({
                                id: a.id,
                                name: a.name,
                              }))}
                              selectPlaceholder="Enter or select target audience..."
                              onManage={() => navigateToDirectory("audience")}
                              manageLabel="+ Manage in Audience Directory"
                              icon={Sparkles}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: DATES & DURATION (EVEN) */}
                    <div className={getSectionCardClass(4, expandedDetailSections[4])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(4)}
                        className={getSectionHeaderClass(4)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(4)}>
                            4
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Schedule &amp; Duration
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Program run window and registration cutoff timeline in WIB (Asia/Jakarta)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(4, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[4] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[4] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
                          <div className="flex items-center justify-between pt-3 pb-1 border-b border-zinc-300/50 dark:border-zinc-700/50">
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Calendar timeline (WIB • Asia/Jakarta)</span>
                            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium">
                              Duration: {metaForm.durationDays} Days (Day 1 – Day {metaForm.durationDays})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Start Date (WIB) *
                              </label>
                              <input
                                type="date"
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.startDate}
                                onChange={(e) => {
                                  const newStart = e.target.value;
                                  const s = new Date(newStart);
                                  const en = new Date(metaForm.endDate);
                                  const days =
                                    !isNaN(s.getTime()) && !isNaN(en.getTime()) && en >= s
                                      ? Math.max(1, Math.round((en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                      : metaForm.durationDays;
                                  setMetaForm((p) => ({
                                    ...p,
                                    startDate: newStart,
                                    durationDays: days,
                                  }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                End Date (WIB) *
                              </label>
                              <input
                                type="date"
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.endDate}
                                onChange={(e) => {
                                  const newEnd = e.target.value;
                                  const s = new Date(metaForm.startDate);
                                  const en = new Date(newEnd);
                                  const days =
                                    !isNaN(s.getTime()) && !isNaN(en.getTime()) && en >= s
                                      ? Math.max(1, Math.round((en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                      : 1;
                                  setMetaForm((p) => ({
                                    ...p,
                                    endDate: newEnd,
                                    durationDays: days,
                                  }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Registration Open Date (WIB)
                              </label>
                              <input
                                type="date"
                                disabled={selectedProgram.isPublished}
                                value={metaForm.registrationOpenDate}
                                onChange={(e) =>
                                  setMetaForm((p) => ({
                                    ...p,
                                    registrationOpenDate: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Registration Cutoff Date (WIB) *
                              </label>
                              <input
                                type="date"
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.registrationDeadline}
                                onChange={(e) =>
                                  setMetaForm((p) => ({
                                    ...p,
                                    registrationDeadline: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300/70 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Duration is automatically calculated from the date range ({metaForm.durationDays} days). If shortened, schedule entries beyond Day {metaForm.durationDays} will be trimmed. If extended, existing saved days are preserved.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 5: ATTENDANCE MODE & LOCATION (ODD) */}
                    <div className={getSectionCardClass(5, expandedDetailSections[5])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(5)}
                        className={getSectionHeaderClass(5)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(5)}>
                            5
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Attendance Mode &amp; Location
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Delivery format (Online, On-Site studio, or Hybrid) and default location
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(5, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[5] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[5] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                          <div className="grid sm:grid-cols-3 gap-3 pt-3">
                            {[
                              { key: "ONLINE", label: "Online" },
                              { key: "ONSITE", label: "On-Site" },
                              { key: "HYBRID", label: "Online + Onsite" },
                            ].map((mode) => (
                              <button
                                key={mode.key}
                                type="button"
                                disabled={selectedProgram.isPublished}
                                onClick={() =>
                                  setMetaForm((p) => ({
                                    ...p,
                                    locationType: mode.key as "ONLINE" | "ONSITE" | "HYBRID",
                                  }))
                                }
                                className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                                  metaForm.locationType === mode.key
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs border-transparent"
                                    : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>

                          {metaForm.locationType === "ONLINE" ? (
                            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-500/10 text-zinc-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                                  Virtual Online Delivery Selected
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  No physical venue or city address is required for 100% online programs. Sessions take place virtually via daily video links and community access.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid sm:grid-cols-2 gap-5 pt-2">
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  City / Region *
                                </label>
                                <input
                                  type="text"
                                  required
                                  disabled={selectedProgram.isPublished}
                                  value={metaForm.city}
                                  onChange={(e) =>
                                    setMetaForm((p) => ({ ...p, city: e.target.value }))
                                  }
                                  placeholder="Enter city"
                                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  Studio Physical Venue Address *
                                </label>
                                <input
                                  type="text"
                                  required
                                  disabled={selectedProgram.isPublished}
                                  value={metaForm.venueAddress}
                                  onChange={(e) =>
                                    setMetaForm((p) => ({ ...p, venueAddress: e.target.value }))
                                  }
                                  placeholder="Enter venue address"
                                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SECTION 6: PRICING & QUOTA (EVEN) */}
                    <div className={getSectionCardClass(6, expandedDetailSections[6])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(6)}
                        className={getSectionHeaderClass(6)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(6)}>
                            6
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Pricing &amp; Participant Quota
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Enrollment capacity, base price, and optional discount incentive
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(6, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[6] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[6] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Participant Capacity (Seats) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.maxQuota}
                                onChange={(e) =>
                                  setMetaForm((p) => ({
                                    ...p,
                                    maxQuota: Number(e.target.value),
                                  }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Actual Tuition (IDR) *
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                required
                                disabled={selectedProgram.isPublished}
                                value={metaForm.actualPrice}
                                onChange={(e) => {
                                  const actual = Number(e.target.value) || 0;
                                  const disc = Number(metaForm.discountPercentage) || 0;
                                  setMetaForm((p) => ({
                                    ...p,
                                    actualPrice: actual,
                                    price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                                  }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Discount (5% Multiples)
                              </label>
                              <select
                                disabled={selectedProgram.isPublished}
                                value={metaForm.discountPercentage}
                                onChange={(e) => {
                                  const disc = Number(e.target.value) || 0;
                                  const actual = Number(metaForm.actualPrice) || 0;
                                  setMetaForm((p) => ({
                                    ...p,
                                    discountPercentage: disc,
                                    price: Math.max(0, Math.round(actual * (1 - disc / 100))),
                                  }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              >
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((pct) => (
                                  <option key={pct} value={pct} className="bg-white dark:bg-zinc-900">
                                    {pct === 0 ? "0% (No Discount)" : `${pct}% Off`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                Final Calculated Tuition
                              </label>
                              <div className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/15 text-xs font-mono font-bold text-zinc-900 dark:text-white">
                                {metaForm.price === 0
                                  ? "Free"
                                  : `Rp ${metaForm.price.toLocaleString("id-ID")}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 7: COMMUNITY CHANNEL LINK (ODD) */}
                    <div className={getSectionCardClass(7, expandedDetailSections[7])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(7)}
                        className={getSectionHeaderClass(7)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(7)}>
                            7
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Community Channel / Group URL
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Private group link for enrolled members (WhatsApp, Telegram, Discord, etc.)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(7, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[7] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[7] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                          <div className="space-y-2 pt-3">
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Community Channel / Group URL
                            </label>
                            <input
                              type="url"
                              disabled={selectedProgram.isPublished}
                              value={metaForm.communityLink}
                              onChange={(e) =>
                                setMetaForm((p) => ({ ...p, communityLink: e.target.value }))
                              }
                              placeholder="Enter community link (WhatsApp, Discord, Slack, etc.)..."
                              className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 8: TERMS & CONDITIONS (EVEN) */}
                    <div className={getSectionCardClass(8, expandedDetailSections[8])}>
                      <button
                        type="button"
                        onClick={() => toggleDetailSection(8)}
                        className={getSectionHeaderClass(8)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={getSectionBadgeClass(8)}>
                            8
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Terms &amp; Conditions
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              Program rules, health disclaimer, and enrollment terms
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {(() => {
                            const { filled, total } = getProgramSectionStats(8, metaForm);
                            return renderSectionProgressBadge(filled, total);
                          })()}
                          <div className="p-1 rounded-lg text-zinc-400">
                            {expandedDetailSections[8] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {expandedDetailSections[8] && (
                        <div className="px-5 pb-6 sm:px-8 sm:pb-8 pt-2 border-t border-zinc-300/60 dark:border-zinc-700/60">
                          <ProgramTermsChapterBuilder
                            disabled={selectedProgram.isPublished}
                            chapters={metaForm.termsChapters}
                            onChange={(nextChapters) => {
                              const serialized = serializeTermsChapters(nextChapters);
                              const flattened = nextChapters.flatMap((c) => c.clauses);
                              setMetaForm((p) => ({
                                ...p,
                                termsType: "CUSTOM",
                                termsChapters: nextChapters,
                                termsList: flattened,
                                customTerms: serialized,
                              }));
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {selectedProgram.isPublished
                          ? "Program is currently live. Unpublish to adjust core schedule, quota, or pricing parameters."
                          : "Save updates to program information. All daily routines will adjust to new duration."}
                      </span>

                      {selectedProgram.isPublished ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <Lock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Terms locked while live</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={savingMeta}
                          className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-2 shadow-xs hover:opacity-90 transition disabled:opacity-50"
                        >
                          {savingMeta ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : (
                            <Save className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Save Program Information</span>
                        </button>
                      )}
                    </div>

                    {metaError && (
                      <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 font-medium">{metaError}</div>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: DAILY SCHEDULE CURRICULUM                              */}
              {/* ============================================================= */}
              {programDetailTab === "schedule" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Day Selector Card (Horizontal Scroll, Max 5 Days per Page + Index) */}
            {(() => {
              const targetDays = selectedProgram.durationDays || 21;
              const allDays = Array.from({ length: targetDays }, (_, i) => i + 1);
              const totalWeeks = Math.ceil(targetDays / 7);

              let filledCount = 0;
              for (let d = 1; d <= targetDays; d++) {
                if (
                  isDayFilled(selectedProgram.days.find((x) => x.dayNumber === d))
                ) {
                  filledCount++;
                }
              }

              const getDayDateLabel = (dayNum: number): string => {
                if (!selectedProgram.startDate) return "TBA";
                const base = new Date(selectedProgram.startDate);
                if (isNaN(base.getTime())) return "TBA";
                const target = new Date(base);
                target.setDate(base.getDate() + (dayNum - 1));
                return formatDate(target);
              };

              // Determine visible days based on week filter
              const visibleDays =
                scheduleWeekView === "ALL" || totalWeeks <= 1
                  ? allDays
                  : allDays.filter((d) => Math.ceil(d / 7) === scheduleWeekView);

              const percentFilled = Math.round((filledCount / targetDays) * 100);

              return (
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
                  {/* Top Bar: Title, Completion Progress & Controls */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          Daily Schedule
                        </h3>
                        <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                          {filledCount}/{targetDays} Days Complete ({percentFilled}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Select any day card to edit its daily protocol or use previous/next navigation below.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Week Filter Pills (if program has more than 1 week) */}
                      {totalWeeks > 1 && (
                        <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 gap-1 font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={() => setScheduleWeekView("ALL")}
                            className={`px-2.5 py-1 rounded-lg font-medium transition ${
                              scheduleWeekView === "ALL"
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-semibold"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                            }`}
                          >
                            All Days
                          </button>
                          {Array.from({ length: totalWeeks }, (_, wIdx) => {
                            const wNum = wIdx + 1;
                            const isSelectedWeek = scheduleWeekView === wNum;
                            return (
                              <button
                                key={wNum}
                                type="button"
                                onClick={() => setScheduleWeekView(wNum)}
                                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                                  isSelectedWeek
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-semibold"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                                }`}
                              >
                                Week {wNum}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Direct Jump to Any Day */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          Jump to:
                        </label>
                        <select
                          value={selectedDayNum}
                          onChange={(e) => {
                            const d = Number(e.target.value);
                            handleSelectDay(selectedProgram, d);
                            if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                              setScheduleWeekView(Math.ceil(d / 7));
                            }
                          }}
                          className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none cursor-pointer pr-1"
                          title="Jump directly to any day"
                        >
                          {allDays.map((d) => {
                            const isFilled = isDayFilled(
                              selectedProgram.days.find((x) => x.dayNumber === d)
                            );
                            return (
                              <option
                                key={d}
                                value={d}
                                className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              >
                                Day {d} {isFilled ? "✓" : "—"}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 transition-all duration-300 rounded-full"
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>

                  {/* Responsive Day Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {visibleDays.map((dayNum) => {
                      const existing = selectedProgram.days.find(
                        (d) => d.dayNumber === dayNum
                      );
                      const filled = isDayFilled(existing);
                      const isSelected = selectedDayNum === dayNum;
                      const effectiveType = isSelected
                        ? dayForm.dayType
                        : existing?.dayType;

                      const typeLabel =
                        effectiveType === "REST_DAY"
                          ? "Rest"
                          : effectiveType === "CONNECTION_DAY" ||
                            effectiveType === "MEETUP_DAY"
                          ? "Connect"
                          : effectiveType === "TRAINING_DAY"
                          ? "Training"
                          : "Unset";

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => {
                            handleSelectDay(selectedProgram, dayNum);
                            if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                              setScheduleWeekView(Math.ceil(dayNum / 7));
                            }
                          }}
                          className={`p-3 rounded-xl text-left transition flex flex-col justify-between gap-2 border ${
                            isSelected
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-md border-transparent ring-2 ring-zinc-900/10 dark:ring-white/20 scale-[1.02]"
                              : filled
                              ? "bg-zinc-50/90 dark:bg-white/5 border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 shadow-2xs"
                              : "bg-white/50 dark:bg-white/[0.02] border-zinc-200/60 dark:border-white/5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-xs font-bold whitespace-nowrap">
                              Day {dayNum}
                            </span>
                            {filled ? (
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
                                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400"
                                }`}
                                title="Completed"
                              >
                                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span
                              className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md inline-block ${
                                isSelected
                                  ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
                                  : effectiveType === "TRAINING_DAY"
                                  ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                                  : effectiveType === "REST_DAY"
                                  ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                                  : effectiveType === "CONNECTION_DAY" ||
                                    effectiveType === "MEETUP_DAY"
                                  ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                                  : "bg-zinc-100 dark:bg-white/5 text-zinc-400"
                              }`}
                            >
                              {typeLabel}
                            </span>
                            <p className="text-[10px] font-mono opacity-70 truncate block">
                              {getDayDateLabel(dayNum)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Day Navigation Stepper Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        const prevDay = Math.max(1, selectedDayNum - 1);
                        handleSelectDay(selectedProgram, prevDay);
                        if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                          setScheduleWeekView(Math.ceil(prevDay / 7));
                        }
                      }}
                      disabled={selectedDayNum <= 1}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 w-fit"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous Day (Day {selectedDayNum - 1})</span>
                    </button>

                    <div className="flex items-center gap-2.5 self-center text-center">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Editing Day {selectedDayNum} of {targetDays}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {getDayDateLabel(selectedDayNum)}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          dayForm.dayType === "TRAINING_DAY"
                            ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                            : dayForm.dayType === "REST_DAY"
                            ? "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                            : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300"
                        }`}
                      >
                        {dayForm.dayType === "REST_DAY"
                          ? "Rest"
                          : dayForm.dayType === "TRAINING_DAY"
                          ? "Training"
                          : "Connect"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextDay = Math.min(targetDays, selectedDayNum + 1);
                        handleSelectDay(selectedProgram, nextDay);
                        if (totalWeeks > 1 && scheduleWeekView !== "ALL") {
                          setScheduleWeekView(Math.ceil(nextDay / 7));
                        }
                      }}
                      disabled={selectedDayNum >= targetDays}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 w-fit ml-auto sm:ml-0"
                    >
                      <span>Next Day (Day {selectedDayNum + 1})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Day Content Form (5-Point Accordion) */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 sm:p-8 space-y-6 border border-zinc-200/80 dark:border-white/10 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-white/10 pb-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Day {selectedDayNum} Protocol • Curriculum Blueprint
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Select day type on the right to configure daily identity, activities, nutrition, sleep (WIB), and push reminders
                  </p>
                </div>

                {/* Direct Day Type Selector (Replaces Expand/Collapse All) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 gap-1">
                    {(
                      [
                        {
                          value: "TRAINING_DAY",
                          label: "Training",
                          icon: Dumbbell,
                        },
                        {
                          value: "REST_DAY",
                          label: "Rest",
                          icon: Coffee,
                        },
                        {
                          value: "CONNECTION_DAY",
                          label: "Connect",
                          icon: MapPin,
                        },
                      ] as const
                    ).map((typeOpt) => {
                      const Icon = typeOpt.icon;
                      const active =
                        dayForm.dayType === typeOpt.value ||
                        (typeOpt.value === "CONNECTION_DAY" &&
                          dayForm.dayType === "MEETUP_DAY");
                      return (
                        <button
                          key={typeOpt.value}
                          type="button"
                          onClick={() =>
                            setDayForm((p) => ({
                              ...p,
                              dayType: typeOpt.value,
                              dayNotifications: getDefaultNotificationsForType(
                                typeOpt.value
                              ),
                            }))
                          }
                          className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
                            active
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{typeOpt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5-POINT ACCORDION STACK */}
              <div className="space-y-4">
                {/* POINT 1 (ODD - WHITE): DAY IDENTITY & COACH ASSIGNMENT */}
                <div className={getSectionCardClass(1, Boolean(expandedDaySections[1]))}>
                  <button
                    type="button"
                    onClick={() => toggleDaySection(1)}
                    className={getSectionHeaderClass(1)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getSectionBadgeClass(1)}>1</span>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          Day Identity &amp; Coach Assignment
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Day title, assigned coach for today, and target focus persona
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const { filled, total } = getDaySectionStats(1, dayForm);
                        return renderSectionProgressBadge(filled, total);
                      })()}
                      {expandedDaySections[1] ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  </button>

                  {expandedDaySections[1] && (
                    <div className="p-5 sm:p-6 pt-0 space-y-5 border-t border-zinc-100 dark:border-white/10">
                      <div className="pt-4 space-y-1.5">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Day Title *
                        </label>
                        <input
                          type="text"
                          placeholder={`Enter day ${selectedDayNum} title...`}
                          value={dayForm.title}
                          onChange={(e) =>
                            setDayForm((p) => ({ ...p, title: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                      </div>

                      {/* Assigned Coach & Focus Target for Today (Hidden for REST_DAY) */}
                      {dayForm.dayType !== "REST_DAY" && (
                        <div className="grid md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>Assigned Coach for Day {selectedDayNum}</span>
                            </label>

                            <select
                              value={dayForm.coachName}
                              onChange={(e) =>
                                setDayForm((p) => ({ ...p, coachName: e.target.value }))
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            >
                              <option value="">— Select Coach for Today —</option>
                              {parseTagList(selectedProgram.coachName).map((coach, idx) => (
                                <option key={idx} value={coach}>
                                  {coach}
                                </option>
                              ))}
                              {masterData.coaches
                                .filter(
                                  (mc) =>
                                    !parseTagList(selectedProgram.coachName).includes(mc.name)
                                )
                                .map((mc) => (
                                  <option key={mc.id} value={mc.name}>
                                    {mc.name} ({mc.title})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>Day Focus</span>
                            </label>

                            <input
                              type="text"
                              placeholder="Enter day focus"
                              value={dayForm.recommendedFor}
                              onChange={(e) =>
                                setDayForm((p) => ({ ...p, recommendedFor: e.target.value }))
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* POINT 2 (EVEN - MONOCHROME SLATE): CORE ACTIVITY, VIDEOS & SYNCHRONIZED WORKOUT OPTIONS */}
                <div className={getSectionCardClass(2, Boolean(expandedDaySections[2]))}>
                  <button
                    type="button"
                    onClick={() => toggleDaySection(2)}
                    className={getSectionHeaderClass(2)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getSectionBadgeClass(2)}>2</span>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          {dayForm.dayType === "TRAINING_DAY"
                            ? "Training Videos, Workout Options & Movement Checklists"
                            : dayForm.dayType === "REST_DAY"
                            ? "Parasympathetic Restoration & Recovery Protocol"
                            : "Studio Venue, Schedule (WIB) & Virtual Stream"}
                        </h4>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {dayForm.dayType === "TRAINING_DAY"
                            ? `${dayForm.videoLinks.filter((v) => v.url.trim()).length} YouTube video link(s) • ${dayForm.workoutGroups.length} synchronized workout option(s)`
                            : dayForm.dayType === "REST_DAY"
                            ? "Active decompression, nervous system reset, and mobility guidance"
                            : "Onsite studio venue, WIB session schedule, Google Maps link, and virtual broadcast"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const { filled, total } = getDaySectionStats(2, dayForm);
                        return renderSectionProgressBadge(filled, total);
                      })()}
                      {expandedDaySections[2] ? (
                        <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedDaySections[2] && (
                    <div className="p-5 sm:p-6 pt-0 space-y-6 border-t border-zinc-300/80 dark:border-zinc-700">
                      {/* MODE A: TRAINING_DAY */}
                      {dayForm.dayType === "TRAINING_DAY" && (
                        <div className="space-y-6 pt-4">
                          {/* SUB-BLOCK 2A: MULTI-VIDEO LINKS BUILDER */}
                          <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 space-y-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/10 pb-3">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                  <span>YouTube Coaching Video Links ({dayForm.videoLinks.length})</span>
                                </label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  Add 1 or more YouTube videos for today&apos;s training session (e.g. main workout, warm-up, or alternative modality video)
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setDayForm((p) => ({
                                    ...p,
                                    videoLinks: [
                                      ...p.videoLinks,
                                      {
                                        title: `Video Session ${p.videoLinks.length + 1}`,
                                        url: "",
                                      },
                                    ],
                                  }))
                                }
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 w-fit shrink-0 hover:opacity-90 transition shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>Add Video Link</span>
                              </button>
                            </div>

                            <div className="space-y-2.5">
                              {dayForm.videoLinks.map((vid, vIdx) => {
                                const isEvenRow = (vIdx + 1) % 2 === 0;
                                return (
                                  <div
                                    key={vIdx}
                                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${
                                      isEvenRow
                                        ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                    }`}
                                  >
                                    <span
                                      className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        isEvenRow
                                          ? "bg-white text-zinc-950 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                                          : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                                      }`}
                                    >
                                      {vIdx + 1}
                                    </span>

                                    <div className="sm:w-1/3">
                                      <input
                                        type="text"
                                        placeholder="Enter video session title"
                                        value={vid.title}
                                        onChange={(e) => {
                                          const next = [...dayForm.videoLinks];
                                          next[vIdx] = { ...next[vIdx], title: e.target.value };
                                          setDayForm((p) => ({ ...p, videoLinks: next }));
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                      />
                                    </div>

                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        type="url"
                                        placeholder="Enter YouTube video URL (https://www.youtube.com/watch?v=...)..."
                                        value={vid.url}
                                        onChange={(e) => {
                                          const next = [...dayForm.videoLinks];
                                          next[vIdx] = { ...next[vIdx], url: e.target.value };
                                          setDayForm((p) => ({ ...p, videoLinks: next }));
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                      />

                                      {dayForm.videoLinks.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDayForm((p) => ({
                                              ...p,
                                              videoLinks: p.videoLinks.filter(
                                                (_, i) => i !== vIdx
                                              ),
                                            }))
                                          }
                                          className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                                          title="Remove video link"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* SUB-BLOCK 2B: SYNCHRONIZED WORKOUT OPTIONS & MOVEMENT CHECKLISTS */}
                          <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 space-y-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/10 pb-3">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                                  <Dumbbell className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                  <span>
                                    Synchronized Workout Options &amp; Movement Checklists (
                                    {dayForm.workoutGroups.length} Options)
                                  </span>
                                </label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  Each Workout Option has its own aligned movement checklist &amp; recommended reps. Members select an option in their dashboard and check off the recommended reps or enter their actual reps achieved.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setDayForm((p) => ({
                                    ...p,
                                    workoutGroups: [
                                      ...p.workoutGroups,
                                      {
                                        optionName: "",
                                        movements: [{ name: "", target: "" }],
                                      },
                                    ],
                                  }))
                                }
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 w-fit shrink-0 hover:opacity-90 transition shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>Add Workout Option</span>
                              </button>
                            </div>

                            {/* Quick Preset Option Templates */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400 font-medium">
                                Quick add option template:
                              </span>
                              {[
                                {
                                  optionName: "Workout",
                                  movements: [
                                    { name: "Push-up", target: "30 reps" },
                                    { name: "Sit-up", target: "50 reps" },
                                    { name: "Pull-up", target: "10 reps" },
                                  ],
                                },
                                {
                                  optionName: "Pilates",
                                  movements: [
                                    { name: "Move A (Hundred)", target: "100 beats" },
                                    { name: "Move B (Roll Up)", target: "15 reps" },
                                    { name: "Move C (Leg Circles)", target: "20 reps" },
                                  ],
                                },
                                {
                                  optionName: "Yoga",
                                  movements: [
                                    { name: "Form A (Sun Salutation)", target: "5 rounds" },
                                    { name: "Form B (Warrior Flow)", target: "60 secs" },
                                    { name: "Form C (Seated Forward Fold)", target: "90 secs" },
                                  ],
                                },
                                {
                                  optionName: "Cardio / HIIT",
                                  movements: [
                                    { name: "Burpees", target: "20 reps" },
                                    { name: "Mountain Climbers", target: "45 secs" },
                                    { name: "Jump Squats", target: "25 reps" },
                                  ],
                                },
                              ].map((preset, pIdx) => {
                                const alreadyExists = dayForm.workoutGroups.some(
                                  (g) =>
                                    g.optionName.trim().toLowerCase() ===
                                    preset.optionName.toLowerCase()
                                );
                                if (alreadyExists) return null;
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() =>
                                      setDayForm((p) => ({
                                        ...p,
                                        workoutGroups: [
                                          ...p.workoutGroups,
                                          {
                                            optionName: preset.optionName,
                                            movements: preset.movements.map((m) => ({
                                              ...m,
                                            })),
                                          },
                                        ],
                                      }))
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition"
                                  >
                                    + {preset.optionName}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Workout Option Groups List */}
                            <div className="space-y-4">
                              {dayForm.workoutGroups.map((group, gIdx) => {
                                const isEvenGroup = (gIdx + 1) % 2 === 0;
                                return (
                                  <div
                                    key={gIdx}
                                    className={`rounded-xl p-4 space-y-3.5 border ${
                                      isEvenGroup
                                        ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                    }`}
                                  >
                                    {/* Option Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200/80 dark:border-white/10">
                                      <div className="flex items-center gap-2.5 flex-1">
                                        <span
                                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                            isEvenGroup
                                              ? "bg-white text-zinc-950 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                                              : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                                          }`}
                                        >
                                          Option {gIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder="Enter workout option name"
                                          value={group.optionName}
                                          onChange={(e) => {
                                            const next = [...dayForm.workoutGroups];
                                            next[gIdx] = {
                                              ...next[gIdx],
                                              optionName: e.target.value,
                                            };
                                            setDayForm((p) => ({
                                              ...p,
                                              workoutGroups: next,
                                            }));
                                          }}
                                          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 placeholder:font-normal"
                                        />
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...dayForm.workoutGroups];
                                            next[gIdx] = {
                                              ...next[gIdx],
                                              movements: [
                                                ...next[gIdx].movements,
                                                { name: "", target: "" },
                                              ],
                                            };
                                            setDayForm((p) => ({
                                              ...p,
                                              workoutGroups: next,
                                            }));
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition"
                                        >
                                          <Plus className="w-3 h-3 shrink-0" />
                                          <span>Add Movement</span>
                                        </button>

                                        {dayForm.workoutGroups.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDayForm((p) => ({
                                                ...p,
                                                workoutGroups: p.workoutGroups.filter(
                                                  (_, i) => i !== gIdx
                                                ),
                                              }))
                                            }
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                            title="Remove workout option"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Movements Checklist inside this Option */}
                                    <div className="space-y-2">
                                      <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        <div className="col-span-7">
                                          Movement / Exercise / Form Name *
                                        </div>
                                        <div className="col-span-5">
                                          Recommended Target Reps / Duration *
                                        </div>
                                      </div>

                                      {group.movements.map((mov, mIdx) => (
                                        <div
                                          key={mIdx}
                                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                                        >
                                          <div className="sm:col-span-7 flex items-center gap-2">
                                            <span className="text-[11px] font-mono text-zinc-400 w-5 text-right shrink-0">
                                              {mIdx + 1}.
                                            </span>
                                            <input
                                              type="text"
                                              placeholder="Enter movement or form name"
                                              value={mov.name}
                                              onChange={(e) => {
                                                const next = [...dayForm.workoutGroups];
                                                const nextMovs = [...next[gIdx].movements];
                                                nextMovs[mIdx] = {
                                                  ...nextMovs[mIdx],
                                                  name: e.target.value,
                                                };
                                                next[gIdx] = {
                                                  ...next[gIdx],
                                                  movements: nextMovs,
                                                };
                                                setDayForm((p) => ({
                                                  ...p,
                                                  workoutGroups: next,
                                                }));
                                              }}
                                              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                            />
                                          </div>

                                          <div className="sm:col-span-5 flex items-center gap-2 pl-7 sm:pl-0">
                                            <input
                                              type="text"
                                              placeholder="Enter recommended target"
                                              value={mov.target}
                                              onChange={(e) => {
                                                const next = [...dayForm.workoutGroups];
                                                const nextMovs = [...next[gIdx].movements];
                                                nextMovs[mIdx] = {
                                                  ...nextMovs[mIdx],
                                                  target: e.target.value,
                                                };
                                                next[gIdx] = {
                                                  ...next[gIdx],
                                                  movements: nextMovs,
                                                };
                                                setDayForm((p) => ({
                                                  ...p,
                                                  workoutGroups: next,
                                                }));
                                              }}
                                              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400 placeholder:font-sans"
                                            />

                                            {group.movements.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const next = [...dayForm.workoutGroups];
                                                  next[gIdx] = {
                                                    ...next[gIdx],
                                                    movements: next[gIdx].movements.filter(
                                                      (_, i) => i !== mIdx
                                                    ),
                                                  };
                                                  setDayForm((p) => ({
                                                    ...p,
                                                    workoutGroups: next,
                                                  }));
                                                }}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 transition shrink-0"
                                                title="Remove movement"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MODE B: REST_DAY */}
                      {dayForm.dayType === "REST_DAY" && (
                        <div className="space-y-2 pt-4">
                          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                            Parasympathetic Restoration &amp; Recovery Guide *
                          </label>
                          <textarea
                            rows={5}
                            placeholder="Enter parasympathetic restoration guide"
                            value={dayForm.restInstructions}
                            onChange={(e) =>
                              setDayForm((p) => ({
                                ...p,
                                restInstructions: e.target.value,
                              }))
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                          />
                        </div>
                      )}

                      {/* MODE C: CONNECTION_DAY / MEETUP_DAY */}
                      {(dayForm.dayType === "CONNECTION_DAY" ||
                        dayForm.dayType === "MEETUP_DAY") && (
                        <div className="space-y-5 pt-4">
                          {/* Row 1: Event Title & Schedule (Max 2 columns) */}
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Event / Meetup Title *
                              </label>
                              <input
                                type="text"
                                placeholder="Enter event or meetup title..."
                                value={dayForm.eventTitle}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    eventTitle: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Session Schedule (WIB) *
                              </label>
                              <input
                                type="text"
                                placeholder="Enter session time in WIB"
                                value={dayForm.onsiteSchedule}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    onsiteSchedule: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>
                          </div>

                          {/* Row 2: Studio Venue & Google Maps Link (Max 2 columns) */}
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Location / Studio Venue *
                              </label>
                              <input
                                type="text"
                                placeholder="Enter studio venue and location in Jakarta..."
                                value={dayForm.onsiteVenue}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    onsiteVenue: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Google Maps Link (Venue URL)
                              </label>
                              <input
                                type="url"
                                placeholder="Enter Google Maps venue URL (https://maps.app.goo.gl/...)..."
                                value={dayForm.mapLink}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    mapLink: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>
                          </div>

                          {/* Row 3: Event Host & Virtual Fallback Link (Max 2 columns) */}
                          <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Who Members Will Meet (Host / Coach)
                              </label>
                              <input
                                type="text"
                                placeholder="Enter event host or coach name..."
                                value={dayForm.eventHost}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    eventHost: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                Virtual Broadcast Link (Remote Fallback)
                              </label>
                              <input
                                type="url"
                                placeholder="Enter virtual broadcast link (https://meet.google.com/...)..."
                                value={dayForm.meetupLink}
                                onChange={(e) =>
                                  setDayForm((p) => ({
                                    ...p,
                                    meetupLink: e.target.value,
                                  }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                              />
                            </div>
                          </div>

                          {/* Row 4: Event Details & Rundown */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
                              Event Details &amp; Agenda Rundown (WIB)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Enter event details and agenda rundown in WIB..."
                              value={dayForm.eventDetails}
                              onChange={(e) =>
                                setDayForm((p) => ({
                                  ...p,
                                  eventDetails: e.target.value,
                                }))
                              }
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* POINT 3 (ODD - WHITE): DAILY NUTRITION & HYDRATION GUIDE */}
                <div className={getSectionCardClass(3, Boolean(expandedDaySections[3]))}>
                  <button
                    type="button"
                    onClick={() => toggleDaySection(3)}
                    className={getSectionHeaderClass(3)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getSectionBadgeClass(3)}>3</span>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          Daily Nutrition &amp; Hydration Guide
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Prescribed daily meals, pre/post-session fueling, and hydration targets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const { filled, total } = getDaySectionStats(3, dayForm);
                        return renderSectionProgressBadge(filled, total);
                      })()}
                      {expandedDaySections[3] ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedDaySections[3] && (
                    <div className="p-5 sm:p-6 pt-0 space-y-3 border-t border-zinc-100 dark:border-white/10">
                      <div className="pt-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Meal Recommendation &amp; Hydration Guide</span>
                          </label>

                          <div className="flex items-center gap-2">
                            {selectedDayNum > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prev = selectedProgram?.days?.find(
                                    (d) => d.dayNumber === selectedDayNum - 1
                                  );
                                  if (prev?.mealRecommendation) {
                                    setDayForm((p) => ({
                                      ...p,
                                      mealRecommendation: prev.mealRecommendation || "",
                                    }));
                                  }
                                }}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition active:scale-95 inline-flex items-center gap-1"
                              >
                                <span>Copy from Day {selectedDayNum - 1}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setDayForm((p) => ({
                                  ...p,
                                  mealRecommendation:
                                    "Breakfast: High-protein Greek yogurt with chia seeds and mixed berries\nLunch: Grilled chicken breast with quinoa and steamed greens\nDinner: Wild-caught salmon with asparagus and avocado salad\nHydration: 2.5L filtered water with electrolytes",
                                }));
                              }}
                              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition active:scale-95 inline-flex items-center gap-1"
                            >
                              <span>3 Meals Preset</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Each line entered below becomes a checklist item for members (Meal 1, Meal 2, Meal 3).
                        </p>

                        <textarea
                          rows={4}
                          placeholder="Enter recommended meals (each line becomes a checklist meal for members)"
                          value={dayForm.mealRecommendation}
                          onChange={(e) =>
                            setDayForm((p) => ({
                              ...p,
                              mealRecommendation: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* POINT 4 (EVEN - MONOCHROME SLATE): CIRCADIAN SLEEP RECOMMENDATION (WIB) */}
                <div className={getSectionCardClass(4, Boolean(expandedDaySections[4]))}>
                  <button
                    type="button"
                    onClick={() => toggleDaySection(4)}
                    className={getSectionHeaderClass(4)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getSectionBadgeClass(4)}>4</span>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          Circadian Sleep Recommendation (WIB)
                        </h4>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Evening wind-down target and circadian sleep schedule in WIB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const { filled, total } = getDaySectionStats(4, dayForm);
                        return renderSectionProgressBadge(filled, total);
                      })()}
                      {expandedDaySections[4] ? (
                        <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedDaySections[4] && (
                    <div className="p-5 sm:p-6 pt-0 space-y-2 border-t border-zinc-300/80 dark:border-zinc-700">
                      <div className="pt-4 space-y-1.5">
                        <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>Circadian Sleep Target &amp; Wind-Down Time (WIB)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter circadian sleep recommendation"
                          value={dayForm.sleepRecommendation}
                          onChange={(e) =>
                            setDayForm((p) => ({ ...p, sleepRecommendation: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                        />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-light">
                          Displayed on the member&apos;s Morning Awakening &amp; Evening Wind-down cockpit card.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* POINT 5 (ODD - WHITE): SCHEDULED PUSH NOTIFICATIONS (WIB) */}
                <div className={getSectionCardClass(5, Boolean(expandedDaySections[5]))}>
                  <button
                    type="button"
                    onClick={() => toggleDaySection(5)}
                    className={getSectionHeaderClass(5)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={getSectionBadgeClass(5)}>5</span>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                          Scheduled Push Notifications ({dayForm.dayNotifications?.length || 0} • WIB)
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {dayForm.dayType === "REST_DAY"
                            ? "2 automated push reminders configured for Rest Day (WIB)"
                            : "3 automated push reminders configured for daily routine (WIB)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const { filled, total } = getDaySectionStats(5, dayForm);
                        return renderSectionProgressBadge(filled, total);
                      })()}
                      {expandedDaySections[5] ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedDaySections[5] && (
                    <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/10">
                      <div className="space-y-3.5 pt-4">
                        {(dayForm.dayNotifications || []).map((notif, idx) => {
                          const isEvenNotif = (idx + 1) % 2 === 0;
                          return (
                            <div
                              key={idx}
                              className={`rounded-xl p-4 space-y-3 border ${
                                isEvenNotif
                                  ? "bg-zinc-200/85 dark:bg-zinc-800/85 border-zinc-300 dark:border-zinc-700"
                                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <span
                                  className={`self-start px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold ${
                                    isEvenNotif
                                      ? "bg-white text-zinc-900 border border-zinc-400 dark:bg-zinc-950 dark:text-white dark:border-zinc-500"
                                      : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                                  }`}
                                >
                                  {notif.label || `Reminder ${idx + 1}`}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                  <input
                                    type="time"
                                    value={notif.time}
                                    onChange={(e) => {
                                      const updated = [...dayForm.dayNotifications];
                                      updated[idx] = { ...updated[idx], time: e.target.value };
                                      setDayForm((p) => ({ ...p, dayNotifications: updated }));
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs font-mono font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                  />
                                  <span className="text-[10px] font-mono font-medium text-zinc-500">WIB</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                                  Notification Message
                                </label>
                                <textarea
                                  rows={2}
                                  value={notif.message}
                                  onChange={(e) => {
                                    const updated = [...dayForm.dayNotifications];
                                    updated[idx] = { ...updated[idx], message: e.target.value };
                                    setDayForm((p) => ({ ...p, dayNotifications: updated }));
                                  }}
                                  placeholder="Enter notification message body..."
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedProgram.days.some(
                    (d) => d.dayNumber === selectedDayNum
                  ) && (
                    <button
                      type="button"
                      onClick={() => handleClearDay(selectedProgram)}
                      disabled={savingDay}
                      className="px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition border border-red-200/60 dark:border-red-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Clear Day {selectedDayNum}</span>
                    </button>
                  )}
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    Changes save directly to program schedule in the SQLite database.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveDay(selectedProgram, false)}
                    disabled={savingDay}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition disabled:opacity-50"
                  >
                    {savingDay ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Save className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Save Day {selectedDayNum}</span>
                  </button>

                  {selectedDayNum < selectedProgram.durationDays && (
                    <button
                      type="button"
                      onClick={() => handleSaveDay(selectedProgram, true)}
                      disabled={savingDay}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-2 whitespace-nowrap shadow-xs hover:opacity-90 transition disabled:opacity-50"
                    >
                      {savingDay ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <>
                          <span>Save &amp; Next Day</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {dayError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{dayError}</div>
                </div>
              )}
            </div>
          </div>
        )}

              {/* ============================================================= */}
              {/* TAB 3: MEMBER SUBMISSIONS & VIEW RESPONSES                     */}
              {/* ============================================================= */}
              {programDetailTab === "responses" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top Stats Overview (4 Cards) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span className="text-xs font-medium">Total Responses</span>
                        <MessageSquareQuote className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                        {submissionStats.totalSubmissions}
                      </div>
                      <p className="text-[11px] text-zinc-500">Across all curriculum days</p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span className="text-xs font-medium">Completed Days</span>
                        <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                        {submissionStats.completedSubmissions}
                      </div>
                      <p className="text-[11px] text-zinc-500">Fully validated routines</p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span className="text-xs font-medium">Photo Logs</span>
                        <Camera className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                        {submissionStats.photoSubmissions}
                      </div>
                      <p className="text-[11px] text-zinc-500">Before &amp; After photo submissions</p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span className="text-xs font-medium">Active Members</span>
                        <Users className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                        {submissionStats.uniqueMembers}
                      </div>
                      <p className="text-[11px] text-zinc-500">Distinct participants engaged</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-3.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Day Filter */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-500">Day:</span>
                          <select
                            value={submissionDayFilter}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubmissionDayFilter(val === "ALL" ? "ALL" : parseInt(val, 10));
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          >
                            <option value="ALL">All Days (1 - {selectedProgram.durationDays || 21})</option>
                            {Array.from({ length: selectedProgram.durationDays || 21 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Day {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Member Filter */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-500">Member:</span>
                          <select
                            value={submissionMemberFilter}
                            onChange={(e) => setSubmissionMemberFilter(e.target.value)}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[200px] truncate"
                          >
                            <option value="ALL">All Members</option>
                            {Array.from(new Set(programSubmissions.map((s) => s.userId))).map((uid) => {
                              const match = programSubmissions.find((s) => s.userId === uid);
                              return (
                                <option key={uid} value={uid}>
                                  {match?.userName || "Member"}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Photos Only Toggle */}
                        <button
                          type="button"
                          onClick={() => setSubmissionPhotosOnly((p) => !p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                            submissionPhotosOnly
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                              : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:bg-zinc-100"
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photos Only</span>
                        </button>
                      </div>

                      {/* Search & Refresh */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search notes, reflections, members..."
                            value={submissionSearch}
                            onChange={(e) => setSubmissionSearch(e.target.value)}
                            className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                          {submissionSearch && (
                            <button
                              type="button"
                              onClick={() => setSubmissionSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => loadProgramSubmissions(selectedProgram.id)}
                          disabled={submissionsLoading}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                          title="Refresh responses"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${submissionsLoading ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(submissionDayFilter !== "ALL" || submissionMemberFilter !== "ALL" || submissionPhotosOnly || submissionSearch) && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-xs text-zinc-500">
                        <span>
                          Showing <strong>{filteredSubmissions.length}</strong> of {programSubmissions.length} response(s)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionDayFilter("ALL");
                            setSubmissionMemberFilter("ALL");
                            setSubmissionPhotosOnly(false);
                            setSubmissionSearch("");
                          }}
                          className="text-zinc-700 dark:text-zinc-300 hover:underline text-[11px]"
                        >
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content State: Loading, Error, Empty, or Feed */}
                  {submissionsLoading ? (
                    <div
                      role="status"
                      aria-label="Loading member submissions"
                      className="p-6 space-y-4 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        <span>Loading member submissions...</span>
                      </div>
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border border-zinc-200/70 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="h-4 w-36 skeleton-block" />
                            <div className="h-4 w-20 skeleton-block" />
                          </div>
                          <div className="h-3.5 w-3/4 skeleton-block" />
                          <div className="h-12 w-full skeleton-block" />
                        </div>
                        <div className="p-4 rounded-xl border border-zinc-200/70 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="h-4 w-32 skeleton-block" />
                            <div className="h-4 w-20 skeleton-block" />
                          </div>
                          <div className="h-3.5 w-2/3 skeleton-block" />
                          <div className="h-12 w-full skeleton-block" />
                        </div>
                      </div>
                    </div>
                  ) : submissionsError ? (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-xs text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">{submissionsError}</p>
                        <button
                          type="button"
                          onClick={() => loadProgramSubmissions(selectedProgram.id)}
                          className="mt-2 underline font-medium"
                        >
                          Retry loading responses
                        </button>
                      </div>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div className="py-16 px-6 text-center space-y-4 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 mx-auto flex items-center justify-center text-zinc-400">
                        <MessageSquareQuote className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          No Member Responses Found
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {programSubmissions.length === 0
                            ? "No member inputs recorded yet for this program. Once active participants log workout completions, upload progress photos, or write daily reflections, they will appear here."
                            : "No submissions match your active filters. Try adjusting your day or member filter."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredSubmissions.map((sub) => {
                        const dateFormatted = sub.completedAt
                          ? new Date(sub.completedAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(sub.updatedAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });

                        return (
                          <div
                            key={sub.id}
                            className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4 transition hover:border-zinc-300 dark:hover:border-white/20"
                          >
                            {/* Card Top: Member & Day Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0">
                                  {sub.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                                      {sub.userName}
                                    </h4>
                                    <span className="text-[11px] text-zinc-400 font-normal">
                                      ({sub.userEmail})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 font-mono">
                                    Submitted: {dateFormatted}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 font-mono">
                                  <span>Day {sub.dayNumber}</span>
                                  <span className="text-zinc-400">•</span>
                                  <span className="font-sans font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]">
                                    {sub.dayTitle}
                                  </span>
                                </span>

                                {sub.isCompleted ? (
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-900/50 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Completed</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-900/50">
                                    In Progress
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Before & After Photo Comparison Showcase */}
                            {(sub.photoBeforeUrl || sub.photoAfterUrl) && (
                              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Progress Photo Comparison</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxData({
                                        beforeUrl: sub.photoBeforeUrl,
                                        afterUrl: sub.photoAfterUrl,
                                        title: sub.dayTitle,
                                        memberName: sub.userName,
                                        dayNumber: sub.dayNumber,
                                        dateStr: dateFormatted,
                                      })
                                    }
                                    className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium transition"
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>Compare Full Size</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Before Photo */}
                                  <div
                                    onClick={() =>
                                      setLightboxData({
                                        beforeUrl: sub.photoBeforeUrl,
                                        afterUrl: sub.photoAfterUrl,
                                        title: sub.dayTitle,
                                        memberName: sub.userName,
                                        dayNumber: sub.dayNumber,
                                        dateStr: dateFormatted,
                                      })
                                    }
                                    className="cursor-pointer group relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-200/50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center"
                                  >
                                    {sub.photoBeforeUrl ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={sub.photoBeforeUrl}
                                          alt="Before"
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <ZoomIn className="w-5 h-5 text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-xs text-zinc-400">No before photo</span>
                                    )}
                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-zinc-900/80 text-white backdrop-blur-xs">
                                      Before
                                    </span>
                                  </div>

                                  {/* After Photo */}
                                  <div
                                    onClick={() =>
                                      setLightboxData({
                                        beforeUrl: sub.photoBeforeUrl,
                                        afterUrl: sub.photoAfterUrl,
                                        title: sub.dayTitle,
                                        memberName: sub.userName,
                                        dayNumber: sub.dayNumber,
                                        dateStr: dateFormatted,
                                      })
                                    }
                                    className="cursor-pointer group relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-200/50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center"
                                  >
                                    {sub.photoAfterUrl ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={sub.photoAfterUrl}
                                          alt="After"
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <ZoomIn className="w-5 h-5 text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-xs text-zinc-400">No after photo</span>
                                    )}
                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-zinc-900/80 text-white backdrop-blur-xs">
                                      After
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Daily Reflection & Notes */}
                            {(sub.dailyReflection || sub.workoutNotes || sub.eventFeedback || sub.assessmentResponse) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sub.dailyReflection && (
                                  <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-zinc-500" />
                                      <span>Daily Reflection</span>
                                    </span>
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                                      &ldquo;{sub.dailyReflection}&rdquo;
                                    </p>
                                  </div>
                                )}

                                {sub.workoutNotes && (
                                  <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                      <Dumbbell className="w-3 h-3 text-zinc-500" />
                                      <span>Workout Notes</span>
                                    </span>
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                      {sub.workoutNotes}
                                    </p>
                                  </div>
                                )}

                                {sub.assessmentResponse && (
                                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                                      <span>Self Assessment</span>
                                    </span>
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                      {sub.assessmentResponse}
                                    </p>
                                  </div>
                                )}

                                {sub.eventFeedback && (
                                  <div className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                      <Users className="w-3 h-3 text-zinc-500" />
                                      <span>Event Feedback</span>
                                    </span>
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                      {sub.eventFeedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Telemetry & Habit Footer Pills */}
                            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                              {/* Mood / Happiness */}
                              {sub.happinessRate !== null && sub.happinessRate !== undefined && (
                                <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                                  <Smile className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[11px] font-medium">Mood:</span>
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }, (_, idx) => (
                                      <Star
                                        key={idx}
                                        className={`w-3 h-3 ${
                                          idx < sub.happinessRate!
                                            ? "text-zinc-400 fill-amber-400"
                                            : "text-zinc-300 dark:text-zinc-600"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sleep Telemetry */}
                              {(sub.sleepDurationMinutes || sub.bedtime) && (
                                <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Moon className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="text-[11px] font-medium">Sleep:</span>
                                  <span className="font-mono text-[11px]">
                                    {sub.sleepDurationMinutes
                                      ? `${Math.floor(sub.sleepDurationMinutes / 60)}h ${sub.sleepDurationMinutes % 60}m`
                                      : `${sub.bedtime || ""} - ${sub.wakeTime || ""}`}
                                  </span>
                                </div>
                              )}

                              {/* Meal Compliance */}
                              {sub.mealCompliance && (
                                <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Utensils className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[11px] font-medium">Meal:</span>
                                  <span className="text-[11px] font-semibold">{sub.mealCompliance}</span>
                                </div>
                              )}

                              {/* Video Watched */}
                              <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                <Video className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-[11px]">
                                  {sub.videoWatched ? "Video Completed" : "Video Pending"}
                                </span>
                              </div>

                              {/* Selected Workout */}
                              {sub.selectedWorkout && (
                                <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="text-[11px] font-medium">{sub.selectedWorkout}</span>
                                </div>
                              )}

                              {/* Checklist Items Count */}
                              {sub.checklistCompleted && sub.checklistCompleted.length > 0 && (
                                <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-[11px]">
                                    {sub.checklistCompleted.length} Checklist Tasks Done
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
      </div>
    );
  })()}

        {/* ================================================================= */}
        {/* VIEW 2A: CUSTOMER DETAIL (FULL PAGE VIEW)                      */}
        {/* ================================================================= */}
        {activeMenu === "members" && inspectingUserHealth && (() => {
          const u = inspectingUserHealth;
          const profile = u.healthProfile;
          const enrollments = u.enrollments || [];
          const dayProgress = u.dayProgress || [];
          const completedDaysCount = dayProgress.filter((p) => p.isCompleted).length;

          // Compute BMI live based on input or saved profile
          const activeWeight = customerWeight ? Number(customerWeight) : profile?.weightKg;
          const activeHeight = customerHeight ? Number(customerHeight) : profile?.heightCm;
          const heightM = activeHeight && activeHeight > 0 ? activeHeight / 100 : null;
          const bmiValue =
            activeWeight && heightM && heightM > 0
              ? (activeWeight / (heightM * heightM)).toFixed(1)
              : null;
          const bmiCategory = bmiValue
            ? Number(bmiValue) < 18.5
              ? "Underweight"
              : Number(bmiValue) < 25
              ? "Normal"
              : Number(bmiValue) < 30
              ? "Overweight"
              : "Obese"
            : null;

          const cleanPhone = u.phone ? u.phone.replace(/[^0-9]/g, "") : "";
          const waNumber = cleanPhone.startsWith("08")
            ? "62" + cleanPhone.slice(1)
            : cleanPhone.startsWith("62")
            ? cleanPhone
            : cleanPhone;
          const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;

          const hasSafetyAlert = Boolean(
            customerInjuries.trim() ||
            customerAllergies.trim() ||
            profile?.injuriesOrConditions?.trim() ||
            profile?.foodAllergies?.trim()
          );

          // 3 Core Pillars: "overview" (Programs & Responses), "health" (Personal & Health), "notes" (Coach Notes)
          const activeCustomerTab =
            customerModalTab === "responses"
              ? "overview"
              : customerModalTab === "medical" || customerModalTab === "lifestyle"
              ? "health"
              : customerModalTab;

          // Selected program for drill-down responses
          const selectedEnrollment = selectedCustomerProgramId
            ? enrollments.find((e) => e.program?.id === selectedCustomerProgramId)
            : null;
          const selectedProgram = selectedEnrollment?.program || null;

          return (
            <div className="space-y-5">
              {/* Customer Detail Header Summary Widget */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={closeCustomerDetail}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition w-fit"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Customers
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                        u.status === "ACTIVE"
                          ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === "ACTIVE" ? "bg-zinc-500" : "bg-red-500"
                        }`}
                      />
                      <span>{u.status}</span>
                    </span>

                    <span className="inline-flex items-center px-2 py-1 rounded-xl text-xs font-mono font-semibold uppercase bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                      {u.role}
                    </span>

                    {/* WhatsApp Quick Link */}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 text-xs font-semibold border border-zinc-500/20 transition flex items-center gap-1.5"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}

                    {/* Reset Password */}
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u)}
                      disabled={userActionLoading === u.id}
                      className="px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Reset Password</span>
                    </button>

                    {u.id !== currentAdminId && u.role !== "SUPERADMIN" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={userActionLoading === u.id}
                          className="px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-medium flex items-center gap-1 transition"
                          title={u.status === "ACTIVE" ? "Suspend user" : "Activate user"}
                        >
                          <Ban className="w-3 h-3 text-zinc-500" />
                          <span>{u.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={userActionLoading === u.id}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-zinc-200/70 dark:border-white/10"
                          title="Delete customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Persona Profile Row */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-base flex items-center justify-center shadow-xs shrink-0 font-geometric">
                    {u.fullName
                      ? u.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "CU"}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-geometric font-bold text-zinc-900 dark:text-white truncate">
                        {u.fullName}
                      </h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                        ID: {u.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span>{u.email}</span>
                      </span>

                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-zinc-400" />
                          <span>{u.phone}</span>
                        </span>
                      )}

                      {u.occupation && (
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-zinc-400" />
                          <span>{u.occupation}</span>
                        </span>
                      )}

                      {(u.city || u.province) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{[u.city, u.province].filter(Boolean).join(", ")}</span>
                        </span>
                      )}

                      <span className="text-zinc-400 font-mono text-[11px]">
                        Joined {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4-Column Metric Summary Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Programs Enrolled
                    </span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                      {enrollments.length} <span className="text-xs font-normal text-zinc-500">({enrollments.filter((e) => e.status === "ACTIVE").length} active)</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Daily Check-Ins
                    </span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                      {completedDaysCount} <span className="text-xs font-normal text-zinc-500">of {dayProgress.length} done</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Body &amp; Diet
                    </span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white font-mono mt-0.5">
                      {activeWeight ? `${activeWeight}kg` : "—"}{" "}
                      <span className="text-xs font-normal text-zinc-500 font-sans">
                        • {customerDietType || profile?.dietType || "Standard Diet"}
                      </span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Safety &amp; Health
                    </span>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        hasSafetyAlert ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {hasSafetyAlert ? "Precaution Flagged" : "Cleared"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Simplified Navigation Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. PROGRAMS (Enrolled & Daily Responses Drill-Down) */}
                <button
                  type="button"
                  onClick={() => switchCustomerTab("overview")}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
                    activeCustomerTab === "overview"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        activeCustomerTab === "overview"
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block font-geometric truncate">
                        Programs &amp; Responses
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-mono truncate">
                        {enrollments.length} enrolled • {dayProgress.length} check-ins
                      </span>
                    </div>
                  </div>
                </button>

                {/* 2. PERSONAL & HEALTH PROFILE */}
                <button
                  type="button"
                  onClick={() => switchCustomerTab("health")}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
                    activeCustomerTab === "health"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        activeCustomerTab === "health"
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Activity className={`w-4 h-4 ${hasSafetyAlert ? "text-zinc-500" : ""}`} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block font-geometric truncate">
                        Personal &amp; Health
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-mono truncate">
                        {hasSafetyAlert ? "Precaution flagged" : "Bio, diet & habits"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* 3. COACH NOTES */}
                <button
                  type="button"
                  onClick={() => switchCustomerTab("notes")}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
                    activeCustomerTab === "notes"
                      ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10"
                      : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        activeCustomerTab === "notes"
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block font-geometric truncate">
                        Coach Notes
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-mono truncate">
                        {customerCoachNotes.trim() ? "Notes recorded" : "Private log"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Sub-view Content Container */}
              <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-5">
                {customerProfileSuccess && (
                  <div className="p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-600 dark:text-zinc-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{customerProfileSuccess}</span>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 1: PROGRAMS & DAILY RESPONSES (UNIFIED IN 1 TAB)      */}
                {/* ========================================================= */}
                {activeCustomerTab === "overview" && (() => {
                  // View 1: Programs List (Default initial view)
                  if (!selectedCustomerProgramId) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Enrolled Programs ({enrollments.length})</span>
                          </h4>
                          <span className="text-[11px] text-zinc-400">
                            Click a program to inspect daily check-ins
                          </span>
                        </div>

                        {enrollments.length === 0 ? (
                          <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/5 space-y-1">
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              No Programs Enrolled
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              This customer is not enrolled in any program yet.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {enrollments.map((e) => {
                              const totalDays = e.program?._count?.days || 0;
                              const cohortProgress = dayProgress.filter(
                                (p) => p.programDay?.programId === e.program?.id
                              );
                              const doneDays = cohortProgress.filter((p) => p.isCompleted).length;
                              const pct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;

                              return (
                                <div
                                  key={e.id}
                                  onClick={() => setSelectedCustomerProgramId(e.program?.id || null)}
                                  className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 space-y-3 cursor-pointer hover:border-zinc-300 dark:hover:border-white/20 transition group"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:underline">
                                          {e.program?.title || "Program"}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                            e.status === "ACTIVE"
                                              ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                                              : e.status === "PENDING"
                                              ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                                              : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                                          }`}
                                        >
                                          {e.status}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                                          {e.attendanceMode || e.program?.locationType || "ONLINE"}
                                        </span>
                                      </div>
                                      {e.program?.locationType === "ONSITE" && e.program?.venueAddress && (
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-zinc-400" />
                                          <span>{e.program.venueAddress}{e.program.city ? `, ${e.program.city}` : ""}</span>
                                        </p>
                                      )}
                                    </div>

                                    <div className="text-left sm:text-right">
                                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                                        IDR {(e.program?.price || 0).toLocaleString("id-ID")}
                                      </span>
                                      <p className="text-[10px] font-mono text-zinc-400">
                                        Ref: {e.paymentReference || "Manual"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Curriculum Progress Bar */}
                                  <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                                        Curriculum Progress
                                      </span>
                                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                        {doneDays} of {totalDays} days ({pct}%)
                                      </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-zinc-900 dark:bg-white transition-all duration-300"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Footer Action */}
                                  <div className="pt-2 border-t border-zinc-200/40 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                                      <span>Enrolled: {e.paidAt ? new Date(e.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                                      <span>Valid Until: {e.validUntil ? new Date(e.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Indefinite"}</span>
                                    </div>

                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white group-hover:translate-x-0.5 transition">
                                      <MessageSquareQuote className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>View Daily Responses ({doneDays} logged) &rarr;</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // View 2: Daily Responses Drill-Down for Selected Program
                  const programResponses = dayProgress.filter(
                    (p) => p.programDay?.programId === selectedCustomerProgramId
                  );

                  const filteredResponses = programResponses.filter((p) => {
                    if (customerResponseStatusFilter === "COMPLETED" && !p.isCompleted) return false;
                    if (customerResponseStatusFilter === "PENDING" && p.isCompleted) return false;
                    if (customerResponsePhotosOnly && !p.photoBeforeUrl && !p.photoAfterUrl) return false;
                    if (customerResponseSearch.trim()) {
                      const q = customerResponseSearch.toLowerCase();
                      const dayTitle = (p.programDay?.title || "").toLowerCase();
                      const refText = (p.dailyReflection || "").toLowerCase();
                      const wNotes = (p.workoutNotes || "").toLowerCase();
                      const mNotes = (p.mealNotes || "").toLowerCase();
                      const routine = (p.selectedWorkout || "").toLowerCase();
                      if (
                        !dayTitle.includes(q) &&
                        !refText.includes(q) &&
                        !wNotes.includes(q) &&
                        !mNotes.includes(q) &&
                        !routine.includes(q)
                      ) {
                        return false;
                      }
                    }
                    return true;
                  });

                  const sortedResponses = filteredResponses.slice().sort((a, b) => {
                    const dDiff = (b.programDay?.dayNumber || 0) - (a.programDay?.dayNumber || 0);
                    if (dDiff !== 0) return dDiff;
                    return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
                  });

                  const allExpanded = sortedResponses.length > 0 && sortedResponses.every((p) => expandedResponseIds[p.id]);

                  const toggleExpandAll = () => {
                    if (allExpanded) {
                      setExpandedResponseIds({});
                    } else {
                      const next: Record<string, boolean> = {};
                      sortedResponses.forEach((p) => {
                        next[p.id] = true;
                      });
                      setExpandedResponseIds(next);
                    }
                  };

                  return (
                    <div className="space-y-4">
                      {/* Drill-down Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerProgramId(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition w-fit"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to Enrolled Programs
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white font-geometric">
                            {selectedProgram?.title || "Program"}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                            {programResponses.filter((p) => p.isCompleted).length} of {programResponses.length} check-ins
                          </span>
                        </div>
                      </div>

                      {/* Filter Toolbar */}
                      <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl p-0.5 border border-zinc-200/80 dark:border-white/10 text-xs">
                            {(["ALL", "COMPLETED", "PENDING"] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setCustomerResponseStatusFilter(st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                  customerResponseStatusFilter === st
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                {st === "ALL" ? "All" : st === "COMPLETED" ? "Completed" : "In Progress"}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setCustomerResponsePhotosOnly(!customerResponsePhotosOnly)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                              customerResponsePhotosOnly
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Photos Only</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={customerResponseSearch}
                              onChange={(e) => setCustomerResponseSearch(e.target.value)}
                              placeholder="Search reflections, notes..."
                              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                            />
                            {customerResponseSearch && (
                              <button
                                type="button"
                                onClick={() => setCustomerResponseSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {sortedResponses.length > 0 && (
                            <button
                              type="button"
                              onClick={toggleExpandAll}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0"
                            >
                              {allExpanded ? "Collapse All" : "Expand All"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Responses List */}
                      {sortedResponses.length === 0 ? (
                        <div className="py-12 px-6 text-center space-y-2 bg-zinc-50 dark:bg-white/[0.02] rounded-2xl border border-zinc-200/80 dark:border-white/5">
                          <MessageSquareQuote className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            No Check-In Responses Found
                          </h4>
                          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                            {programResponses.length === 0
                              ? "This customer has not recorded any check-ins for this program yet."
                              : "No responses match the active filter criteria."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {sortedResponses.map((sub) => {
                            const isExpanded = Boolean(expandedResponseIds[sub.id]);
                            const dateFormatted = sub.completedAt
                              ? new Date(sub.completedAt).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Date not recorded";

                            const checklistItems = safeJsonParse<string[]>(sub.checklistCompleted, []);
                            const hasPhotos = Boolean(sub.photoBeforeUrl || sub.photoAfterUrl);

                            return (
                              <div
                                key={sub.id}
                                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-white/10 overflow-hidden transition shadow-2xs hover:border-zinc-300 dark:hover:border-white/20"
                              >
                                {/* Compact Summary Header Bar */}
                                <div
                                  onClick={() =>
                                    setExpandedResponseIds((prev) => ({
                                      ...prev,
                                      [sub.id]: !prev[sub.id],
                                    }))
                                  }
                                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none bg-zinc-50/40 dark:bg-white/[0.02] hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] transition"
                                >
                                  {/* Left: Day & Title */}
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="px-2.5 py-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-mono font-bold text-xs shrink-0">
                                      Day {sub.programDay?.dayNumber}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold text-zinc-900 dark:text-white truncate block">
                                        {sub.programDay?.title}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono block">
                                        {dateFormatted}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right: Quick Telemetry Pills & Expand Button */}
                                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-between sm:justify-end">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {hasPhotos && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                                          <Camera className="w-3 h-3 text-zinc-500" />
                                          <span>Photos</span>
                                        </span>
                                      )}

                                      {sub.selectedWorkout && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                                          <Dumbbell className="w-3 h-3 text-zinc-500" />
                                          <span className="max-w-[100px] truncate">{sub.selectedWorkout}</span>
                                        </span>
                                      )}

                                      {sub.mealCompliance && (
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                            sub.mealCompliance === "FULL"
                                              ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                                              : sub.mealCompliance === "PARTIAL"
                                              ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                                          }`}
                                        >
                                          <Utensils className="w-3 h-3" />
                                          <span>{sub.mealCompliance === "FULL" ? "100% Meal" : sub.mealCompliance}</span>
                                        </span>
                                      )}

                                      {sub.happinessRate !== null && sub.happinessRate !== undefined && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                                          <Star className="w-3 h-3 fill-amber-400 text-zinc-400" />
                                          <span>{sub.happinessRate}/5</span>
                                        </span>
                                      )}

                                      {sub.isCompleted ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                                          Completed
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500">
                                          In Progress
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                                      aria-label={isExpanded ? "Collapse" : "Expand"}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-white/5 space-y-4 bg-white dark:bg-zinc-900">
                                    {/* Video Status */}
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[11px] text-zinc-400 font-mono">Video Session:</span>
                                      {sub.videoWatched ? (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                                          <Video className="w-3 h-3" />
                                          Watched
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-400 flex items-center gap-1">
                                          <Video className="w-3 h-3" />
                                          Skipped
                                        </span>
                                      )}
                                    </div>

                                    {/* Photos Comparison */}
                                    {hasPhotos && (
                                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                                            <Camera className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Progress &amp; Form Photos</span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setLightboxData({
                                                beforeUrl: sub.photoBeforeUrl,
                                                afterUrl: sub.photoAfterUrl,
                                                title: sub.programDay?.title || `Day ${sub.programDay?.dayNumber}`,
                                                memberName: u.fullName,
                                                dayNumber: sub.programDay?.dayNumber || 1,
                                                dateStr: dateFormatted,
                                              });
                                            }}
                                            className="text-xs text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1 font-medium"
                                          >
                                            <ZoomIn className="w-3.5 h-3.5" />
                                            <span>Compare Full Size</span>
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          {/* Before */}
                                          <div
                                            onClick={() =>
                                              setLightboxData({
                                                beforeUrl: sub.photoBeforeUrl,
                                                afterUrl: sub.photoAfterUrl,
                                                title: sub.programDay?.title || `Day ${sub.programDay?.dayNumber}`,
                                                memberName: u.fullName,
                                                dayNumber: sub.programDay?.dayNumber || 1,
                                                dateStr: dateFormatted,
                                              })
                                            }
                                            className="cursor-pointer group relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center"
                                          >
                                            {sub.photoBeforeUrl ? (
                                              <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={sub.photoBeforeUrl}
                                                  alt="Before"
                                                  loading="lazy"
                                                  decoding="async"
                                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                  <ZoomIn className="w-5 h-5 text-white" />
                                                </div>
                                              </>
                                            ) : (
                                              <span className="text-xs text-zinc-400">No before photo</span>
                                            )}
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-zinc-900/80 text-white font-mono">
                                              Before
                                            </span>
                                          </div>

                                          {/* After */}
                                          <div
                                            onClick={() =>
                                              setLightboxData({
                                                beforeUrl: sub.photoBeforeUrl,
                                                afterUrl: sub.photoAfterUrl,
                                                title: sub.programDay?.title || `Day ${sub.programDay?.dayNumber}`,
                                                memberName: u.fullName,
                                                dayNumber: sub.programDay?.dayNumber || 1,
                                                dateStr: dateFormatted,
                                              })
                                            }
                                            className="cursor-pointer group relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 flex items-center justify-center"
                                          >
                                            {sub.photoAfterUrl ? (
                                              <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={sub.photoAfterUrl}
                                                  alt="After"
                                                  loading="lazy"
                                                  decoding="async"
                                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                  <ZoomIn className="w-5 h-5 text-white" />
                                                </div>
                                              </>
                                            ) : (
                                              <span className="text-xs text-zinc-400">No after photo</span>
                                            )}
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-zinc-900/80 text-white font-mono">
                                              After
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Workout Routine & Completed Exercises */}
                                    {(sub.selectedWorkout || checklistItems.length > 0) && (
                                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                            <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                                            <span>Routine Exercises</span>
                                          </span>
                                          {sub.selectedWorkout && (
                                            <span className="text-[11px] font-semibold text-zinc-900 dark:text-white px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-white/10 font-mono">
                                              {sub.selectedWorkout}
                                            </span>
                                          )}
                                        </div>

                                        {checklistItems.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            {checklistItems.map((item, i) => (
                                              <span
                                                key={i}
                                                className="px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 text-xs font-medium flex items-center gap-1"
                                              >
                                                <CheckCircle2 className="w-3 h-3 text-zinc-500 shrink-0" />
                                                <span>{item}</span>
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Reflections & Notes Grid */}
                                    {(sub.dailyReflection || sub.workoutNotes || sub.mealNotes || sub.eventFeedback || sub.assessmentResponse) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {sub.dailyReflection && (
                                          <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                                              <Sparkles className="w-3 h-3 text-zinc-500" />
                                              <span>Dear Diary Reflection</span>
                                            </span>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
                                              &ldquo;{sub.dailyReflection}&rdquo;
                                            </p>
                                          </div>
                                        )}

                                        {sub.workoutNotes && (
                                          <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                                              <Dumbbell className="w-3 h-3 text-zinc-500" />
                                              <span>Workout Notes</span>
                                            </span>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                              {sub.workoutNotes}
                                            </p>
                                          </div>
                                        )}

                                        {sub.mealNotes && (
                                          <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                                              <Utensils className="w-3 h-3 text-zinc-500" />
                                              <span>Meal Notes ({sub.mealCompliance || "Logged"})</span>
                                            </span>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                              {sub.mealNotes}
                                            </p>
                                          </div>
                                        )}

                                        {sub.assessmentResponse && (
                                          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 font-mono">
                                              <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                                              <span>Self Assessment</span>
                                            </span>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                              {sub.assessmentResponse}
                                            </p>
                                          </div>
                                        )}

                                        {sub.eventFeedback && (
                                          <div className="p-3 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono">
                                              <Users className="w-3 h-3 text-zinc-500" />
                                              <span>Meetup Feedback</span>
                                            </span>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                              {sub.eventFeedback}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Telemetry Footer */}
                                    <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center gap-2 text-xs">
                                      {sub.happinessRate !== null && sub.happinessRate !== undefined && (
                                        <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                          <Smile className="w-3.5 h-3.5 text-zinc-500" />
                                          <span className="text-[11px] font-medium">Mood:</span>
                                          <div className="flex items-center gap-0.5">
                                            {Array.from({ length: 5 }, (_, idx) => (
                                              <Star
                                                key={idx}
                                                className={`w-3 h-3 ${
                                                  idx < sub.happinessRate!
                                                    ? "text-zinc-400 fill-amber-400"
                                                    : "text-zinc-300 dark:text-zinc-600"
                                                }`}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {(sub.bedtime || sub.wakeTime || sub.sleepDurationMinutes) && (
                                        <div className="px-2.5 py-1 rounded-lg bg-zinc-50/60 dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-900/30 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono text-[11px]">
                                          <Moon className="w-3.5 h-3.5 text-zinc-500" />
                                          <span>
                                            {sub.bedtime && sub.wakeTime ? `${sub.bedtime} – ${sub.wakeTime}` : "Sleep Logged"}
                                            {sub.sleepDurationMinutes ? ` (${Math.floor(sub.sleepDurationMinutes / 60)}h ${sub.sleepDurationMinutes % 60}m)` : ""}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ========================================================= */}
                {/* TAB 2: PERSONAL & HEALTH PROFILE (MEMBER VIEW-ONLY)       */}
                {/* ========================================================= */}
                {activeCustomerTab === "health" && (
                  <div className="space-y-6">
                    {/* Read-Only Notice Banner */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5 text-zinc-600 dark:text-zinc-400 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 shrink-0 text-zinc-400" />
                        <span>
                          This information is submitted directly by the customer and is strictly view-only for coaches and staff.
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 shrink-0">
                        Read-Only
                      </span>
                    </div>

                    {/* Section 1: Personal Information */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>1. Personal Information</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Age</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {u.age ? `${u.age} years old` : profile?.age ? `${profile.age} years old` : "—"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Gender</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {u.gender || "—"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 col-span-2">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Occupation</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {u.occupation || "Not specified"}
                          </span>
                        </div>
                      </div>

                      {/* Address & City */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 sm:col-span-2">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Street Address</span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white block mt-0.5">
                            {u.address || "No address provided"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">City &amp; Province</span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white block mt-0.5">
                            {[u.city, u.province].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Emergency Contact</span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {u.emergencyContactName || "No emergency contact recorded"}
                          </span>
                        </div>
                        {u.emergencyContactPhone && (
                          <a
                            href={`tel:${u.emergencyContactPhone.replace(/[^0-9+]/g, "")}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition w-fit"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{u.emergencyContactPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Section 2: General Health & Nutrition */}
                    <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-white/10">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" />
                        <span>2. General Health &amp; Nutrition</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* Diet Style */}
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Diet Style</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                            {profile?.dietType || profile?.eatingPatterns || "Standard Balanced"}
                          </span>
                        </div>

                        {/* Height */}
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Height</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                            {profile?.heightCm ? `${profile.heightCm} cm` : "—"}
                          </span>
                        </div>

                        {/* Weight */}
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Weight</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                            {profile?.weightKg ? `${profile.weightKg} kg` : "—"}
                          </span>
                        </div>

                        {/* BMI */}
                        <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Calculated BMI</span>
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                            {bmiValue ? `${bmiValue} (${bmiCategory || "Normal"})` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Primary Wellness Goal */}
                      <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Primary Wellness Goal
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                          {profile?.primaryGoal || "No specific goal specified"}
                        </p>
                      </div>

                      {/* Food Allergies */}
                      <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Food Allergies &amp; Dietary Intolerances
                        </span>
                        {profile?.foodAllergies ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {profile.foodAllergies
                              .split(",")
                              .map((a) => a.trim())
                              .filter(Boolean)
                              .map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-500/20"
                                >
                                  ⚠️ {tag}
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            No food allergies reported
                          </span>
                        )}
                      </div>

                      {/* Physical Limitations / Injuries */}
                      <div
                        className={`p-3.5 rounded-xl border space-y-1.5 ${
                          profile?.injuriesOrConditions
                            ? "bg-zinc-500/5 dark:bg-zinc-500/10 border-zinc-500/20"
                            : "bg-zinc-50/70 dark:bg-white/5 border-zinc-200/70 dark:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                            Physical Limitations &amp; Health Conditions
                          </span>
                          {profile?.injuriesOrConditions && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 font-semibold">
                              Movement Alert
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {profile?.injuriesOrConditions || "No physical limitations or health conditions reported"}
                        </p>
                      </div>

                      {/* Baseline Posture Photos (If provided) */}
                      {(profile?.photoFrontUrl || profile?.photoSideUrl || profile?.photoBackUrl) && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                            Baseline Posture Photos
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { label: "Front View", url: profile?.photoFrontUrl },
                              { label: "Side View", url: profile?.photoSideUrl },
                              { label: "Back View", url: profile?.photoBackUrl },
                            ].map(({ label, url }) => (
                              <div
                                key={label}
                                className="group relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 overflow-hidden flex flex-col items-center justify-center min-h-[170px]"
                              >
                                {url ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt={label}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white">
                                      <span className="text-xs font-medium font-geometric">{label}</span>
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </>
                                ) : (
                                  <div className="p-3 text-center space-y-1 text-zinc-400">
                                    <Camera className="w-5 h-5 mx-auto opacity-30 mb-0.5" />
                                    <p className="text-xs font-medium text-zinc-500">{label}</p>
                                    <p className="text-[10px] text-zinc-400">Not uploaded</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: COACH NOTES                                        */}
                {/* ========================================================= */}
                {activeCustomerTab === "notes" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                          Confidential Coach Notes
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Staff &amp; Coach only
                      </span>
                    </div>

                    <textarea
                      rows={6}
                      value={customerCoachNotes}
                      onChange={(e) => setCustomerCoachNotes(e.target.value)}
                      placeholder="Enter confidential coach notes"
                      className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveCustomerProfile}
                        disabled={savingCustomerProfile}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {savingCustomerProfile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Notes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Coach Notes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* VIEW 2B: CUSTOMERS DIRECTORY LIST VIEW                             */}
        {/* ================================================================= */}
        {activeMenu === "members" && !inspectingUserHealth && (
          <div className="space-y-6">
            {/* TOP WIDGET: Search & Filters Toolbar */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
              {/* Row 1: Search Bar (Left) side-by-side with Total Customers Badge (Right) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberPage(1);
                    }}
                    placeholder="Search customers by name, email, or phone..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition"
                  />
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearch("");
                        setMemberPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{users.length} Registered</span>
                </div>
              </div>

              {/* Row 2: Filter Pills + Sort Dropdown - Symmetrically Balanced */}
              <div className="pt-3.5 border-t border-zinc-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 font-mono">
                {/* Status Filter Group */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "ALL", label: `All (${users.length})` },
                    { key: "ACTIVE", label: "Active" },
                    { key: "PENDING", label: "Pending" },
                    { key: "SUSPENDED", label: "Suspended" },
                    { key: "SUPERADMIN", label: "Superadmin" },
                  ].map((tab) => {
                    const isSelected = memberFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setMemberFilter(tab.key as any);
                          setMemberPage(1);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                            : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/5"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sort Dropdown */}
                <div className="relative inline-flex items-center shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                  <select
                    value={memberSort}
                    onChange={(e) => {
                      setMemberSort(e.target.value as any);
                      setMemberPage(1);
                    }}
                    className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
                  >
                    <option value="NEWEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Newest Registered</option>
                    <option value="OLDEST" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Oldest Registered</option>
                    <option value="NAME_ASC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (A - Z)</option>
                    <option value="NAME_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Name (Z - A)</option>
                    <option value="ENROLLMENTS_DESC" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Most Programs</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* BOTTOM WIDGET: Customers Directory Header + Cards + Pagination */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Customers Directory ({filteredMembers.length})
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                  Page {safeMemberPage} of {totalMemberPages}
                </span>
              </div>

              {paginatedMembers.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-14 text-center border border-zinc-200/80 dark:border-white/10 shadow-xs">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    No customers found matching the selected filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedMembers.map((m, idx) => {
                    const isSuperadmin = m.role === "SUPERADMIN";
                    const defaultCustomerCovers = [
                      "/coach.webp",
                      "/coach2.webp",
                      "/coach3.webp",
                      "/pic.webp",
                      "/test.webp",
                      "/image.webp",
                    ];
                    const fallbackCover = defaultCustomerCovers[idx % defaultCustomerCovers.length];
                    const coverSrc =
                      m.healthProfile?.photoFrontUrl &&
                      m.healthProfile.photoFrontUrl.trim().length > 0 &&
                      !m.healthProfile.photoFrontUrl.includes("sample-")
                        ? m.healthProfile.photoFrontUrl
                        : fallbackCover;

                    const customerAge = m.age || m.healthProfile?.age;

                    return (
                      <div
                        key={m.id}
                        className={`relative rounded-3xl overflow-hidden min-h-[190px] sm:min-h-[210px] flex flex-col justify-between p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-sm group hover:border-zinc-400 dark:hover:border-white/25 transition-all duration-300 ${
                          isSuperadmin ? "bg-zinc-950" : ""
                        }`}
                      >
                        {/* BACKGROUND IMAGE FOR CUSTOMERS (SUPERADMIN HAS NO IMAGE) */}
                        {!isSuperadmin ? (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden bg-zinc-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={coverSrc}
                              alt={m.fullName}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = fallbackCover;
                              }}
                              className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 pointer-events-none bg-zinc-950 border border-zinc-800" />
                        )}

                        {/* TOP ROW: Joined Date & Superadmin Badge */}
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 font-mono">
                          <div className="flex items-center gap-2">
                            {isSuperadmin && (
                              <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-white text-zinc-950 font-bold border border-white shadow-sm flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3 text-zinc-950" />
                                <span>Superadmin</span>
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-semibold border border-white/20 shadow-sm flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-zinc-300" />
                              <span>Joined {formatDate(m.createdAt)}</span>
                            </span>
                          </div>

                          {m.status === "SUSPENDED" && (
                            <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-red-300 font-semibold border border-red-500/30 shadow-sm">
                              Suspended
                            </span>
                          )}
                        </div>

                        {/* MIDDLE: Customer Name & Age */}
                        <div className="relative z-10 py-3 my-auto space-y-1">
                          <div className="flex items-baseline gap-2.5 flex-wrap">
                            <h3 className="text-base sm:text-lg font-geometric font-semibold text-white tracking-tight drop-shadow-md leading-snug">
                              {m.fullName}
                            </h3>
                            {customerAge ? (
                              <span className="text-xs sm:text-sm font-mono text-zinc-300 font-normal drop-shadow-sm">
                                • {customerAge} yrs {m.city ? `• ${m.city}` : ""}
                              </span>
                            ) : m.city ? (
                              <span className="text-xs sm:text-sm font-mono text-zinc-300 font-normal drop-shadow-sm">
                                • {m.city}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* BOTTOM ROW: Clean Floating Bar (Email & Phone Number + Action Buttons) */}
                        <div className="relative z-10 p-2.5 sm:p-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs shadow-lg">
                          {/* Left: Email & Phone Number */}
                          <div className="flex flex-wrap items-center gap-2.5 text-white">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="text-xs text-white font-medium truncate max-w-[150px] sm:max-w-none">{m.email}</span>
                            </div>

                            <span className="text-zinc-600 hidden sm:inline">•</span>

                            <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                              <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{m.phone || "—"}</span>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openCustomerDetail(m)}
                              className="px-2.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] duration-150"
                              title="View customer detail"
                            >
                              <Activity className="w-3.5 h-3.5 shrink-0" />
                              <span>Detail</span>
                            </button>

                            {m.id !== currentAdminId && !isSuperadmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(m)}
                                  disabled={userActionLoading === m.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-white/15 text-zinc-200 text-xs font-medium border border-white/15 flex items-center gap-1 transition"
                                  title="Reset password"
                                >
                                  <KeyRound className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Reset</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(m)}
                                  disabled={userActionLoading === m.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-white/15 text-zinc-200 text-xs font-medium border border-white/15 flex items-center gap-1 transition"
                                  title={m.status === "ACTIVE" ? "Suspend user" : "Activate user"}
                                >
                                  <Ban className="w-3 h-3 shrink-0" />
                                  <span>{m.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(m)}
                                  disabled={userActionLoading === m.id}
                                  className="p-1.5 rounded-xl text-zinc-400 hover:text-red-300 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 flex items-center justify-center transition"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <PaginationBar
                currentPage={safeMemberPage}
                totalPages={totalMemberPages}
                totalItems={filteredMembers.length}
                pageSize={MEMBER_PAGE_SIZE}
                onPageChange={setMemberPage}
                itemLabel="customers"
              />
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: PAYMENTS                                                  */}
        {/* ================================================================= */}
        {activeMenu === "payments" && (
          <div className="space-y-6">
            {/* Search Widget */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={qrisSearch}
                  onChange={(e) => {
                    setQrisSearch(e.target.value);
                    setQrisPage(1);
                  }}
                  placeholder="Search payments by customer or program..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
                />
              </div>

              <span className="text-xs text-zinc-400 whitespace-nowrap">
                <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{pendingEnrollments.length}</span> pending verification
              </span>
            </div>

            {/* Payments List Widget */}
            <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Pending QRIS Payments
                </h2>
              </div>

              {paginatedQris.length === 0 ? (
                <div className="p-14 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    All caught up
                  </p>
                  <p className="text-xs text-zinc-400">
                    There are no pending payments requiring admin review.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-white/5">
                  {paginatedQris.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {item.userFullName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {item.userEmail}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">
                          {item.programTitle} •{" "}
                          <strong className="font-mono font-semibold text-zinc-900 dark:text-white">
                            Rp {item.amountPaid.toLocaleString("id-ID")}
                          </strong>
                        </p>
                        {item.paymentRef && (
                          <p className="text-[11px] text-zinc-400 font-mono">
                            Ref: {item.paymentRef}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApprovePayment(item.id)}
                        disabled={approvingId === item.id}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs hover:opacity-90 transition disabled:opacity-50"
                      >
                        {approvingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Approve Payment</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PaginationBar
                currentPage={safeQrisPage}
                totalPages={totalQrisPages}
                totalItems={filteredQris.length}
                pageSize={QRIS_PAGE_SIZE}
                onPageChange={setQrisPage}
                itemLabel="payments"
              />
            </div>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* PUBLISH VALIDATION & CONFIRMATION GUARD MODAL                     */}
      {/* ================================================================= */}
      {publishModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-white/10 p-6 sm:p-8 text-zinc-900 dark:text-zinc-100">
            {publishModal.mode === "ERROR" ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                      Publication Guard • Incomplete
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                      Cannot Publish Program
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      To protect paying customers and maintain strict program integrity, all parameters and daily routines must be 100% completed before publishing.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2">
                  <h4 className="text-xs font-semibold text-red-800 dark:text-red-300">
                    Validation Requirements ({publishModal.errorList?.length || 0}):
                  </h4>
                  <ul className="space-y-1.5 text-xs text-red-700 dark:text-red-300">
                    {publishModal.errorList?.map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPublishModal(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                  >
                    Close &amp; Fix Issues
                  </button>

                  {publishModal.missingDays && publishModal.missingDays.length > 0 && selectedProgram && (
                    <button
                      type="button"
                      onClick={() => {
                        setPublishModal(null);
                        setProgramDetailTab("schedule");
                        handleSelectDay(selectedProgram, publishModal.missingDays![0]);
                      }}
                      className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 shadow-xs hover:opacity-90 transition"
                    >
                      <span>Fill Day {publishModal.missingDays[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Strict Launch Guard
                    </span>
                    <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                      Confirm Program Launch &amp; Lock
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Are you sure you want to activate and publish this program?
                    </p>
                  </div>
                </div>

                {selectedProgram && (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
                      <span className="text-zinc-500">Program Title:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white line-clamp-1 max-w-[200px]">
                        {selectedProgram.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Schedule Status:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        All <span className="font-mono">{selectedProgram.durationDays}</span> Days Complete
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tuition Price:</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                        Rp {selectedProgram.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Max Capacity:</span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                        {selectedProgram.maxQuota} Seats
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
                  <p className="leading-relaxed">
                    <strong className="text-zinc-900 dark:text-white font-medium">Immutability Notice:</strong> Once published, Program Information and pricing will be locked to prevent discrepancies with what customers paid for.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPublishModal(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={publishingId === selectedProgram?.id}
                    onClick={() => {
                      if (selectedProgram) handleTogglePublish(selectedProgram, true);
                    }}
                    className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium transition flex items-center gap-2 shadow-xs hover:opacity-90 disabled:opacity-50"
                  >
                    {publishingId === selectedProgram?.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Confirm &amp; Launch Program</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LIGHTBOX / FULL-SIZE PHOTO COMPARISON MODAL                       */}
      {/* ================================================================= */}
      {lightboxData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxData(null)}
        >
          <div
            className="bg-white dark:bg-zinc-950 rounded-2xl max-w-4xl w-full border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Progress Photo Comparison</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 font-normal text-zinc-600 dark:text-zinc-400">
                    Day {lightboxData.dayNumber}
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Member: <strong className="text-zinc-700 dark:text-zinc-300">{lightboxData.memberName}</strong>
                  {lightboxData.dateStr && ` • ${lightboxData.dateStr}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Images Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 overflow-y-auto">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Before Photo
                </span>
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
                  {lightboxData.beforeUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={lightboxData.beforeUrl}
                      alt="Before"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">No before photo recorded</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  After Photo
                </span>
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
                  {lightboxData.afterUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={lightboxData.afterUrl}
                      alt="After"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">No after photo recorded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
