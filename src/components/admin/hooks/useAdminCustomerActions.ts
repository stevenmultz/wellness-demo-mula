"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  wellnessAdminApprovePayment,
  wellnessAdminDeleteUser,
  wellnessAdminResetUserPassword,
  wellnessAdminUpdateUserStatus,
} from "@/wellness/actions/admin";
import type {
  AdminFeedbackMessage,
  AdminInitialRoute,
  AdminProgram,
  AdminUserItem,
} from "../adminTypes";

type CustomerTabKey = "overview" | "responses" | "profile" | "notes";

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
  const [customerResponseSearch, setCustomerResponseSearch] = useState("");
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});
  const [selectedCustomerProgramId, setSelectedCustomerProgramId] = useState<string | null>(
    null
  );
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const openCustomerDetail = (
    u: AdminUserItem,
    tab: CustomerTabKey = "overview"
  ) => {
    setInspectingUserHealth(u);
    setCustomerModalTab(tab);
    setCustomerResponseStatusFilter("ALL");
    setCustomerResponseSearch("");
    setExpandedResponseIds({});
    setSelectedCustomerProgramId(null);
    router.push(`/admin/customers/${u.id}?tab=${tab}`);
  };

  const closeCustomerDetail = () => {
    setInspectingUserHealth(null);
    router.push("/admin/customers");
  };

  const switchCustomerTab = (tab: CustomerTabKey) => {
    setCustomerModalTab(tab);
    if (inspectingUserHealth) {
      router.push(`/admin/customers/${inspectingUserHealth.id}?tab=${tab}`);
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
        setFeedback({
          type: "success",
          text: res.message || `User status updated to ${nextStatus}.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update user status.",
        });
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
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to reset user password.",
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
    customerResponseSearch,
    setCustomerResponseSearch,
    expandedResponseIds,
    setExpandedResponseIds,
    selectedCustomerProgramId,
    setSelectedCustomerProgramId,
    userActionLoading,
    setUserActionLoading,
    approvingId,
    openCustomerDetail,
    closeCustomerDetail,
    switchCustomerTab,
    handleApprovePayment,
    handleDeleteUser,
    handleToggleUserStatus,
    handleResetPassword,
  };
}
