"use client";
import { useEffect, useState } from "react";

export default function BullBoardPage() {
  const [data, setData] = useState(null);
  const load = () => fetch("/api/bull-board").then(r => r.json()).then(setData).catch(() => setData({ error: "Không thể kết nối queue" }));
  useEffect(() => { load(); const id = setInterval(load, 3000); return () => clearInterval(id); }, []);
  if (!data) return <main style={{ padding: 32 }}>Đang tải Bull Board…</main>;
  if (data.error) return <main style={{ padding: 32 }}>{data.error}</main>;
  return <main style={{ padding: 32, fontFamily: "system-ui" }}><h1>Bull Board — Gallery Upload</h1><p>Tự động cập nhật mỗi 3 giây.</p><pre>{JSON.stringify(data.counts, null, 2)}</pre><table><thead><tr><th>ID</th><th>Trạng thái</th><th>Tiến độ</th><th>Lỗi</th></tr></thead><tbody>{data.jobs.map(job => <tr key={job.id}><td>{job.id}</td><td>{job.name}</td><td>{typeof job.progress === "object" ? JSON.stringify(job.progress) : job.progress || 0}%</td><td>{job.failedReason || ""}</td></tr>)}</tbody></table></main>;
}
