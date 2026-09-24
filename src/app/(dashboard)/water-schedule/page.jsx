"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import AdminScheduleView from "./components/AdminScheduleView";
import UserScheduleView from "./components/UserScheduleView";
import { toVietnamDateKey } from "@/libs/dateTime";

const currentVietnamPeriod = () => {
  const [year, month] = toVietnamDateKey().split("-").map(Number);
  return { month, year };
};

export default function WaterSchedulePage() {
  const { data: session, status } = useSession();
  const isAdmin = ["admin", "assistant"].includes(session?.user?.role);

  const [month, setMonth] = useState(() => currentVietnamPeriod().month);
  const [year, setYear] = useState(() => currentVietnamPeriod().year);
  const [schedules, setSchedules] = useState([]);
  const [weeksMeta, setWeeksMeta] = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [trashAssignableUsers, setTrashAssignableUsers] = useState([]);
  const [exemptUserIds, setExemptUserIds] = useState([]);
  const [trashSchedules, setTrashSchedules] = useState([]);
  const [myTrashSchedules, setMyTrashSchedules] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(
    async ({ showLoading = false } = {}) => {
      try {
        if (showLoading) setLoading(true);
        const res = await fetch(
          `/api/water-schedules?month=${month}&year=${year}`,
        );
        const data = await res.json();
        if (res.ok) {
          setSchedules(data.schedules || []);
          setWeeksMeta(data.weeksMeta || []);
          setEligibleUsers(data.eligibleUsers || []);
          setTrashAssignableUsers(data.trashAssignableUsers || []);
          setExemptUserIds(data.exemptUserIds || []);
          setTrashSchedules(data.trashSchedules || []);
          setMyTrashSchedules(data.myTrashSchedules || []);
          setCurrentUser(data.currentUser || null);
        }
      } catch (err) {
        console.error("[WaterSchedulePage] Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    },
    [month, year],
  );

  useEffect(() => {
    loadData({ showLoading: true });
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <AdminScheduleView
          month={month}
          setMonth={setMonth}
          year={year}
          setYear={setYear}
          schedules={schedules}
          weeksMeta={weeksMeta}
          eligibleUsers={eligibleUsers}
          trashAssignableUsers={trashAssignableUsers}
          exemptUserIds={exemptUserIds}
          trashSchedules={trashSchedules}
          onRefresh={() => loadData()}
        />
        <UserScheduleView
          schedules={schedules}
          trashSchedules={myTrashSchedules}
          currentUser={currentUser || session?.user}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <UserScheduleView
        trashSchedules={myTrashSchedules}
        schedules={schedules}
        currentUser={currentUser || session?.user}
      />
    </Box>
  );
}
