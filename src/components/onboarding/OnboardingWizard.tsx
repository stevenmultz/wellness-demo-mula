"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { wellnessCompleteOnboarding } from "@/wellness/actions/account";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { calculateAgeFromDob, GENDER_OPTIONS } from "@/wellness/validators/auth";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Loader2,
  LogOut,
  MapPin,
} from "lucide-react";

interface OnboardingWizardProps {
  email: string;
  initialFullName?: string | null;
  initialDateOfBirth?: string | null;
  initialGender?: string | null;
  initialPhone?: string | null;
  initialCity?: string | null;
}

const TOTAL_STEPS = 5;

const POPULAR_CITIES = [
  "Jakarta Selatan",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Tangerang",
  "Bandung",
  "Surabaya",
  "Bali",
  "Medan",
];

const GENDER_LABELS_ID: Record<(typeof GENDER_OPTIONS)[number], string> = {
  Male: "Laki-laki",
  Female: "Perempuan",
  Other: "Lainnya",
  "Prefer not to say": "Memilih tidak menyebutkan",
};

export function OnboardingWizard({
  email,
  initialFullName = "",
  initialDateOfBirth = "",
  initialGender = "",
  initialPhone = "",
  initialCity = "",
}: OnboardingWizardProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const isId = locale === "id";

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState((initialFullName || "").trim());
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth || "");
  const [gender, setGender] = useState(initialGender || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [city, setCity] = useState(initialCity || "");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);

    if (step === 1) {
      const trimmed = fullName.trim();
      if (trimmed.length < 3) {
        setErrorMsg(
          isId
            ? "Nama lengkap minimal 3 karakter."
            : "Full name must be at least 3 characters."
        );
        return false;
      }
      if (trimmed.length > 60) {
        setErrorMsg(
          isId
            ? "Nama lengkap maksimal 60 karakter."
            : "Full name cannot exceed 60 characters."
        );
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        setErrorMsg(
          isId ? "Pilih tanggal lahir Anda terlebih dahulu." : "Please select your date of birth."
        );
        return false;
      }
      const age = calculateAgeFromDob(dateOfBirth);
      if (Number.isNaN(age) || age < 10 || age > 120) {
        setErrorMsg(
          isId
            ? "Tanggal lahir tidak valid (usia minimal 10 tahun)."
            : "Please enter a valid date of birth (minimum age 10)."
        );
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!gender || !GENDER_OPTIONS.includes(gender as (typeof GENDER_OPTIONS)[number])) {
        setErrorMsg(isId ? "Pilih salah satu gender." : "Please select your gender.");
        return false;
      }
      return true;
    }

    if (step === 4) {
      const trimmed = phone.trim();
      if (!/^[0-9+\s\-]*$/.test(trimmed) || trimmed.length < 10 || trimmed.length > 18) {
        setErrorMsg(
          isId
            ? "Masukkan nomor WhatsApp/telepon yang valid (10–18 digit)."
            : "Please enter a valid phone / WhatsApp number (10–18 digits)."
        );
        return false;
      }
      return true;
    }

    if (step === 5) {
      const trimmed = city.trim();
      if (trimmed.length < 2) {
        setErrorMsg(
          isId ? "Masukkan nama kota domisili Anda." : "Please enter your city."
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateCurrentStep()) return;

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await wellnessCompleteOnboarding({
        fullName: fullName.trim(),
        dateOfBirth,
        gender,
        phone: phone.trim(),
        city: city.trim(),
      });

      if (res.success) {
        router.replace("/dashboard?welcome=1");
        router.refresh();
      } else {
        if (res.errors) {
          const detail = Object.values(res.errors).flat().join(". ");
          setErrorMsg(detail || res.message || "Please check your details.");
        } else {
          setErrorMsg(res.message || "Failed to save your profile.");
        }
      }
    } catch {
      setErrorMsg(
        isId
          ? "Terjadi gangguan koneksi. Silakan coba lagi."
          : "Connection error. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep((prev) => prev - 1);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await wellnessSignOut();
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-950 flex flex-col justify-between">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-100 z-30">
        <div
          className="h-full bg-zinc-950 transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Top Header */}
      <header
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}
        className="w-full max-w-lg mx-auto px-6 pb-4 flex items-center justify-between gap-3"
      >
        <BrandLogo size="md" tone="dark" />
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-[11px] text-zinc-500">
            {step} / {TOTAL_STEPS}
          </span>
          <LocaleToggle className="text-xs text-zinc-600" />
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-950 transition"
            title={isId ? "Keluar" : "Sign out"}
            aria-label={isId ? "Keluar" : "Sign out"}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Single-Field Step Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <form
          onSubmit={handleNext}
          className="w-full max-w-md space-y-6 animate-in fade-in duration-200"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
            {isId ? `Langkah ${step} dari ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`} • {email}
          </p>

          {/* STEP 1: FULL NAME */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950">
                  {isId ? "Siapa nama lengkap Anda?" : "What is your full name?"}
                </h1>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {isId
                    ? "Nama ini akan digunakan oleh coach dan di sertifikat program Anda."
                    : "Your coaches will use this name across your daily protocol and cohorts."}
                </p>
              </div>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={isId ? "Contoh: Steven Mulya" : "e.g. Alex Rivera"}
                className="w-full h-14 px-4 rounded-2xl bg-zinc-100/80 border border-zinc-200 text-base text-zinc-950 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-950 transition"
              />
            </div>
          )}

          {/* STEP 2: DATE OF BIRTH */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950">
                  {isId ? "Kapan tanggal lahir Anda?" : "When is your date of birth?"}
                </h1>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {isId
                    ? "Membantu kami menyesuaikan rekomendasi latihan dan pemulihan sesuai usia Anda."
                    : "Helps us tailor movement intensity and longevity tracking to your stage of life."}
                </p>
              </div>
              <input
                type="date"
                autoFocus
                max={new Date().toISOString().slice(0, 10)}
                min="1905-01-01"
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full h-14 px-4 rounded-2xl bg-zinc-100/80 border border-zinc-200 text-base text-zinc-950 outline-none focus:bg-white focus:border-zinc-950 transition"
              />
            </div>
          )}

          {/* STEP 3: GENDER */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950">
                  {isId ? "Apa gender Anda?" : "What is your gender?"}
                </h1>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {isId
                    ? "Digunakan untuk personalisasi panduan nutrisi dan metrik tubuh Anda."
                    : "Used to personalize nutrition guidelines and body progress metrics."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="Gender">
                {GENDER_OPTIONS.map((opt) => {
                  const selected = gender === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setGender(opt);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className={`w-full h-14 px-5 rounded-2xl border text-left text-sm font-medium flex items-center justify-between transition cursor-pointer ${
                        selected
                          ? "bg-zinc-950 text-white border-zinc-950"
                          : "bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <span>{isId ? GENDER_LABELS_ID[opt] : opt}</span>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: PHONE / WHATSAPP */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950">
                  {isId ? "Berapa nomor telepon / WhatsApp Anda?" : "What is your phone / WhatsApp number?"}
                </h1>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {isId
                    ? "Untuk koordinasi sesi tatap muka, grup komunitas cohort, dan informasi penting."
                    : "Used for cohort community access, live session updates, and account support."}
                </p>
              </div>
              <input
                type="tel"
                autoFocus
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={isId ? "Contoh: 081234567890" : "e.g. +6281234567890"}
                className="w-full h-14 px-4 rounded-2xl bg-zinc-100/80 border border-zinc-200 text-base text-zinc-950 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-950 transition"
              />
            </div>
          )}

          {/* STEP 5: CITY */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950">
                  {isId ? "Anda berdomisili di kota mana?" : "Which city are you based in?"}
                </h1>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {isId
                    ? "Agar kami bisa merekomendasikan program Hybrid dan sesi tatap muka terdekat."
                    : "So we can highlight nearby Hybrid cohorts and live studio sessions."}
                </p>
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={isId ? "Ketik nama kota Anda" : "Type your city"}
                  className="w-full h-14 pl-11 pr-4 rounded-2xl bg-zinc-100/80 border border-zinc-200 text-base text-zinc-950 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-950 transition"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((preset) => {
                  const active = city.trim().toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCity(preset);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                        active
                          ? "bg-zinc-950 text-white border-zinc-950"
                          : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Feedback */}
          {errorMsg && (
            <div
              role="alert"
              className="py-2.5 px-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-2 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBack}
                className="h-12 px-5 rounded-full border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isId ? "Kembali" : "Back"}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isId ? "Menyimpan..." : "Saving..."}</span>
                </>
              ) : step < TOTAL_STEPS ? (
                <>
                  <span>{isId ? "Lanjut" : "Continue"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{isId ? "Selesai & Masuk App" : "Finish & Enter App"}</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer spacing */}
      <footer
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)" }}
        className="w-full max-w-lg mx-auto px-6 text-center"
      >
        <p className="text-[11px] text-zinc-400">
          {isId
            ? "Data Anda aman dan dapat diperbarui kapan saja melalui menu Profil."
            : "Your information is private and can be updated anytime in your Profile."}
        </p>
      </footer>
    </div>
  );
}
