import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export const metadata = { title: "Đi muộn về sớm | XBus Office" };

export default function LateEarlyPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h5">Đi muộn về sớm</Typography>
      <Card variant="outlined" sx={{ boxShadow: "none" }}>
        <CardContent>
          <Box sx={{ textAlign: "center", py: { xs: 8, md: 14 } }}>
            <i
              className="tabler-clock"
              style={{ fontSize: 48 }}
              aria-hidden="true"
            />
            <Typography variant="h4" sx={{ mt: 3 }}>
              Coming Soon
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Chức năng báo cáo đi muộn về sớm đang được chuẩn bị.
            </Typography>
            <Box
              component="img"
              src="/images/coming-soon/dancing-cats.gif"
              alt="Những chú mèo đang nhảy múa"
              width={220}
              height={220}
              loading="lazy"
              sx={{
                display: "block",
                width: 220,
                maxWidth: "100%",
                height: "auto",
                mx: "auto",
                mt: 4,
                borderRadius: 2,
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
