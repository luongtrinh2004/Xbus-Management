"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import AdminScheduleView from "./components/AdminScheduleView";
import UserScheduleView from "./components/UserScheduleView";

export default function WaterSchedulePage() {
  const { data: session, status } = useSession();
  const isAdmin = ["admin", "assistant"].includes(session?.user?.role);

  const [month, setMonth] = useState(9);
  const [year, setYear] = useState(2026);
  const [schedules, setSchedules] = useState([]);
  const [weeksMeta, setWeeksMeta] = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [exemptUserIds, setExemptUserIds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/water-schedules?month=${month}&year=${year}`,
      );
      const data = await res.json();
      if (res.ok) {
        setSchedules(data.schedules || []);
        setWeeksMeta(data.weeksMeta || []);
        setEligibleUsers(data.eligibleUsers || []);
        setExemptUserIds(data.exemptUserIds || []);
        setCurrentUser(data.currentUser || null);
      }
    } catch (err) {
      console.error("[WaterSchedulePage] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (status === "loading" || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          gap: 2,
        }}
      >
        <CircularProgress size={38} color="primary" />
        <Typography variant="body2" color="text.secondary">
          Đang tải lịch bê nước...
        </Typography>
      </Box>
    );
  }

  if (isAdmin) {
    return (
      <AdminScheduleView
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        schedules={schedules}
        weeksMeta={weeksMeta}
        eligibleUsers={eligibleUsers}
        exemptUserIds={exemptUserIds}
        onRefresh={loadData}
      />
    );
  }

  return (
    <UserScheduleView
      schedules={schedules}
      currentUser={currentUser || session?.user}
    />
  );
}
