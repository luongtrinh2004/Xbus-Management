"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import CustomTextField from "@core/components/mui/TextField";

export default function DataTableToolbar({
  search,
  onSearchChange,
  limit,
  onLimitChange,
  placeholder,
  children,
}) {
  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Hiển thị
        </Typography>
        <CustomTextField
          select
          size="small"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          sx={{ width: 80 }}
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
        </CustomTextField>
        <Typography variant="body2" color="text.secondary">
          dòng
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <CustomTextField
          size="small"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: <i className="tabler-search text-gray-400 mr-2" />,
          }}
        />
        {children}
      </Box>
    </Box>
  );
}
