import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isPreviewMode, PREVIEW_PROFILE } from "@/lib/preview-mode";

export type DisplayProfile = {
  name: string;
  email?: string;
  avatarUrl?: string;
  initials: string;
  isAuthenticated: boolean;
  isGuest: boolean;
  joinDate: Date | null;
};

function initialsFrom(name?: string, email?: string) {
  const src = (name || email || "").trim();
  if (!src) return "U";
  const parts = src.split(/\s+/);
  if (parts.length === 1) return src.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Single source of truth for the signed-in user's display profile.
 * No mock data, no placeholder avatars — falls back to "Friend" + initials.
 */
export function useUserProfile(): DisplayProfile {
  const { user, isAuthenticated } = useAuth();
  const [preview, setPreview] = useState(false);
  useEffect(() => setPreview(isPreviewMode()), []);

  const liveProfile = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      (user?.email ? user.email.split("@")[0] : undefined) ||
      "Friend";
    const avatarUrl =
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      undefined;
    return {
      name,
      email: user?.email,
      avatarUrl,
      initials: initialsFrom(name, user?.email),
      isAuthenticated,
      isGuest: !isAuthenticated,
      joinDate: user?.created_at ? new Date(user.created_at) : null,
    };
  }, [user, isAuthenticated]);

  return preview
    ? {
        name: PREVIEW_PROFILE.name,
        email: PREVIEW_PROFILE.email,
        avatarUrl: PREVIEW_PROFILE.avatarUrl,
        initials: PREVIEW_PROFILE.initials,
        isAuthenticated: true,
        isGuest: false,
        joinDate: PREVIEW_PROFILE.joinDate,
      }
    : liveProfile;
}
