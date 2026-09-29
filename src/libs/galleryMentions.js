import { getUsers } from "./dataRepository.js";
import { createNotification } from "./notificationStorage.js";

/**
 * Extracts mentioned user IDs and whether @All is mentioned.
 */
export function extractMentions(text = "", allUsers = []) {
  if (!text || typeof text !== "string") {
    return { isTagAll: false, mentionedUserIds: [] };
  }

  const isTagAll = /@all\b/i.test(text);
  const mentionedUserIds = new Set();

  for (const user of allUsers) {
    if (!user || !user.id || !user.name) continue;

    // Check for exact name match like @Nguyễn Văn A or @[Nguyễn Văn A]
    const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(
      `@(?:\\[${escapedName}\\]|${escapedName})(?=[\\s.,!?:;"'()\\[\\]{}]|$)`,
      "i"
    );

    if (nameRegex.test(text)) {
      mentionedUserIds.add(user.id);
      continue;
    }

    // Check for username / email prefix match if available
    if (user.email) {
      const emailPrefix = user.email.split("@")[0];
      if (emailPrefix && emailPrefix.length >= 3) {
        const emailRegex = new RegExp(`@${emailPrefix}\\b`, "i");
        if (emailRegex.test(text)) {
          mentionedUserIds.add(user.id);
        }
      }
    }
  }

  return {
    isTagAll,
    mentionedUserIds: Array.from(mentionedUserIds),
  };
}

/**
 * Sends notifications to users mentioned in a post or comment.
 */
export async function sendMentionNotifications({
  actor, // { id, name }
  text = "",
  explicitTaggedUserIds = [],
  explicitIsTagAll = false,
  postId,
  commentId = null,
  postTitle = "",
}) {
  try {
    const allUsers = await getUsers();
    const { isTagAll: textHasTagAll, mentionedUserIds: textMentionedIds } = extractMentions(text, allUsers);

    const isTagAll = explicitIsTagAll || textHasTagAll;
    const combinedMentionedIds = Array.from(
      new Set([...(explicitTaggedUserIds || []), ...textMentionedIds])
    );

    const actorId = actor?.id;
    const actorName = actor?.name || "Một thành viên";
    const shortSnippet =
      text.length > 60 ? text.substring(0, 60) + "..." : text;
    const cleanTitle = postTitle || "ảnh/video";

    const link = `/gallery?open=${postId}`;

    if (isTagAll) {
      // Notify all active users except the actor
      for (const u of allUsers) {
        if (!u || !u.id || u.id === actorId || u.status === "inactive") continue;

        const notiMessage = commentId
          ? `${actorName} đã nhắc đến bạn và mọi người (@All) trong một bình luận: "${shortSnippet}"`
          : `${actorName} đã nhắc đến bạn và mọi người (@All) trong bài viết: "${cleanTitle}"`;

        createNotification({
          userId: u.id,
          type: "gallery_tag",
          title: "Bạn được nhắc đến trong Thư viện",
          message: notiMessage,
          link,
          metadata: {
            postId,
            commentId,
            actorId,
            actorName,
            isAll: true,
          },
        });
      }
      return;
    }

    // Individual user mentions
    for (const userId of combinedMentionedIds) {
      if (!userId || userId === actorId) continue;

      const notiMessage = commentId
        ? `${actorName} đã gắn thẻ bạn trong một bình luận: "${shortSnippet}"`
        : `${actorName} đã gắn thẻ bạn trong bài viết: "${cleanTitle}"`;

      createNotification({
        userId,
        type: "gallery_tag",
        title: "Bạn được gắn thẻ trong Thư viện",
        message: notiMessage,
        link,
        metadata: {
          postId,
          commentId,
          actorId,
          actorName,
          isAll: false,
        },
      });
    }
  } catch (err) {
    console.error("[sendMentionNotifications] Lỗi gửi thông báo nhắc thẻ:", err);
  }
}
