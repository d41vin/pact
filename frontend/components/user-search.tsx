"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, CircleX, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const MIN_SEARCH_LENGTH = 2;

// Interface for user data structure used in search
interface SearchUser {
  _id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
  isFriend?: boolean;
}

// Highlight matching text in search results
const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-blue-100 font-medium text-blue-900">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
};

export default function UserSearch() {
  const router = useRouter();
  const { address } = useAppKitAccount();

  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Query users from Convex
  const searchResults = useQuery(
    api.users.searchUsers,
    query.length >= MIN_SEARCH_LENGTH
      ? { query: query.trim(), currentUserAddress: address, limit: 7 }
      : "skip"
  );

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("recentUserSearches");
    if (stored) {
      try {
        // eslint-disable-next-line
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
        localStorage.removeItem("recentUserSearches");
      }
    }
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
        setQuery("");
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    setQuery("");
    setSelectedIndex(-1);
  }, []);

  const saveRecentSearch = useCallback((user: SearchUser) => {
    setRecentSearches(prev => {
      const updated = [
        user,
        ...prev.filter((u) => u._id !== user._id),
      ].slice(0, 5);
      localStorage.setItem("recentUserSearches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Improved type from 'any' to specific SearchUser or compatible shape
  const handleUserSelect = useCallback((user: SearchUser | (typeof recentSearches)[number]) => {
    // Save to recent searches
    const recentUser: SearchUser = {
      _id: user._id,
      name: user.name,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
    };
    saveRecentSearch(recentUser);

    // Navigate to user profile
    router.push(`/${user.username}`);
    handleClose();
  }, [router, handleClose, saveRecentSearch]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("recentUserSearches");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) return;

      // searchResults can be undefined while loading or if skipped, so default to empty array
      const currentResults =
        query.length >= MIN_SEARCH_LENGTH ? (searchResults || []) : recentSearches;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < currentResults.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && currentResults[selectedIndex]) {
            handleUserSelect(currentResults[selectedIndex]);
          }
          break;
        case "Escape":
          handleClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, selectedIndex, searchResults, query, recentSearches, handleUserSelect, handleClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current[selectedIndex]) {
      resultsRef.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const showRecentSearches =
    isExpanded && query.length < MIN_SEARCH_LENGTH && recentSearches.length > 0;
  const showResults = query.length >= MIN_SEARCH_LENGTH && searchResults && searchResults.length > 0;
  const showNoResults =
    query.length >= MIN_SEARCH_LENGTH && searchResults !== undefined && searchResults.length === 0;
  const showMinCharsMessage =
    isExpanded && query.length > 0 && query.length < MIN_SEARCH_LENGTH;
  const isLoading = query.length >= MIN_SEARCH_LENGTH && searchResults === undefined;

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed state - just the icon
          <motion.button
            key="icon"
            onClick={handleExpand}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md transition-all hover:bg-zinc-50 hover:shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            aria-label="Search users"
          >
            <Search className="h-5 w-5" />
          </motion.button>
        ) : (
          // Expanded state - search input
          <motion.div
            key="search"
            className="relative"
            initial={{ width: 40, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative flex items-center rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-zinc-200">
              <Search className="mr-3 h-5 w-5 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 50))}
                placeholder="Search users..."
                className="flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
                aria-label="Search for users by name or username"
              />
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                </motion.div>
              )}
              {query && !isLoading && (
                <motion.button
                  onClick={() => setQuery("")}
                  className="mr-2 text-zinc-400 hover:text-zinc-600"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  aria-label="Clear search"
                >
                  <CircleX className="h-4 w-4" />
                </motion.button>
              )}
              <button
                onClick={handleClose}
                className="shrink-0 text-zinc-400 hover:text-zinc-600"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Results dropdown */}
            <AnimatePresence>
              {(showResults ||
                showRecentSearches ||
                showNoResults ||
                showMinCharsMessage) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
                  >
                    {/* Minimum characters message */}
                    {showMinCharsMessage && (
                      <div className="px-4 py-3 text-center text-sm text-zinc-500">
                        Type at least {MIN_SEARCH_LENGTH} characters to search
                      </div>
                    )}

                    {/* Recent searches */}
                    {showRecentSearches && (
                      <div>
                        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2">
                          <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                            Recent Searches
                          </span>
                          <button
                            onClick={clearRecentSearches}
                            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto overflow-x-hidden">
                          {recentSearches.map((user, index) => (
                            <button
                              key={user._id}
                              ref={(el) => {
                                resultsRef.current[index] = el;
                              }}
                              onClick={() => handleUserSelect(user)}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 ${selectedIndex === index
                                ? "bg-blue-50"
                                : "hover:bg-zinc-50"
                                }`}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.profileImageUrl} alt={user.name} />
                                <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-zinc-900">
                                  {user.name}
                                </div>
                                <div className="truncate text-sm text-zinc-500">
                                  @{user.username}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search results */}
                    {showResults && (
                      <div className="max-h-80 overflow-y-auto overflow-x-hidden">
                        {searchResults.map((user, index) => (
                          <motion.button
                            key={user._id}
                            ref={(el) => {
                              resultsRef.current[index] = el;
                            }}
                            onClick={() => handleUserSelect(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 ${selectedIndex === index
                              ? "bg-blue-50"
                              : "hover:bg-zinc-50"
                              }`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.profileImageUrl} alt={user.name} />
                              <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate font-medium text-zinc-900">
                                  <HighlightMatch text={user.name} query={query} />
                                </div>
                                {user.isFriend && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="mr-1 h-3 w-3" />
                                    Friend
                                  </Badge>
                                )}
                              </div>
                              <div className="truncate text-sm text-zinc-500">
                                @
                                <HighlightMatch
                                  text={user.username}
                                  query={query}
                                />
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* No results message */}
                    {showNoResults && (
                      <div className="px-4 py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                          <Search className="h-6 w-6 text-zinc-400" />
                        </div>
                        <div className="mb-1 font-medium text-zinc-900">
                          No users found
                        </div>
                        <div className="text-sm text-zinc-500">
                          Try searching with a different name or username
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}