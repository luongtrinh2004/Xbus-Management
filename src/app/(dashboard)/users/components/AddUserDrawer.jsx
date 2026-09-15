"use client";

import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import { toast } from "react-toastify";
import CustomTextField from "@core/components/mui/TextField";

const categoryOptions = [
  { value: "category_official", label: "Chính thức" },
  { value: "category_probation", label: "Thử việc" },
  { value: "category_intern", label: "Thực tập" },
  { value: "category_collaborator", label: "Cộng tác viên" },
];

const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
  { value: "unspecified", label: "Chưa xác định" },
];

const AddUserDrawer = (props) => {
  const { open, handleClose, setData } = props;

  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    code: "",
    phone: "",
    gender: "male",
    role: "user",
    typeId: "",
    categoryId: "category_official",
    status: "able",
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      code: "",
      phone: "",
      gender: "male",
      role: "user",
      typeId: "",
      categoryId: "category_official",
      status: "able",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.code.trim()
    ) {
      toast.error("Họ tên, email và mã nhân sự là bắt buộc");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const created = await response.json();
      if (response.ok) {
        setData((prev) => [created, ...(prev || [])]);
        toast.success(`Thêm nhân sự ${created.name} thành công!`);
        handleClose();
        resetForm();
      } else {
        toast.error(created.error || "Thêm nhân sự thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <Drawer
      open={open}
      anchor="right"
      variant="temporary"
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ "& .MuiDrawer-paper": { width: { xs: 320, sm: 400 } } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 4,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Thêm Nhân Sự Mới
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <i className="tabler-x text-2xl" />
        </IconButton>
      </Box>
      <Divider />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          overflowY: "auto",
        }}
      >
        <CustomTextField
          fullWidth
          label="Họ và tên *"
          placeholder="Nguyễn Văn A"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <CustomTextField
          fullWidth
          label="Email công ty *"
          placeholder="ten.ho@phenikaa-x.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          helperText="Nên dùng đuôi @phenikaa-x.com"
        />

        <CustomTextField
          fullWidth
          label="Mã nhân sự *"
          placeholder="HDK181 hoặc XBS..."
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          required
        />

        <CustomTextField
          fullWidth
          label="Số điện thoại"
          placeholder="0987654321"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />

        <CustomTextField
          select
          fullWidth
          label="Giới tính"
          value={formData.gender}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
        >
          {genderOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label="Bộ phận chuyên môn"
          value={formData.typeId}
          onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
        >
          <MenuItem value="">— Chưa gán —</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label="Hình thức nhân sự"
          value={formData.categoryId}
          onChange={(e) =>
            setFormData({ ...formData, categoryId: e.target.value })
          }
        >
          {categoryOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label="Vai trò hệ thống"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        >
          <MenuItem value="user">Nhân viên</MenuItem>
          <MenuItem value="admin">Quản trị viên</MenuItem>
          <MenuItem value="assistant">Trợ lý</MenuItem>
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label="Trạng thái ban đầu"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <MenuItem value="able">Đang hoạt động (Kích hoạt ngay)</MenuItem>
          <MenuItem value="disabled">Chờ duyệt / Vô hiệu hóa</MenuItem>
        </CustomTextField>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Tạo nhân sự
          </Button>
          <Button
            fullWidth
            variant="tonal"
            color="secondary"
            onClick={handleClose}
          >
            Hủy
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AddUserDrawer;
