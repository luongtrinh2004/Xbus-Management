/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
// plane types
import { Button } from "@makeplane/propel/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogHeading,
  DialogMain,
  DialogTitle,
} from "@makeplane/propel/components/dialog";
import { InputField } from "@makeplane/propel/components/input-field";
import { setToast } from "@plane/blocks/toast";
import type { ILinkDetails, ModuleLink } from "@plane/types";

type Props = {
  createLink: (formData: ModuleLink) => Promise<void>;
  data?: ILinkDetails | null;
  isOpen: boolean;
  handleClose: () => void;
  updateLink: (formData: ModuleLink, linkId: string) => Promise<void>;
};

const defaultValues: ModuleLink = {
  title: "",
  url: "",
};

export function CreateUpdateModuleLinkModal(props: Props) {
  const { isOpen, handleClose, createLink, updateLink, data } = props;
  // form info
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    control,
    reset,
  } = useForm<ModuleLink>({
    defaultValues,
  });

  const onClose = () => {
    handleClose();
  };

  const handleFormSubmit = async (formData: ModuleLink) => {
    const parsedUrl = formData.url.startsWith("http") ? formData.url : `http://${formData.url}`;
    const payload = {
      title: formData.title,
      url: parsedUrl,
    };

    try {
      if (!data) {
        await createLink(payload);
        setToast({
          type: "success",
          title: "Thành công!",
          message: "Đã tạo liên kết nhóm công việc.",
        });
      } else {
        await updateLink(payload, data.id);
        setToast({
          type: "success",
          title: "Thành công!",
          message: "Đã cập nhật liên kết nhóm công việc.",
        });
      }
      onClose();
    } catch (error: any) {
      setToast({
        type: "error",
        title: "Lỗi!",
        message: error?.data?.error ?? "Đã xảy ra lỗi. Vui lòng thử lại.",
      });
    }
  };

  useEffect(() => {
    reset({
      ...defaultValues,
      ...data,
    });
  }, [data, isOpen, reset]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="md">
        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="flex min-h-0 flex-1 flex-col">
          <DialogMain>
            <DialogHeader>
              <DialogHeading>
                <DialogTitle>{data ? "Cập nhật" : "Thêm"} Liên kết</DialogTitle>
              </DialogHeading>
            </DialogHeader>
            <DialogBody tabIndex={0}>
              <div className="space-y-3">
                <Controller
                  control={control}
                  name="url"
                  rules={{
                    required: "URL là bắt buộc",
                  }}
                  render={({ field: { value, onChange, ref } }) => (
                    <InputField
                      id="url"
                      type="text"
                      size="xl"
                      orientation="vertical"
                      label="URL"
                      value={value}
                      onChange={onChange}
                      ref={ref}
                      error={errors.url?.message}
                      placeholder={"Nhập hoặc dán URL"}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="title"
                  render={({ field: { value, onChange, ref } }) => (
                    <InputField
                      id="title"
                      type="text"
                      size="xl"
                      orientation="vertical"
                      label={"Tiêu đề hiển thị"}
                      description={"Tùy chọn"}
                      value={value}
                      onChange={onChange}
                      ref={ref}
                      error={errors.title?.message}
                      placeholder={"Bạn muốn hiển thị liên kết này như thế nào"}
                    />
                  )}
                />
              </div>
            </DialogBody>
          </DialogMain>
          <DialogActions>
            <Button variant="secondary" size="md" stretch="auto" onClick={onClose} label={"Hủy"} />
            <Button
              variant="primary"
              size="md"
              stretch="auto"
              type="submit"
              loading={isSubmitting}
              label={
                data
                  ? isSubmitting
                    ? "Đang cập nhật liên kết"
                    : "Cập nhật liên kết"
                  : isSubmitting
                    ? "Đang thêm liên kết"
                    : "Thêm liên kết"
              }
            />
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
