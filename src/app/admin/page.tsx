import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";

export default async function AdminPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}

