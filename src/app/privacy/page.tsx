import { BRAND } from "@/wellness/brand";
import { getServerLocale } from "@/wellness/i18n/server";
import { PublicPageShell, PublicPageActions } from "@/components/home/PublicNavbar";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const locale = await getServerLocale();
  const isId = locale === "id";

  return (
    <PublicPageShell>
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 block">
          {isId ? "Legal · Privasi" : "Legal · Privacy"}
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 leading-tight">
          {isId ? "Kebijakan Privasi" : "Privacy Policy"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {isId
            ? `${BRAND.name} menghormati privasi Anda. Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda saat menggunakan layanan kami.`
            : `${BRAND.name} respects your privacy. This policy explains how we collect, use, and protect your personal information when you use our platform.`}
        </p>
      </section>

      <section className="space-y-6 max-w-2xl border-t border-zinc-200/80 pt-6 text-xs sm:text-sm text-zinc-700 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "1. Data yang Kami Kumpulkan" : "1. Information We Collect"}
          </h2>
          <p>
            {isId
              ? "Kami mengumpulkan data akun yang Anda berikan secara langsung (seperti nama, alamat email, nomor telepon, profil kebugaran, dan kontak darurat) serta catatan progres latihan dan pendaftaran program Anda."
              : "We collect account information you provide directly (such as your name, email address, phone number, wellness profile, and emergency contact) along with your program enrollments and daily training check-ins."}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "2. Penggunaan Data" : "2. How We Use Your Information"}
          </h2>
          <p>
            {isId
              ? "Data Anda digunakan untuk mengelola akses program, memproses pendaftaran, mengirimkan pengingat jadwal latihan, serta menyediakan fitur berbagi progres sesuai izin Anda."
              : "Your data is used to deliver program access, process enrollments, send training schedule reminders, and power progress-sharing features strictly under your control."}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "3. Keamanan & Hak Anda" : "3. Security & Your Rights"}
          </h2>
          <p>
            {isId
              ? "Kami melindungi sesi Anda dengan enkripsi standar industri. Anda dapat mengekspor data akun atau menghapus akun secara permanen kapan saja melalui menu Pengaturan Profil."
              : "We safeguard your sessions with industry-standard encryption. You may export your personal data archive or permanently delete your account at any time from your Profile Settings."}
          </p>
        </div>
      </section>

      <PublicPageActions nextHref="/terms" nextLabel={isId ? "Ketentuan Layanan" : "Terms of Service"} />
    </PublicPageShell>
  );
}
