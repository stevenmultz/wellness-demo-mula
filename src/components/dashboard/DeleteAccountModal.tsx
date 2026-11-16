"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { wellnessDeleteAccount } from "@/wellness/actions/account";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) {
  const [deletePassword, setDeletePassword] = useState("");
  const [peekDeletePass, setPeekDeletePass] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setDeletePassword("");
    setDeleteError(null);
    onClose();
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await wellnessDeleteAccount({ password: deletePassword });
      if (res.success) {
        onDeleted();
      } else {
        setDeleteError(res.message || "Incorrect password.");
      }
    } catch {
      setDeleteError("Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#f6f6f4] dark:bg-[#161616] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Delete Your Account
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Please enter your password to confirm permanent account deletion (leave blank if you signed in exclusively with Google).
        </p>

        {deleteError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs">
            {deleteError}
          </div>
        )}

        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="relative">
            <input
              type={peekDeletePass ? "text" : "password"}
              placeholder="Enter your password (if set)"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm"
            />
            <button
              type="button"
              aria-label={peekDeletePass ? "Hide password" : "Show password"}
              onClick={() => setPeekDeletePass(!peekDeletePass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {peekDeletePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl graphite-button text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeletingAccount}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition"
            >
              {isDeletingAccount ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
