/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
// plane imports
import { IS_FAVORITE_MENU_OPEN } from "@plane/constants";
import { setToast } from "@plane/blocks/toast";
import { EPageAccess } from "@plane/types";
import { copyUrlToClipboard } from "@plane/utils";
// hooks
import { useCollaborativePageActions } from "@/hooks/use-collaborative-page-actions";
// store types
import type { TPageInstance } from "@/store/pages/base-page";
// local storage
import useLocalStorage from "./use-local-storage";

export type TPageOperations = {
  toggleLock: () => void;
  toggleAccess: () => void;
  toggleFavorite: () => void;
  openInNewTab: () => void;
  copyLink: () => void;
  duplicate: () => void;
  toggleArchive: () => void;
};

type Props = {
  page: TPageInstance;
};

export const usePageOperations = (
  props: Props
): {
  pageOperations: TPageOperations;
} => {
  const { page } = props;
  // derived values
  const {
    access,
    addToFavorites,
    archived_at,
    duplicate,
    is_favorite,
    is_locked,
    getRedirectionLink,
    removePageFromFavorites,
  } = page;
  // collaborative actions
  const { executeCollaborativeAction } = useCollaborativePageActions(props);
  // local storage
  const { setValue: toggleFavoriteMenu, storedValue: isFavoriteMenuOpen } = useLocalStorage<boolean>(
    IS_FAVORITE_MENU_OPEN,
    false
  );
  // page operations
  const pageOperations: TPageOperations = useMemo(() => {
    const pageLink = getRedirectionLink();

    return {
      copyLink: async () => {
        await copyUrlToClipboard(pageLink);
        setToast({
          type: "success",
          title: "Đã sao chép liên kết!",
          message: "Đã sao chép liên kết trang vào bộ nhớ tạm.",
        });
      },
      duplicate: async () => {
        try {
          await duplicate();
          setToast({
            type: "success",
            title: "Thành công!",
            message: "Đã tạo bản sao trang.",
          });
        } catch (_error) {
          setToast({
            type: "error",
            title: "Lỗi!",
            message: "Không thể tạo bản sao trang. Vui lòng thử lại.",
          });
        }
      },
      move: async () => {},
      openInNewTab: () => window.open(pageLink, "_blank"),
      toggleAccess: async () => {
        const changedPageType = access === EPageAccess.PUBLIC ? "riêng tư" : "công khai";
        try {
          if (access === EPageAccess.PUBLIC)
            await executeCollaborativeAction({ type: "sendMessageToServer", message: "make-private" });
          else await executeCollaborativeAction({ type: "sendMessageToServer", message: "make-public" });
          setToast({
            type: "success",
            title: "Thành công!",
            message: `Đã đánh dấu trang là ${changedPageType} và chuyển vào mục ${changedPageType}.`,
          });
        } catch (_error) {
          setToast({
            type: "error",
            title: "Lỗi!",
            message: `Không thể đánh dấu trang là ${changedPageType}. Vui lòng thử lại.`,
          });
        }
      },
      toggleArchive: async () => {
        if (archived_at) {
          try {
            await executeCollaborativeAction({ type: "sendMessageToServer", message: "unarchive" });
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã khôi phục trang.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể khôi phục trang. Vui lòng thử lại.",
            });
          }
        } else {
          try {
            await executeCollaborativeAction({ type: "sendMessageToServer", message: "archive" });
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã lưu trữ trang.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể lưu trữ trang. Vui lòng thử lại.",
            });
          }
        }
      },
      toggleFavorite: async () => {
        if (is_favorite) {
          try {
            await removePageFromFavorites();
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã bỏ trang khỏi mục yêu thích.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể bỏ trang khỏi mục yêu thích. Vui lòng thử lại sau.",
            });
          }
        } else {
          try {
            await addToFavorites();
            if (!isFavoriteMenuOpen) toggleFavoriteMenu(true);
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã thêm trang vào mục yêu thích.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể thêm trang vào mục yêu thích. Vui lòng thử lại sau.",
            });
          }
        }
      },
      toggleLock: async () => {
        if (is_locked) {
          try {
            await executeCollaborativeAction({ type: "sendMessageToServer", message: "unlock" });
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã mở khóa trang.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể mở khóa trang. Vui lòng thử lại.",
            });
          }
        } else {
          try {
            await executeCollaborativeAction({ type: "sendMessageToServer", message: "lock" });
            setToast({
              type: "success",
              title: "Thành công!",
              message: "Đã khóa trang.",
            });
          } catch (_error) {
            setToast({
              type: "error",
              title: "Lỗi!",
              message: "Không thể khóa trang. Vui lòng thử lại.",
            });
          }
        }
      },
    };
  }, [
    access,
    addToFavorites,
    archived_at,
    duplicate,
    executeCollaborativeAction,
    getRedirectionLink,
    is_favorite,
    is_locked,
    isFavoriteMenuOpen,
    removePageFromFavorites,
    toggleFavoriteMenu,
  ]);
  return {
    pageOperations,
  };
};
