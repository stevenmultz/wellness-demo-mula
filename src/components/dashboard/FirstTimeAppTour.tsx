"use client";

import { useState } from "react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { BrandLogo } from "@/components/common/BrandLogo";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Compass,
  Flame,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";

interface FirstTimeAppTourProps {
  isOpen: boolean;
  userName: string;
  onFinish: (targetTab?: "my_plan" | "all_plan" | "notifications" | "profile") => void;
}

export function FirstTimeAppTour({
  isOpen,
  userName,
  onFinish,
}: FirstTimeAppTourProps) {
  const { locale } = useLocale();
  const isId = locale === "id";
  const [index, setIndex] = useState(0);

  if (!isOpen) return null;

  const firstName = userName.trim().split(/\s+/)[0] || "";

  const slides = isId
    ? [
        {
          eyebrow: "Selamat Datang",
          title: firstName ? `Halo ${firstName}, ini cara kerja zera.id` : "Ini cara kerja zera.id",
          description:
            "zera.id membantu Anda membangun konsistensi harian lewat protokol latihan, nutrisi, dan tidur terstruktur yang dibuka setiap pukul 00:00 WIB.",
          highlights: [
            "Satu fokus harian yang jelas dari pagi hingga malam",
            "Target check-in sebelum pukul 23:59 WIB",
            "Bisa dipakai nyaman seperti aplikasi native di HP Anda",
          ],
          icon: Sparkles,
        },
        {
          eyebrow: "Langkah 1 • Explore",
          title: "Pilih Program yang Sesuai Ritme Anda",
          description:
            "Buka tab Explore untuk menjelajahi program Online (akses kapan saja) maupun Hybrid (cohort terjadwal dengan sesi tatap muka bersama coach).",
          highlights: [
            "Filter berdasarkan kategori, level, dan lokasi kota Anda",
            "Lihat silabus, profil coach, serta jadwal sebelum mendaftar",
            "Pembayaran cepat dan otomatis aktif lewat QRIS",
          ],
          icon: Compass,
        },
        {
          eyebrow: "Langkah 2 • Programku",
          title: "Jalankan Check-In Harian Anda",
          description:
            "Semua program aktif Anda ada di tab Programku. Di setiap hari, Anda bisa memutar video panduan, mencentang gerakan, mencatat makanan, jam tidur, dan Dear Diary.",
          highlights: [
            "Centang progres harian langsung dari satu layar",
            "Isi checkpoint & pengukuran tubuh yang diminta coach",
            "Pantau persentase konsistensi cohort secara real-time",
          ],
          icon: Flame,
        },
        {
          eyebrow: "Langkah 3 • Activity",
          title: "Jangan Lewatkan Pengingat 00:00 WIB",
          description:
            "Tab Activity menampilkan pengingat sesi harian, pembaruan dari coach, dan riwayat program yang telah Anda selesaikan.",
          highlights: [
            "Aktifkan notifikasi agar diingatkan tepat waktu",
            "Cek riwayat cohort & laporan akhir kapan saja",
          ],
          icon: Bell,
        },
        {
          eyebrow: "Langkah 4 • Profile",
          title: "Pantau Progres Tubuh & Profil Anda",
          description:
            "Di tab Profile, Anda dapat memperbarui data diri, melihat tren metrik tubuh, hingga membagikan progres Anda dengan keluarga atau partner.",
          highlights: [
            "Semua data profil dapat diubah kapan saja",
            "Bagikan progres aman ke orang terdekat pilihan Anda",
          ],
          icon: UserCheck,
        },
      ]
    : [
        {
          eyebrow: "Welcome",
          title: firstName ? `Hi ${firstName}, here's how zera.id works` : "Here's how zera.id works",
          description:
            "zera.id helps you build daily consistency through structured movement, nutrition, and sleep rituals synchronized at 00:00 WIB.",
          highlights: [
            "One clear daily focus from morning movement to evening recovery",
            "Complete your daily checkpoints before 23:59 WIB",
            "Designed as a fast, distraction-free mobile PWA",
          ],
          icon: Sparkles,
        },
        {
          eyebrow: "Step 1 • Explore",
          title: "Pick a Program That Fits Your Rhythm",
          description:
            "Open the Explore tab to browse Online (anytime access) and Hybrid cohorts (scheduled groups with live sessions).",
          highlights: [
            "Filter by category, intensity, and your city",
            "Preview the syllabus, coaches, and schedule before joining",
            "Instant QRIS checkout unlocks your program immediately",
          ],
          icon: Compass,
        },
        {
          eyebrow: "Step 2 • My Program",
          title: "Complete Your Daily Check-In",
          description:
            "Your active programs live in My Program. Follow each day's guided video, workout checklist, meal compliance, sleep log, and Dear Diary.",
          highlights: [
            "Track every daily discipline in one clean flow",
            "Submit coach checkpoints and body measurements",
            "Watch your consistency score climb each day",
          ],
          icon: Flame,
        },
        {
          eyebrow: "Step 3 • Activity",
          title: "Stay on Track With Timely Reminders",
          description:
            "The Activity tab keeps your daily reminders, coach updates, and completed cohort history neatly organized.",
          highlights: [
            "Enable push notifications so you never miss a day",
            "Revisit completed cohort summaries anytime",
          ],
          icon: Bell,
        },
        {
          eyebrow: "Step 4 • Profile",
          title: "Track Body Progress & Preferences",
          description:
            "Manage your personal details, review your body metric trends, and optionally share progress with a trusted partner or coach.",
          highlights: [
            "Update your profile or language whenever you need",
            "Private progress sharing under your full control",
          ],
          icon: UserCheck,
        },
      ];

  const current = slides[index];
  const Icon = current.icon;
  const isLast = index === slides.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isId ? "Panduan penggunaan aplikasi" : "App onboarding walkthrough"}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-3xl bg-white text-zinc-950 border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <BrandLogo size="sm" tone="dark" />
          <button
            type="button"
            onClick={() => onFinish()}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-950 inline-flex items-center gap-1 transition cursor-pointer"
          >
            <span>{isId ? "Lewati" : "Skip"}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide Body */}
        <div className="px-6 py-4 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
              {current.eyebrow}
            </span>
            <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 leading-snug">
              {current.title}
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {current.description}
            </p>
          </div>

          <ul className="space-y-2.5 pt-1">
            {current.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-relaxed"
              >
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Progress & Buttons */}
        <div className="px-6 pt-3 pb-6 space-y-4">
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? "w-6 bg-zinc-950" : "w-1.5 bg-zinc-200 hover:bg-zinc-300"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                className="h-11 px-4 rounded-full border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isId ? "Kembali" : "Back"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onFinish("all_plan");
                } else {
                  setIndex((prev) => prev + 1);
                }
              }}
              className="flex-1 h-11 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              {isLast ? (
                <>
                  <span>{isId ? "Mulai Gunakan App" : "Start Using App"}</span>
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>{isId ? "Lanjut" : "Next"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
