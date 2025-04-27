"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, Gift, Clock } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns'; // Using date-fns for simpler relative time initially
import { toast } from 'react-hot-toast'; // Import toast
import { Input } from "@/components/ui/input"; // <-- Add Input import
import { Checkbox } from "@/components/ui/checkbox"; // <-- Add Checkbox import
import { Label } from "@/components/ui/label"; // <-- Add Label import

// Type for the deposit data received from the API
interface MagicChestDepositAdmin {
    userId: string;
    username: string;
    profileImage: string | null;
    totalDeposited: number;
    latestDepositTime: string | null; // ISO string format from backend
}

// Helper function to format milliseconds into D H M S (copied for client-side use)
// Consider moving this to a shared /lib/utils if used elsewhere
function formatElapsedTime(ms: number): string {
    if (ms <= 0) {
      return "0s";
    }
  
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    let parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
    return parts.join(' ');
}

// Component to display dynamically updating elapsed time for a single deposit
function ElapsedTimeDisplay({ startTimeIso }: { startTimeIso: string | null }) {
    const [elapsed, setElapsed] = useState<string>("-");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (startTimeIso) {
            const startTime = new Date(startTimeIso).getTime();

            const update = () => {
                const currentElapsed = Date.now() - startTime;
                setElapsed(formatElapsedTime(currentElapsed));
            };

            update(); // Initial update
            intervalRef.current = setInterval(update, 1000); // Update every second
        } else {
            setElapsed("-");
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [startTimeIso]);

    return <span>{elapsed}</span>;
}

export default function AdminMagicChestPage() {
    const { t } = useTranslation();
    const [deposits, setDeposits] = useState<MagicChestDepositAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGranting, setIsGranting] = useState<Record<string, boolean>>({});
    const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({}); // State for custom inputs
    const [error, setError] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set()); // <-- State for selected users
    const [isBulkGranting, setIsBulkGranting] = useState(false); // <-- State for bulk grant loading

    const fetchDeposits = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        // Reset custom amounts when fetching, but keep isGranting state
        setCustomAmounts({});
        setSelectedUserIds(new Set()); // <-- Clear selection on fetch
        try {
            const response = await fetch("/api/admin/magic-chest/deposits");
            const data = await response.json();
            if (response.ok && data.success) {
                setDeposits(data.deposits || []);
            } else {
                throw new Error(data.error || "Failed to fetch deposits");
            }
        } catch (err) {
            console.error("Error fetching deposits:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred");
            setDeposits([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeposits();
    }, [fetchDeposits]);

    // Handle changes in custom amount inputs
    const handleCustomAmountChange = (userId: string, value: string) => {
        // Allow only numbers and a single decimal point
        if (/^\d*\.?\d*$/.test(value)) {
            setCustomAmounts(prev => ({ ...prev, [userId]: value }));
        }
    };

    const handleGrantReward = async (userId: string) => {
        setIsGranting(prev => ({ ...prev, [userId]: true }));

        const customAmountStr = customAmounts[userId] || "";
        let customAmountNum: number | undefined = undefined;
        let requestBody: { userId: string; customRewardAmount?: number } = { userId };

        if (customAmountStr !== "") {
            const parsedAmount = parseFloat(customAmountStr);
            if (!isNaN(parsedAmount) && parsedAmount >= 0) {
                customAmountNum = parsedAmount;
                requestBody.customRewardAmount = customAmountNum;
            } else {
                // Optional: Show warning if input is invalid but non-empty?
                console.warn(`Invalid custom amount input '${customAmountStr}' for user ${userId}. Using default calculation.`);
                // Don't send customRewardAmount if input is invalid
            }
        }
        // If customAmountStr is empty, customRewardAmount is not sent, backend uses default

        try {
            const response = await fetch("/api/admin/magic-chest/grant-reward", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody), // Send userId and optional customRewardAmount
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(result.message || `Reward granted to user ${userId}.`);
                // Clear the custom amount input for this user on success
                setCustomAmounts(prev => ({ ...prev, [userId]: "" })); 
                await fetchDeposits(); // Refresh the list
            } else {
                throw new Error(result.error || "Failed to grant reward.");
            }
        } catch (err) {
            console.error(`Error granting reward for user ${userId}:`, err);
            toast.error(err instanceof Error ? err.message : "An unknown error occurred while granting reward.");
            setIsGranting(prev => ({ ...prev, [userId]: false }));
        }
    };

    // <-- Handler for selecting/deselecting a single user
    const handleSelectUser = (userId: string, checked: boolean) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    // <-- Handler for selecting/deselecting all users
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(new Set(deposits.map(d => d.userId)));
        } else {
            setSelectedUserIds(new Set());
        }
    };

    // <-- Placeholder for bulk grant action
    const handleBulkGrant = async () => {
        if (selectedUserIds.size === 0) return;

        setIsBulkGranting(true);
        const userIdsToGrant = Array.from(selectedUserIds);
        const toastId = 'bulk-grant'; // Use a constant id for the toast
        console.log("Initiating bulk grant for users:", userIdsToGrant);
        toast.loading(`Attempting to grant rewards to ${userIdsToGrant.length} users...`, { id: toastId });

        try {
            const response = await fetch("/api/admin/magic-chest/grant-rewards-bulk", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userIds: userIdsToGrant }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(
                    `Successfully granted rewards to ${result.successCount} users.`,
                    { id: toastId }
                );
            } else if (response.ok && !result.success && result.failureCount > 0) {
                // Partial success / Some failures
                toast.error(
                    `Grant completed with errors. Failed for ${result.failureCount} users: ${result.failedUserIds?.join(', ') || 'N/A'}`,
                    { id: toastId, duration: 6000 } // Longer duration for error
                );
            } else {
                 // General failure from the API
                 throw new Error(result.error || "Bulk grant request failed.");
            }

        } catch (err) {
             console.error("Bulk grant error:", err);
             toast.error(
                 `Bulk grant failed: ${err instanceof Error ? err.message : "Unknown error"}`,
                 { id: toastId }
             );
        } finally {
             setIsBulkGranting(false);
             await fetchDeposits(); // Refresh list regardless of outcome to show updates/remaining
        }
    };

    // Determine if all visible deposits are selected (for header checkbox state)
    const allSelected = deposits.length > 0 && selectedUserIds.size === deposits.length;
    const isIndeterminate = selectedUserIds.size > 0 && selectedUserIds.size < deposits.length;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <h1 className="text-2xl font-semibold mb-6">Magic Chest - Active Deposits</h1>

            {/* <-- Add Bulk Action Button Area --> */}
            {deposits.length > 0 && !isLoading && !error && (
                <div className="mb-4 flex justify-end">
                     <Button
                        onClick={handleBulkGrant}
                        disabled={selectedUserIds.size === 0 || isBulkGranting}
                        size="sm"
                    >
                        {isBulkGranting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Gift className="mr-2 h-4 w-4" />
                        )}
                        Grant Reward ({selectedUserIds.size})
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>User Deposits Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Loading deposits...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-destructive">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="font-semibold">Error loading deposits</p>
                            <p className="text-sm">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchDeposits} className="mt-4">
                                Retry
                            </Button>
                        </div>
                    ) : deposits.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No active Magic Chest deposits found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {/* <-- Add Checkbox Header --> */}
                                    <TableHead className="w-[50px]">
                                         <Checkbox
                                            id="select-all"
                                            checked={allSelected}
                                            onCheckedChange={(checked: boolean | 'indeterminate') => handleSelectAll(Boolean(checked))}
                                            aria-label="Select all rows"
                                            data-state={isIndeterminate ? "indeterminate" : (allSelected ? "checked" : "unchecked")}
                                        />
                                    </TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Total Deposited (Rolu)</TableHead>
                                    <TableHead>Deposit Started</TableHead>
                                    <TableHead>Time Elapsed</TableHead>
                                    <TableHead className="text-center" style={{ width: '280px' }}>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deposits.map((deposit) => {
                                    const granting = isGranting[deposit.userId] || false;
                                    const customAmountValue = customAmounts[deposit.userId] || "";
                                    const isSelected = selectedUserIds.has(deposit.userId); // <-- Check if user is selected
                                    return (
                                        <TableRow
                                            key={deposit.userId}
                                            data-state={isSelected ? "selected" : ""} // <-- Style selected rows if needed
                                        >
                                             {/* <-- Add Checkbox Cell --> */}
                                             <TableCell>
                                                <Checkbox
                                                    id={`select-${deposit.userId}`}
                                                    checked={isSelected}
                                                    onCheckedChange={(checked: boolean | 'indeterminate') => handleSelectUser(deposit.userId, Boolean(checked))}
                                                    aria-labelledby={`user-${deposit.userId}-label`}
                                                 />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={deposit.profileImage ?? undefined} alt={deposit.username} />
                                                        <AvatarFallback>{deposit.username.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div id={`user-${deposit.userId}-label`} className="font-medium">{deposit.username}</div>
                                                        <div className="text-xs text-muted-foreground">ID: {deposit.userId}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{deposit.totalDeposited.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {deposit.latestDepositTime ? (
                                                    <span title={new Date(deposit.latestDepositTime).toLocaleString()}>
                                                        {formatDistanceToNowStrict(new Date(deposit.latestDepositTime), { addSuffix: true })}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ElapsedTimeDisplay startTimeIso={deposit.latestDepositTime} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Input
                                                        type="text" 
                                                        placeholder={`Default: ${(deposit.totalDeposited * 1.10).toFixed(2)}`} // Show default as placeholder
                                                        value={customAmountValue}
                                                        onChange={(e) => handleCustomAmountChange(deposit.userId, e.target.value)}
                                                        className="h-9 w-28 text-sm"
                                                        disabled={granting} // Disable input while granting
                                                        aria-label={`Custom reward amount for ${deposit.username}`}
                                                    />
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleGrantReward(deposit.userId)}
                                                        disabled={granting} 
                                                        className="flex-shrink-0"
                                                    >
                                                        {granting ? (
                                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                        ) : (
                                                            <Gift className="w-4 h-4 mr-1.5" />
                                                        )}
                                                        {granting ? "Granting..." : "Grant"} { /* Shortened button text */}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 