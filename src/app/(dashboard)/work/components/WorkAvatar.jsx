"use client";

import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";

const FALLBACK_AVATAR = "/images/avatars/male-user.png";

/** A single resilient avatar treatment for every work-management screen. */
export default function WorkAvatar({ user, alt, ...props }) {
  const src = user?.avatarUrl || FALLBACK_AVATAR;
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => setImageSrc(src), [src]);

  return (
    <Avatar
      {...props}
      alt={alt || user?.name || "Người dùng"}
      src={imageSrc}
      imgProps={{ onError: () => setImageSrc(FALLBACK_AVATAR) }}
    >
      {user?.name?.trim()?.[0]?.toUpperCase() || "?"}
    </Avatar>
  );
}
