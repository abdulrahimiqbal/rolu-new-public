"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Check, X, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

// Admin layout components
import AdminLayout from "@/components/admin/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusDetails = () => {
    switch (status.toLowerCase()) {
      case "pending":
        return {
          icon: <Clock className="h-4 w-4" />,
          color: "bg-yellow-100 text-yellow-800",
        };
      case "processing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: "bg-blue-100 text-blue-800",
        };
      case "completed":
        return {
          icon: <Check className="h-4 w-4" />,
          color: "bg-green-100 text-green-800",
        };
      case "failed":
        return {
          icon: <X className="h-4 w-4" />,
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  const { icon, color } = getStatusDetails();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${color}`}
    >
      {icon}
      <span className="ml-1.5 font-medium capitalize">
        {status.toLowerCase()}
      </span>
    </span>
  );
};

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const userType = "all";

  // Fetch user counts
  useEffect(() => {
    const fetchUserCounts = async () => {
      try {
        const response = await fetch("/api/admin/users/counts");
        if (response.ok) {
          const data = await response.json();
          setUserCount(data.totalUsers || 0);
        }
      } catch (error) {
        console.error("Error fetching user counts:", error);
      }
    };

    fetchUserCounts();
  }, []);

  // Fetch notification history when tab changes
  const fetchNotificationHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/admin/notifications/history");
      if (response.ok) {
        const data = await response.json();

        setNotificationHistory(data.notifications || []);
      } else {
        toast.error("Failed to load notification history");
      }
    } catch (error) {
      console.error("Error fetching notification history:", error);
      toast.error("An error occurred while loading history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "history") {
      fetchNotificationHistory();
    }
  };

  const handleSendNotification = async () => {
    if (!title || !message) {
      toast.error("Please provide both title and message");
      return;
    }

    if (title.length > 30) {
      toast.error("Title must be 30 characters or less");
      return;
    }

    if (message.length > 200) {
      toast.error("Message must be 200 characters or less");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          userType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || "Notification broadcast initiated");
        // Clear form after successful submission
        setTitle("");
        setMessage("");
      } else {
        toast.error(result.message || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("An error occurred while sending the notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Notifications">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notifications Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-2">Total Users</h3>
            <p className="text-3xl font-bold">{userCount}</p>
            <p className="text-sm text-gray-500 mt-2">
              Users who can receive notifications
            </p>
          </Card>

          <Card className="p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-2">Notification Limits</h3>
            <p className="text-lg">
              <span className="font-bold">1,000</span> users per batch
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Automatically processed in batches
            </p>
          </Card>
        </div>

        <Tabs
          defaultValue="broadcast"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="broadcast">
            <Card className="p-6 shadow-md">
              <h2 className="text-xl font-bold mb-6">
                Send Broadcast Notification
              </h2>

              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium mb-2"
                >
                  Title (max 30 characters)
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={30}
                  placeholder="Enter notification title"
                  className="w-full"
                />
                <div className="text-xs text-right mt-1">
                  {title.length}/30 characters
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                >
                  Message (max 200 characters)
                </label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  placeholder="Enter notification message"
                  className="w-full min-h-[100px]"
                />
                <div className="text-xs text-right mt-1">
                  {message.length}/200 characters
                </div>
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={loading || !title || !message}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Send Notification"
                )}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6 shadow-md">
              <h2 className="text-xl font-bold mb-6">Notification History</h2>

              {isLoadingHistory ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : notificationHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent/Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {notificationHistory.map((notification: any) => (
                        <tr key={notification.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(
                              new Date(notification.createdAt),
                              "MMM d, yyyy HH:mm"
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">
                            {notification.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            All Users
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={notification.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {notification.sentCount} / {notification.totalCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No notification history found.
                </p>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={fetchNotificationHistory}
                  disabled={isLoadingHistory}
                >
                  {isLoadingHistory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
