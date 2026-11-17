"use client";

import { useState } from "react";
import { Building2, CheckCircle2, Edit2, Plus, Trash2, X } from "lucide-react";
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
  onUpdated,
  onNotify,
}: {
  organizations: MasterOrganizationItem[];
  isSuperadmin: boolean;
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
    if (!isSuperadmin) return;
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
            Communities &amp; Partner Brands ({organizations.length})
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Studios, academies, or partner communities hosting cohorts on zera.id.
          </p>
        </div>
        {isSuperadmin && (
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-3.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Community / Brand</span>
          </button>
        )}
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          No communities or partner brands added yet (e.g. Elite Academy, Senopati Pilates Collective).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {safeMediaUrl(org.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeMediaUrl(org.logoUrl)!}
                      alt={org.name}
                      className="w-full h-full object-cover"
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

              {isSuperadmin && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => openEdit(org)}
                    className="px-2.5 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(org)}
                    className="px-2.5 py-1 rounded-md text-xs text-red-600 hover:bg-red-500/10 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
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
                  Logo URL (optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm"
                />
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
              <label className="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                />
                <span>Verified Partner Badge</span>
              </label>

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
