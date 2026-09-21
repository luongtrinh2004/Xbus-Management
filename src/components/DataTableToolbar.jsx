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
        p: { xs: 2, sm: 3 },
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 2,
        flexWrap: "wrap",
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: { xs: "100%", sm: "auto" } }}>
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
          width: { xs: "100%", sm: "auto" },
          "& > .MuiButton-root": { flex: { xs: "1 1 auto", sm: "0 0 auto" } },
        }}
      >
        <CustomTextField
          size="small"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          sx={{ minWidth: 0, width: { xs: "100%", sm: 260 } }}
          InputProps={{
            startAdornment: <i className="tabler-search text-gray-400 mr-2" />,
          }}
        />
        {children}
      </Box>
    </Box>
  );
}
