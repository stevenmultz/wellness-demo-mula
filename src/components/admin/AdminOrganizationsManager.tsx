"use client";

import { useState } from "react";
import { Building2, CheckCircle2, Edit2, Plus, Trash2, Upload, X } from "lucide-react";
import { safeMediaUrl } from "@/wellness/utils/url-safety";
import {
  wellnessCreateMasterOrganization,
  wellnessDeleteMasterOrganization,
  wellnessUpdateMasterOrganization,
  type MasterOrganizationItem,
} from "@/wellness/actions/master";

export function AdminOrganizationsManager({
  organizations,
  isSuperadmin,
  currentAdminOrgId = null,
  onUpdated,
  onNotify,
}: {
  organizations: MasterOrganizationItem[];
  isSuperadmin: boolean;
  currentAdminOrgId?: string | null;
  onUpdated: (next: MasterOrganizationItem[]) => void;
  onNotify: (msg: { type: "success" | "error"; text: string }) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterOrganizationItem | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isVerified, setIsVerified] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const visibleOrgs = isSuperadmin
    ? organizations
    : organizations.filter((o) => o.id === currentAdminOrgId);

  const canEditOrg = (org: MasterOrganizationItem) =>
    isSuperadmin || (Boolean(currentAdminOrgId) && org.id === currentAdminOrgId);

  const handleUploadLogoFile = async (file: File) => {
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, type: "org-logo" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        onNotify({ type: "error", text: json?.message || "Failed to upload community logo." });
        return;
      }
      setLogoUrl(json.storagePath || json.url || "");
      onNotify({ type: "success", text: "Logo compressed (WebP) and ready to save." });
    } catch {
      onNotify({ type: "error", text: "Failed to upload community logo." });
    } finally {
      setUploadingLogo(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setTagline("");
    setLogoUrl("");
    setWebsiteUrl("");
    setIsVerified(true);
    setModalOpen(true);
  };

  const openEdit = (org: MasterOrganizationItem) => {
    setEditing(org);
    setName(org.name);
    setTagline(org.tagline || "");
    setLogoUrl(org.logoUrl || "");
    setWebsiteUrl(org.websiteUrl || "");
    setIsVerified(org.isVerified);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !isSuperadmin) return;
    if (editing && !canEditOrg(editing)) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await wellnessUpdateMasterOrganization({
          id: editing.id,
          name,
          tagline,
          logoUrl,
          websiteUrl,
          isVerified,
        });
        if (!res.success || !res.data) {
          onNotify({ type: "error", text: res.message || "Failed to update organization." });
          return;
        }
        const updatedOrg = res.data as MasterOrganizationItem;
        onUpdated(
          organizations.map((o) => (o.id === editing.id ? updatedOrg : o))
        );
        onNotify({ type: "success", text: res.message || "Organization updated." });
      } else {
        const res = await wellnessCreateMasterOrganization({
          name,
          tagline,
          logoUrl,
          websiteUrl,
          isVerified,
        });
        if (!res.success || !res.data) {
          onNotify({ type: "error", text: res.message || "Failed to create organization." });
          return;
        }
        const createdOrg = res.data as MasterOrganizationItem;
        onUpdated([...organizations, createdOrg]);
        onNotify({ type: "success", text: res.message || "Organization created." });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: MasterOrganizationItem) => {
    if (!isSuperadmin) return;
    const res = await wellnessDeleteMasterOrganization(org.id);
    if (!res.success) {
      onNotify({ type: "error", text: res.message || "Failed to delete organization." });
      return;
    }
    onUpdated(organizations.filter((o) => o.id !== org.id));
    onNotify({ type: "success", text: res.message || "Organization deleted." });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Communities ({organizations.length})
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Studios, academies, or sports communities hosting cohorts on zera.id.
          </p>
        </div>
        {isSuperadmin && (
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-3.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Community</span>
          </button>
        )}
      </div>

      {visibleOrgs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {isSuperadmin
            ? "No communities added yet (e.g. Elite Academy, Senopati Pilates Collective)."
            : "Your account is not linked to a Community profile yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleOrgs.map((org) => (
            <div
              key={org.id}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  {safeMediaUrl(org.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeMediaUrl(org.logoUrl)!}
                      alt={org.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {org.name}
                    </span>
                    {org.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {org.tagline && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                      {org.tagline}
                    </p>
                  )}
                </div>
              </div>

              {canEditOrg(org) && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => openEdit(org)}
                    className="px-2.5 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Branding
                  </button>
                  {isSuperadmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(org)}
                      className="px-2.5 py-1 rounded-md text-xs text-red-600 hover:bg-red-500/10 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {editing ? "Edit Community / Brand" : "New Community / Brand"}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Brand / Community Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elite Academy"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Tagline / Short Bio
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Athletic Longevity & Mobility Collective"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Community Logo (Crisp WebP 256×256)
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-white/15 bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {safeMediaUrl(logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={safeMediaUrl(logoUrl)!}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Upload image or paste URL (https://...)"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm"
                  />
                  <label className="shrink-0 h-9 px-3 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-zinc-50 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? "..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadLogoFile(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Website URL (optional)
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm"
                />
              </div>
              {isSuperadmin && (
                <label className="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                  />
                  <span>Verified Community Badge</span>
                </label>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
