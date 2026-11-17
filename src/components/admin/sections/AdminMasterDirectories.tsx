"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Clock,
  Dumbbell,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { MasterDataPayload } from "@/wellness/actions/master";
import { PaginationBar } from "../AdminFormPickers";
import { AdminOrganizationsManager } from "../AdminOrganizationsManager";
import type { AdminFeedbackMessage } from "../adminTypes";
import type {
  ActiveDirectoryModalState,
  StandardMasterTab,
} from "../hooks/useMasterDirectoryActions";

export type MasterDirectoryTabKey = StandardMasterTab | "organizations";

interface MasterDirectoryItem {
  id: string;
  type: StandardMasterTab;
  masterCategoryName: string;
  name: string;
  icon: LucideIcon;
  raw: { id: string; name: string; title?: string };
}

interface AdminMasterDirectoriesProps {
  masterData: MasterDataPayload;
  setMasterData: Dispatch<SetStateAction<MasterDataPayload>>;
  masterTab: MasterDirectoryTabKey;
  setMasterTab: (tab: MasterDirectoryTabKey) => void;
  isSuperadminUser: boolean;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
  masterActionLoading: boolean;
  activeDirectoryModal: ActiveDirectoryModalState | null;
  modalFormName: string;
  setModalFormName: (val: string) => void;
  modalFormTitle: string;
  setModalFormTitle: (val: string) => void;
  openAddModal: (type: StandardMasterTab) => void;
  openEditModal: (
    type: StandardMasterTab,
    item: { id: string; name: string; title?: string }
  ) => void;
  closeModal: () => void;
  handleDeleteDirectoryItem: (
    type: StandardMasterTab,
    id: string,
    name: string
  ) => Promise<void>;
  handleSubmitDirectoryModal: (e: FormEvent) => Promise<void>;
}

const MASTER_GRID_PAGE_SIZE = 15;

export function AdminMasterDirectories({
  masterData,
  setMasterData,
  masterTab,
  setMasterTab,
  isSuperadminUser,
  setFeedback,
  masterActionLoading,
  activeDirectoryModal,
  modalFormName,
  setModalFormName,
  modalFormTitle,
  setModalFormTitle,
  openAddModal,
  openEditModal,
  closeModal,
  handleDeleteDirectoryItem,
  handleSubmitDirectoryModal,
}: AdminMasterDirectoriesProps) {
  const router = useRouter();
  const [masterSearch, setMasterSearch] = useState("");
  const [masterPage, setMasterPage] = useState(1);
  const [masterSort, setMasterSort] = useState<"A_Z" | "Z_A">("A_Z");

  const directoryTabs: {
    key: MasterDirectoryTabKey;
    label: string;
    singular: string;
    masterCategoryName: string;
    icon: LucideIcon;
    count: number;
  }[] = [
    {
      key: "organizations",
      label: "Communities",
      singular: "Community",
      masterCategoryName: "Master Community / Brand",
      icon: Building2,
      count: (masterData?.organizations || []).length,
    },
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

  const currentTabMeta =
    directoryTabs.find((t) => t.key === masterTab) || directoryTabs[0];

  const tabSources: Record<
    StandardMasterTab,
    {
      masterCategoryName: string;
      icon: LucideIcon;
      rows: { id: string; name: string; title?: string }[];
    }
  > = {
    coaches: {
      masterCategoryName: "Master Coach",
      icon: UserCheck,
      rows: masterData?.coaches || [],
    },
    audience: {
      masterCategoryName: "Master Target Audience",
      icon: Sparkles,
      rows: masterData?.targetAudiences || [],
    },
    categories: {
      masterCategoryName: "Master Category",
      icon: Tag,
      rows: masterData?.categories || [],
    },
    equipment: {
      masterCategoryName: "Master Equipment",
      icon: Dumbbell,
      rows: masterData?.equipment || [],
    },
    commitments: {
      masterCategoryName: "Master Daily Commitment",
      icon: Clock,
      rows: masterData?.dailyCommitments || [],
    },
  };

  const currentTabItems: MasterDirectoryItem[] =
    masterTab === "organizations"
      ? []
      : tabSources[masterTab].rows.map((row) => ({
          id: row.id,
          type: masterTab,
          masterCategoryName: tabSources[masterTab].masterCategoryName,
          name: row.name,
          icon: tabSources[masterTab].icon,
          raw: row,
        }));

  const filteredItems = currentTabItems
    .filter((item) => {
      if (masterSearch.trim().length > 0) {
        const q = masterSearch.toLowerCase().trim();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) =>
      masterSort === "Z_A"
        ? b.name.localeCompare(a.name)
        : a.name.localeCompare(b.name)
    );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / MASTER_GRID_PAGE_SIZE)
  );
  const safePage = Math.min(masterPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * MASTER_GRID_PAGE_SIZE,
    safePage * MASTER_GRID_PAGE_SIZE
  );

  const modalTitleLabel = activeDirectoryModal
    ? {
        coaches: "Coach",
        audience: "Target Audience",
        categories: "Category",
        equipment: "Equipment",
        commitments: "Daily Commitment",
      }[activeDirectoryModal.type]
    : "";

  const modalPlaceholder = activeDirectoryModal
    ? {
        coaches: "Enter coach name",
        categories: "Enter category name",
        equipment: "Enter equipment name",
        commitments: "Enter time commitment",
        audience: "Enter target audience",
      }[activeDirectoryModal.type]
    : "";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP WIDGET: Search & Action Stack (Row 1) + Filter Tabs & Sort (Row 2) */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-3xl p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
        {/* Row 1: Search Bar (Left) + New Entry Button (Right) */}
        {masterTab !== "organizations" && (
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

            {isSuperadminUser && (
              <button
                type="button"
                onClick={() => openAddModal(masterTab)}
                className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New {currentTabMeta.singular}</span>
              </button>
            )}
          </div>
        )}

        {/* Row 2: Filter Tabs + Sort Dropdown */}
        <div
          className={`${
            masterTab !== "organizations"
              ? "pt-3.5 border-t border-zinc-100 dark:border-white/10"
              : ""
          } flex flex-wrap items-center justify-between gap-3 font-mono`}
        >
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
                setMasterSort(e.target.value as "A_Z" | "Z_A");
                setMasterPage(1);
              }}
              className="pl-9 pr-8 py-2 h-[37px] rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/80 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-sans font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer appearance-none transition"
            >
              <option value="A_Z" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                Name (A - Z)
              </option>
              <option value="Z_A" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                Name (Z - A)
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* BOTTOM WIDGET: Organizations OR Directories Header + Cards Grid + Pagination */}
      {masterTab === "organizations" ? (
        <AdminOrganizationsManager
          organizations={masterData.organizations || []}
          isSuperadmin={isSuperadminUser}
          onUpdated={(next) =>
            setMasterData((p) => ({ ...p, organizations: next }))
          }
          onNotify={setFeedback}
        />
      ) : (
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

                    {isSuperadminUser && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(item.type, {
                              id: item.id,
                              name: item.name,
                              title: isCoach ? item.raw.title : undefined,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 transition flex items-center gap-1.5"
                          title="Edit item"
                        >
                          <Pencil className="w-3 h-3 text-zinc-400" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDirectoryItem(item.type, item.id, item.name)
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
      )}

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
                  {modalTitleLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitDirectoryModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  {activeDirectoryModal.type === "coaches"
                    ? "Coach Name *"
                    : "Entry Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={modalFormName}
                  onChange={(e) => setModalFormName(e.target.value)}
                  placeholder={modalPlaceholder}
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
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={masterActionLoading}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {masterActionLoading
                    ? "Saving..."
                    : activeDirectoryModal.mode === "add"
                    ? "Save Entry"
                    : "Update Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
