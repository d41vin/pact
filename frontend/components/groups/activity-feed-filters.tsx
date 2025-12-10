"use client";

import { useState } from "react";
import { Filter, Search, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Id } from "@/convex/_generated/dataModel";

// Type for activity as returned from the backend
interface Activity {
  _id: string;
  _creationTime: number;
  type: string;
  actor?: {
    _id: Id<"users">;
    _creationTime: number;
    email?: string;
    profileImageUrl?: string;
    name: string;
    username: string;
    userAddress: string;
  } | null;
  group?: {
    _id?: Id<"groups">;
    _creationTime?: number;
    permissions?: {
      whoCanInvite: "all" | "admins" | "creator";
      whoCanCreatePacts: "all" | "admins";
    };
    name: string;
    description?: string;
    imageOrEmoji?: string;
    imageType?: "emoji" | "image";
    accentColor?: string;
    creatorId?: Id<"users">;
    privacy?: "public" | "private";
    joinMethod?: "request" | "invite" | "code" | "nft";
  } | null;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedFiltersProps {
  activities: Activity[];
  onFilteredActivitiesChange: (filtered: Activity[]) => void;
}

const ACTIVITY_TYPES = [
  { value: "group_created", label: "Group Created" },
  { value: "member_joined", label: "Member Joined" },
  { value: "member_left", label: "Member Left" },
  { value: "member_removed", label: "Member Removed" },
  { value: "admin_promoted", label: "Admin Promoted" },
  { value: "admin_demoted", label: "Admin Demoted" },
  { value: "settings_changed", label: "Settings Changed" },
  { value: "code_created", label: "Invite Code Created" },
  { value: "code_used", label: "Code Used" },
  { value: "pact_created", label: "Pact Created" },
  { value: "pact_used", label: "Pact Used" },
];

export default function ActivityFeedFilters({
  activities,
  onFilteredActivitiesChange,
}: ActivityFeedFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Apply filters
  const applyFilters = (search: string, types: string[]) => {
    let filtered = [...activities];

    // Filter by type
    if (types.length > 0) {
      filtered = filtered.filter((activity) => types.includes(activity.type));
    }

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((activity) => {
        const actorName = activity.actor?.name?.toLowerCase() || "";
        const groupName = activity.group?.name?.toLowerCase() || "";
        const type = activity.type.toLowerCase();

        return (
          actorName.includes(query) ||
          groupName.includes(query) ||
          type.includes(query)
        );
      });
    }

    onFilteredActivitiesChange(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    applyFilters(value, selectedTypes);
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];

    setSelectedTypes(newTypes);
    applyFilters(searchQuery, newTypes);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    onFilteredActivitiesChange(activities);
  };

  const handleSelectAll = () => {
    const allTypes = ACTIVITY_TYPES.map((t) => t.value);
    setSelectedTypes(allTypes);
    applyFilters(searchQuery, allTypes);
  };

  const handleDeselectAll = () => {
    setSelectedTypes([]);
    applyFilters(searchQuery, []);
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["Time", "Type", "Actor", "Group", "Details"];
    const rows = activities.map((activity) => [
      new Date(activity._creationTime).toLocaleString(),
      activity.type,
      activity.actor?.name || "Unknown",
      activity.group?.name || "N/A",
      JSON.stringify(activity.metadata || {}),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const hasActiveFilters = searchQuery.trim() || selectedTypes.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-9 pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {selectedTypes.length > 0 && (
                <span className="ml-1 rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white">
                  {selectedTypes.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Activity Types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex gap-2 px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex-1 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="flex-1 text-xs"
              >
                Clear
              </Button>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              {ACTIVITY_TYPES.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => handleTypeToggle(type.value)}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={activities.length === 0}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-600">
            Showing {activities.length} result
            {activities.length !== 1 ? "s" : ""}
          </span>
          {selectedTypes.length > 0 && (
            <span className="text-zinc-500">
              • {selectedTypes.length} type
              {selectedTypes.length !== 1 ? "s" : ""} selected
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="ml-auto text-zinc-500 hover:text-zinc-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
