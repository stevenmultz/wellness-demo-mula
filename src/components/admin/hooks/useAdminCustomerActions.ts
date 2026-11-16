"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  wellnessAdminApprovePayment,
  wellnessAdminDeleteUser,
  wellnessAdminResetUserPassword,
  wellnessAdminUpdateCustomerProfile,
  wellnessAdminUpdateUserStatus,
} from "@/wellness/actions/admin";
import type {
  AdminCustomerHealthProfile,
  AdminFeedbackMessage,
  AdminInitialRoute,
  AdminProgram,
  AdminUserItem,
} from "../adminTypes";

type CustomerTabKey = "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes";

interface UseAdminCustomerActionsArgs {
  initialUsers: AdminUserItem[];
  initialRoute?: AdminInitialRoute;
  setUsers: Dispatch<SetStateAction<AdminUserItem[]>>;
  setPrograms: Dispatch<SetStateAction<AdminProgram[]>>;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

export function useAdminCustomerActions({
  initialUsers,
  initialRoute,
  setUsers,
  setPrograms,
  setFeedback,
}: UseAdminCustomerActionsArgs) {
  const router = useRouter();

  const initialCustomer = useMemo(() => {
    if (initialRoute?.menu === "members" && initialRoute?.customerId) {
      return initialUsers.find((u) => u.id === initialRoute.customerId) || null;
    }
    return null;
  }, [initialRoute, initialUsers]);

  const [inspectingUserHealth, setInspectingUserHealth] =
    useState<AdminUserItem | null>(initialCustomer);
  const [customerModalTab, setCustomerModalTab] = useState<CustomerTabKey>(
    initialRoute?.customerTab || "overview"
  );
  const [customerResponseStatusFilter, setCustomerResponseStatusFilter] = useState<
    "ALL" | "COMPLETED" | "PENDING"
  >("ALL");
  const [customerResponsePhotosOnly, setCustomerResponsePhotosOnly] = useState(false);
  const [customerResponseSearch, setCustomerResponseSearch] = useState("");
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});
  const [customerCoachNotes, setCustomerCoachNotes] = useState(
    initialCustomer?.healthProfile?.coachNotes || ""
  );
  const [customerDietType, setCustomerDietType] = useState(
    initialCustomer?.healthProfile?.dietType || ""
  );
  const [customerHeight, setCustomerHeight] = useState<string | number>(
    initialCustomer?.healthProfile?.heightCm ?? ""
  );
  const [customerWeight, setCustomerWeight] = useState<string | number>(
    initialCustomer?.healthProfile?.weightKg ?? ""
  );
  const [selectedCustomerProgramId, setSelectedCustomerProgramId] = useState<string | null>(
    null
  );
  const [customerInjuries, setCustomerInjuries] = useState(
    initialCustomer?.healthProfile?.injuriesOrConditions || ""
  );
  const [customerAllergies, setCustomerAllergies] = useState(
    initialCustomer?.healthProfile?.foodAllergies || ""
  );
  const [savingCustomerProfile, setSavingCustomerProfile] = useState(false);
  const [customerProfileSuccess, setCustomerProfileSuccess] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const openCustomerDetail = (
    u: AdminUserItem,
    tab: CustomerTabKey = "overview"
  ) => {
    setInspectingUserHealth(u);
    setCustomerModalTab(tab);
    setCustomerResponseStatusFilter("ALL");
    setCustomerResponsePhotosOnly(false);
    setCustomerResponseSearch("");
    setExpandedResponseIds({});
    setCustomerCoachNotes(u.healthProfile?.coachNotes || "");
    setCustomerDietType(u.healthProfile?.dietType || "");
    setCustomerHeight(u.healthProfile?.heightCm ?? "");
    setCustomerWeight(u.healthProfile?.weightKg ?? "");
    setSelectedCustomerProgramId(null);
    setCustomerInjuries(u.healthProfile?.injuriesOrConditions || "");
    setCustomerAllergies(u.healthProfile?.foodAllergies || "");
    setCustomerProfileSuccess(null);
    router.push(`/admin/customers/${u.id}?tab=${tab}`);
  };

  const closeCustomerDetail = () => {
    setInspectingUserHealth(null);
    setCustomerProfileSuccess(null);
    router.push("/admin/customers");
  };

  const switchCustomerTab = (tab: CustomerTabKey) => {
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

  return {
    inspectingUserHealth,
    setInspectingUserHealth,
    customerModalTab,
    customerResponseStatusFilter,
    setCustomerResponseStatusFilter,
    customerResponsePhotosOnly,
    setCustomerResponsePhotosOnly,
    customerResponseSearch,
    setCustomerResponseSearch,
    expandedResponseIds,
    setExpandedResponseIds,
    customerCoachNotes,
    setCustomerCoachNotes,
    customerDietType,
    customerHeight,
    customerWeight,
    selectedCustomerProgramId,
    setSelectedCustomerProgramId,
    customerInjuries,
    customerAllergies,
    savingCustomerProfile,
    customerProfileSuccess,
    userActionLoading,
    setUserActionLoading,
    approvingId,
    openCustomerDetail,
    closeCustomerDetail,
    switchCustomerTab,
    handleSaveCustomerProfile,
    handleApprovePayment,
    handleDeleteUser,
    handleToggleUserStatus,
    handleResetPassword,
  };
}
