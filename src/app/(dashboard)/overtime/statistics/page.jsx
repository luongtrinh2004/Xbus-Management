import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/libs/auth";
import { getUsers } from "@/libs/dataRepository";
import { isOtManager } from "@/libs/overtime";
import OvertimeStatistics from "./OvertimeStatistics";

export const metadata = { title: "Thống kê làm thêm giờ | XBus Office" };
export default async function OvertimeStatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const actor = (await getUsers()).find(
    (user) => user.id === session.user.id && user.status === "able",
  );
  if (!isOtManager(actor)) redirect("/401");
  return <OvertimeStatistics />;
}
