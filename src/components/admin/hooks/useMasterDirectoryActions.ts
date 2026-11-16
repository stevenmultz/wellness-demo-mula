"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
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
  type MasterDataPayload,
} from "@/wellness/actions/master";
import type { AdminFeedbackMessage } from "../adminTypes";

export type StandardMasterTab =
  | "coaches"
  | "audience"
  | "categories"
  | "equipment"
  | "commitments";

export interface ActiveDirectoryModalState {
  mode: "add" | "edit";
  type: StandardMasterTab;
  item?: { id: string; name: string; title?: string };
}

interface UseMasterDirectoryActionsArgs {
  setMasterData: Dispatch<SetStateAction<MasterDataPayload>>;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

interface TaxonomyRegistryEntry {
  key: keyof Pick<
    MasterDataPayload,
    "targetAudiences" | "categories" | "equipment" | "dailyCommitments"
  >;
  addSuccess: string;
  updateSuccess: string;
  removeLabel: string;
  confirmBeforeDelete: boolean;
  confirmEntityLabel?: string;
  shouldRefreshOnSuccess: boolean;
  createFn: (name: string) => Promise<{ success: boolean; data?: unknown; message?: string }>;
  updateFn: (input: {
    id: string;
    name: string;
  }) => Promise<{ success: boolean; data?: unknown; message?: string }>;
  deleteFn: (id: string) => Promise<{ success: boolean; message?: string }>;
}

const TAXONOMY_REGISTRY: Record<
  Exclude<StandardMasterTab, "coaches">,
  TaxonomyRegistryEntry
> = {
  audience: {
    key: "targetAudiences",
    addSuccess: "Target audience added.",
    updateSuccess: "Audience updated.",
    removeLabel: "Target audience",
    confirmBeforeDelete: false,
    shouldRefreshOnSuccess: true,
    createFn: wellnessCreateMasterTargetAudience,
    updateFn: wellnessUpdateMasterTargetAudience,
    deleteFn: wellnessDeleteMasterTargetAudience,
  },
  categories: {
    key: "categories",
    addSuccess: "Category added.",
    updateSuccess: "Category updated.",
    removeLabel: "Category",
    confirmBeforeDelete: false,
    shouldRefreshOnSuccess: true,
    createFn: wellnessCreateMasterCategory,
    updateFn: wellnessUpdateMasterCategory,
    deleteFn: wellnessDeleteMasterCategory,
  },
  equipment: {
    key: "equipment",
    addSuccess: "Equipment added.",
    updateSuccess: "Equipment updated.",
    removeLabel: "Equipment",
    confirmBeforeDelete: true,
    confirmEntityLabel: "equipment",
    shouldRefreshOnSuccess: true,
    createFn: wellnessCreateMasterEquipment,
    updateFn: wellnessUpdateMasterEquipment,
    deleteFn: wellnessDeleteMasterEquipment,
  },
  commitments: {
    key: "dailyCommitments",
    addSuccess: "Commitment added.",
    updateSuccess: "Commitment updated.",
    removeLabel: "Daily commitment",
    confirmBeforeDelete: true,
    confirmEntityLabel: "daily commitment",
    shouldRefreshOnSuccess: false,
    createFn: wellnessCreateMasterDailyCommitment,
    updateFn: wellnessUpdateMasterDailyCommitment,
    deleteFn: wellnessDeleteMasterDailyCommitment,
  },
};

export function useMasterDirectoryActions({
  setMasterData,
  setFeedback,
}: UseMasterDirectoryActionsArgs) {
  const router = useRouter();
  const [masterActionLoading, setMasterActionLoading] = useState(false);
  const [activeDirectoryModal, setActiveDirectoryModal] =
    useState<ActiveDirectoryModalState | null>(null);
  const [modalFormName, setModalFormName] = useState("");
  const [modalFormTitle, setModalFormTitle] = useState("");

  const openAddModal = (type: StandardMasterTab) => {
    setActiveDirectoryModal({ mode: "add", type });
    setModalFormName("");
    setModalFormTitle("");
  };

  const openEditModal = (
    type: StandardMasterTab,
    item: { id: string; name: string; title?: string }
  ) => {
    setActiveDirectoryModal({ mode: "edit", type, item });
    setModalFormName(item.name);
    setModalFormTitle(type === "coaches" ? item.title || "" : "");
  };

  const closeModal = () => setActiveDirectoryModal(null);

  const handleDeleteDirectoryItem = async (
    type: StandardMasterTab,
    id: string,
    name: string
  ) => {
    if (type === "coaches") {
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
      return;
    }

    const cfg = TAXONOMY_REGISTRY[type];
    if (cfg.confirmBeforeDelete) {
      if (!confirm(`Delete ${cfg.confirmEntityLabel} "${name}" from master records?`)) {
        return;
      }
    }

    setMasterActionLoading(true);
    try {
      const res = await cfg.deleteFn(id);
      if (res.success) {
        setMasterData((prev) => ({
          ...prev,
          [cfg.key]: (prev[cfg.key] || []).filter((entry) => entry.id !== id),
        }));
        setFeedback({ type: "success", text: `${cfg.removeLabel} "${name}" removed.` });
        if (cfg.shouldRefreshOnSuccess) router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || `Failed to delete ${cfg.removeLabel.toLowerCase()}.`,
        });
      }
    } finally {
      setMasterActionLoading(false);
    }
  };

  const handleSubmitDirectoryModal = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeDirectoryModal || !modalFormName.trim()) return;

    const trimmedName = modalFormName.trim();
    const trimmedTitle = modalFormTitle.trim();

    if (activeDirectoryModal.type === "coaches" && !trimmedTitle) return;

    setMasterActionLoading(true);
    try {
      if (activeDirectoryModal.type === "coaches") {
        if (activeDirectoryModal.mode === "add") {
          const res = await wellnessCreateMasterCoach({
            name: trimmedName,
            title: trimmedTitle,
          });
          if (res.success && res.data) {
            setMasterData((prev) => ({
              ...prev,
              coaches: [...prev.coaches, res.data as MasterDataPayload["coaches"][number]],
            }));
            setFeedback({ type: "success", text: "Coach added." });
          } else {
            setFeedback({ type: "error", text: res.message || "Failed to add coach." });
          }
        } else if (activeDirectoryModal.item) {
          const itemId = activeDirectoryModal.item.id;
          const res = await wellnessUpdateMasterCoach({
            id: itemId,
            name: trimmedName,
            title: trimmedTitle,
          });
          if (res.success && res.data) {
            setMasterData((prev) => ({
              ...prev,
              coaches: prev.coaches.map((c) =>
                c.id === itemId ? (res.data as MasterDataPayload["coaches"][number]) : c
              ),
            }));
            setFeedback({ type: "success", text: "Coach updated." });
          } else {
            setFeedback({ type: "error", text: res.message || "Failed to update coach." });
          }
        }
      } else {
        const cfg = TAXONOMY_REGISTRY[activeDirectoryModal.type];
        if (activeDirectoryModal.mode === "add") {
          const res = await cfg.createFn(trimmedName);
          if (res.success && res.data) {
            setMasterData((prev) => ({
              ...prev,
              [cfg.key]: [...(prev[cfg.key] || []), res.data],
            }));
            setFeedback({ type: "success", text: cfg.addSuccess });
          } else {
            setFeedback({ type: "error", text: res.message || "Failed to add entry." });
          }
        } else if (activeDirectoryModal.item) {
          const itemId = activeDirectoryModal.item.id;
          const res = await cfg.updateFn({ id: itemId, name: trimmedName });
          if (res.success && res.data) {
            setMasterData((prev) => ({
              ...prev,
              [cfg.key]: (prev[cfg.key] || []).map((entry) =>
                entry.id === itemId ? res.data : entry
              ),
            }));
            setFeedback({ type: "success", text: cfg.updateSuccess });
          } else {
            setFeedback({ type: "error", text: res.message || "Failed to update entry." });
          }
        }
      }
      setActiveDirectoryModal(null);
      router.refresh();
    } finally {
      setMasterActionLoading(false);
    }
  };

  return {
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
  };
}
