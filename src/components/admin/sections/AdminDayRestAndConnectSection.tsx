"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AdminDayFormState } from "../adminTypes";

interface AdminDayRestAndConnectSectionProps {
  dayForm: AdminDayFormState;
  setDayForm: Dispatch<SetStateAction<AdminDayFormState>>;
}

export function AdminDayRestAndConnectSection({
  dayForm,
  setDayForm,
}: AdminDayRestAndConnectSectionProps) {
  return (
    <>
  {/* MODE B: REST_DAY */}
  {dayForm.dayType === "REST_DAY" && (
    <div className="space-y-2 pt-4">
      <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
        Parasympathetic Restoration &amp; Recovery Guide *
      </label>
      <textarea
        rows={5}
        placeholder="Enter parasympathetic restoration guide"
        value={dayForm.restInstructions}
        onChange={(e) =>
          setDayForm((p) => ({
            ...p,
            restInstructions: e.target.value,
          }))
        }
        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
      />
    </div>
  )}

  {/* MODE C: CONNECTION_DAY / MEETUP_DAY */}
  {(dayForm.dayType === "CONNECTION_DAY" ||
    dayForm.dayType === "MEETUP_DAY") && (
    <div className="space-y-5 pt-4">
      {/* Row 1: Event Title & Schedule (Max 2 columns) */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Event / Meetup Title *
          </label>
          <input
            type="text"
            placeholder="Enter event or meetup title..."
            value={dayForm.eventTitle}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                eventTitle: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Session Schedule (WIB) *
          </label>
          <input
            type="text"
            placeholder="Enter session time in WIB"
            value={dayForm.onsiteSchedule}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                onsiteSchedule: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Row 2: Studio Venue & Google Maps Link (Max 2 columns) */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Location / Studio Venue *
          </label>
          <input
            type="text"
            placeholder="Enter studio venue and location in Jakarta..."
            value={dayForm.onsiteVenue}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                onsiteVenue: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Google Maps Link (Venue URL)
          </label>
          <input
            type="url"
            placeholder="Enter Google Maps venue URL (https://maps.app.goo.gl/...)..."
            value={dayForm.mapLink}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                mapLink: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Row 3: Event Host & Virtual Fallback Link (Max 2 columns) */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Who Members Will Meet (Host / Coach)
          </label>
          <input
            type="text"
            placeholder="Enter event host or coach name..."
            value={dayForm.eventHost}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                eventHost: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Virtual Broadcast Link (Remote Fallback)
          </label>
          <input
            type="url"
            placeholder="Enter virtual broadcast link (https://meet.google.com/...)..."
            value={dayForm.meetupLink}
            onChange={(e) =>
              setDayForm((p) => ({
                ...p,
                meetupLink: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Row 4: Event Details & Rundown */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
          Event Details &amp; Agenda Rundown (WIB)
        </label>
        <textarea
          rows={3}
          placeholder="Enter event details and agenda rundown in WIB..."
          value={dayForm.eventDetails}
          onChange={(e) =>
            setDayForm((p) => ({
              ...p,
              eventDetails: e.target.value,
            }))
          }
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
        />
      </div>
    </div>
  )}
    </>
  );
}
