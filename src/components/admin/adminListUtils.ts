import { calculateProgramMemoryFootprint, normalizeProgramStatus, type ProgramDatabaseStatus } from "@/wellness/utils/timeline";
import { isProgramHeaderComplete } from "@/wellness/validators/program";
import type {
  AdminBreadcrumbItem,
  AdminMenuKey,
  AdminPendingEnrollmentItem,
  AdminProgram,
  AdminUserItem,
} from "./adminTypes";
import { isDayFilled } from "./adminUtils";
import type { MasterDirectoryTabKey } from "./sections/AdminMasterDirectories";

export type AdminProgramSortKey =
  | "NEWEST"
  | "OLDEST"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "MEMORY_DESC"
  | "MEMORY_ASC"
  | "PRICE_DESC"
  | "PRICE_ASC";

export type AdminMemberFilterKey =
  | "ALL"
  | "ACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "SUPERADMIN";

export type AdminMemberSortKey =
  | "NEWEST"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC"
  | "ENROLLMENTS_DESC";

export function filterAndSortAdminPrograms(
  programs: AdminProgram[],
  search: string,
  filter: "ALL" | ProgramDatabaseStatus,
  sort: AdminProgramSortKey
): AdminProgram[] {
  const query = search.toLowerCase();
  const filtered = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(query) ||
      p.coachName.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (filter !== "ALL") {
      const normStatus = normalizeProgramStatus(p.status);
      if (filter === "REVIEW") {
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
      if (normStatus !== filter) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (sort) {
      case "NEWEST":
        return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      case "OLDEST":
        return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      case "TITLE_ASC":
        return a.title.localeCompare(b.title);
      case "TITLE_DESC":
        return b.title.localeCompare(a.title);
      case "MEMORY_DESC":
        return calculateProgramMemoryFootprint(b).bytes - calculateProgramMemoryFootprint(a).bytes;
      case "MEMORY_ASC":
        return calculateProgramMemoryFootprint(a).bytes - calculateProgramMemoryFootprint(b).bytes;
      case "PRICE_DESC":
        return b.price - a.price;
      case "PRICE_ASC":
        return a.price - b.price;
      default:
        return 0;
    }
  });
}

export function filterAndSortAdminMembers(
  users: AdminUserItem[],
  search: string,
  filter: AdminMemberFilterKey,
  sort: AdminMemberSortKey
): AdminUserItem[] {
  const query = search.toLowerCase();
  return users
    .filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        (m.phone || "").toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (filter === "ACTIVE") return m.status === "ACTIVE";
      if (filter === "PENDING") return m.enrollments.some((e) => e.status === "PENDING");
      if (filter === "SUSPENDED") return m.status === "SUSPENDED";
      if (filter === "SUPERADMIN") return m.role === "SUPERADMIN";
      return true;
    })
    .sort((a, b) => {
      if (sort === "NEWEST") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sort === "OLDEST") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sort === "NAME_ASC") return a.fullName.localeCompare(b.fullName);
      if (sort === "NAME_DESC") return b.fullName.localeCompare(a.fullName);
      if (sort === "ENROLLMENTS_DESC") return b.enrollments.length - a.enrollments.length;
      return 0;
    });
}

export function extractPendingEnrollments(
  users: AdminUserItem[]
): AdminPendingEnrollmentItem[] {
  return users.flatMap((u) =>
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
}

interface BuildBreadcrumbsArgs {
  activeMenu: AdminMenuKey;
  isCreatingProgram: boolean;
  selectedProgram: AdminProgram | null;
  programDetailTab: "info" | "schedule" | "responses";
  masterTab: MasterDirectoryTabKey;
  inspectingUserHealth: AdminUserItem | null;
  customerModalTab: "overview" | "responses" | "profile" | "notes";
  onGoRoot: () => void;
  onGoPrograms: () => void;
  onSelectScheduleTab: () => void;
  onGoDirectoriesCoaches: () => void;
  onCloseCustomerDetail: () => void;
  onSwitchCustomerOverview: () => void;
}

export function buildAdminBreadcrumbs({
  activeMenu,
  isCreatingProgram,
  selectedProgram,
  programDetailTab,
  masterTab,
  inspectingUserHealth,
  customerModalTab,
  onGoRoot,
  onGoPrograms,
  onSelectScheduleTab,
  onGoDirectoriesCoaches,
  onCloseCustomerDetail,
  onSwitchCustomerOverview,
}: BuildBreadcrumbsArgs): AdminBreadcrumbItem[] {
  const items: AdminBreadcrumbItem[] = [{ label: "Admin", onClick: onGoRoot }];

  if (activeMenu === "dashboard") {
    items.push({ label: "Dashboard", isCurrent: true });
  } else if (activeMenu === "programs") {
    items.push({
      label: "Programs",
      onClick: isCreatingProgram || Boolean(selectedProgram) ? onGoPrograms : undefined,
      isCurrent: !isCreatingProgram && !selectedProgram,
    });

    if (isCreatingProgram) {
      items.push({ label: "Create New Program", isCurrent: true });
    } else if (selectedProgram) {
      items.push({
        label: selectedProgram.title,
        onClick: programDetailTab !== "schedule" ? onSelectScheduleTab : undefined,
        isCurrent: false,
      });
      items.push({
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
    items.push({
      label: "Directories",
      onClick: onGoDirectoriesCoaches,
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
        : masterTab === "organizations"
        ? "Communities"
        : "Daily Commitments";

    items.push({ label: activeDirectoryLabel, isCurrent: true });
  } else if (activeMenu === "members") {
    items.push({
      label: "Customers",
      onClick: inspectingUserHealth ? onCloseCustomerDetail : undefined,
      isCurrent: !inspectingUserHealth,
    });

    if (inspectingUserHealth) {
      items.push({
        label: inspectingUserHealth.fullName,
        onClick: customerModalTab !== "overview" ? onSwitchCustomerOverview : undefined,
        isCurrent: customerModalTab === "overview",
      });
      if (customerModalTab !== "overview") {
        const tabLabels: Record<string, string> = {
          responses: "Daily Responses",
          profile: "Personal Profile",
          notes: "Coach Notes",
        };
        items.push({
          label: tabLabels[customerModalTab] || "Detail",
          isCurrent: true,
        });
      }
    }
  } else if (activeMenu === "payments") {
    items.push({ label: "Payments", isCurrent: true });
  } else if (activeMenu === "team") {
    items.push({ label: "Team & Coaches", isCurrent: true });
  }

  return items;
}
