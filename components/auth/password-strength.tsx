"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  confirmPassword?: string;
  showConfirmation?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrength({
  password,
  confirmPassword,
  showConfirmation = false,
}: PasswordStrengthProps) {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: "Minimal 12 karakter", met: password.length >= 12 },
      { label: "Huruf besar (A-Z)", met: /[A-Z]/.test(password) },
      { label: "Huruf kecil (a-z)", met: /[a-z]/.test(password) },
      { label: "Angka (0-9)", met: /[0-9]/.test(password) },
      {
        label: "Karakter khusus (!@#$%^&*)",
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ];
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!showConfirmation || !confirmPassword) return null;
    return password === confirmPassword && password.length > 0;
  }, [password, confirmPassword, showConfirmation]);

  const strength = useMemo(() => {
    const metCount = requirements.filter((r) => r.met).length;
    if (metCount === 0) return 0;
    if (metCount <= 2) return 1;
    if (metCount <= 4) return 2;
    return 3;
  }, [requirements]);

  const strengthLabel = ["", "Lemah", "Sedang", "Kuat"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"][
    strength
  ];

  if (!password) return null;

  return (
    <div className="space-y-3 text-sm">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                strength >= level ? strengthColor : "bg-muted"
              )}
            />
          ))}
        </div>
        {strengthLabel && (
          <p
            className={cn(
              "text-xs",
              strength === 1 && "text-red-500",
              strength === 2 && "text-yellow-600",
              strength === 3 && "text-green-600"
            )}
          >
            Kekuatan password: {strengthLabel}
          </p>
        )}
      </div>

      {/* Requirements List */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={cn(
              "flex items-center gap-2 text-xs",
              req.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>

      {/* Password Match */}
      {showConfirmation && confirmPassword && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs",
            passwordsMatch ? "text-green-600" : "text-red-500"
          )}
        >
          {passwordsMatch ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          {passwordsMatch ? "Password cocok" : "Password tidak cocok"}
        </div>
      )}
    </div>
  );
}
