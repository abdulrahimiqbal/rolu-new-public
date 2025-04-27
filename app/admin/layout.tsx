import { Inter } from "next/font/google";
import "../globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Rolu Admin Dashboard",
  description: "Admin dashboard for Rolu Educational Gaming Platform",
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
      <Toaster position="top-right" />
    </div>
  );
}
