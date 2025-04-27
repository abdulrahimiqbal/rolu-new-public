import React from "react";
import AdminLayout from "@/components/admin/admin-layout";
export default function layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout title="Brand Management">{children}</AdminLayout>;
}
