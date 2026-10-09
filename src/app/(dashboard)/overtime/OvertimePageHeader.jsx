"use client";

import { Avatar, Box, Card, CardHeader, Typography } from "@mui/material";

export default function OvertimePageHeader({
  title,
  subtitle,
  icon = "tabler-clock-plus",
  actions,
}) {
  return (
    <Card>
      <CardHeader
        sx={{
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
          "& .MuiCardHeader-content": { minWidth: 240 },
          "& .MuiCardHeader-action": {
            m: 0,
            maxWidth: "100%",
            flex: { xs: "1 1 100%", lg: "0 1 auto" },
          },
        }}
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{ bgcolor: "primary.lightOpacity", color: "primary.main" }}
            >
              <i className={icon} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: { xs: "flex-start", lg: "flex-end" },
              "& .MuiButton-root": { flex: { xs: "1 1 auto", sm: "0 0 auto" } },
            }}
          >
            {actions}
          </Box>
        }
      />
    </Card>
  );
}
