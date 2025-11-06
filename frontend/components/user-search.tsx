"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, CircleX, Loader2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import { useQuery } from 'convex/react'
// import { api } from '@/convex/_generated/api'

// TODO: Replace with your actual User type from Convex
interface User {
  id: number;
  name: string;
  username: string;
  avatar?: string | null;
}

// TODO: Remove this mock data once Convex is integrated
const MOCK_USERS: User[] = [
  { id: 1, name: "Sarah Johnson", username: "sarahj", avatar: null },
  { id: 2, name: "Michael Chen", username: "mchen", avatar: null },
  { id: 3, name: "Emily Rodriguez", username: "emilyrod", avatar: null },
  { id: 4, name: "James Wilson", username: "jwilson", avatar: null },
  { id: 5, name: "Jessica Martinez", username: "jmartinez", avatar: null },
  { id: 6, name: "David Thompson", username: "dthompson", avatar: null },
  { id: 7, name: "Lisa Anderson", username: "lisaand", avatar: null },
  { id: 8, name: "Robert Taylor", username: "rtaylor", avatar: null },
];

const MIN_SEARCH_LENGTH = 2;

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<User[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // TODO: Replace this with your Convex query
  // const users = useQuery(api.users.search,
  //   query.length >= MIN_SEARCH_LENGTH ? { query } : 'skip'
  // )

  // Debounced search simulation - TODO: Remove when using Convex
  useEffect(() => {
    if (!query.trim() || query.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      // TODO: Replace this with Convex query results
      const filtered = MOCK_USERS.filter(
        (user) =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.username.toLowerCase().includes(query.toLowerCase()),
      );
      setResults(filtered);
      setIsLoading(false);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("recentUserSearches");
    if (stored) {
      try {
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) return;

      const currentResults =
        query.length >= MIN_SEARCH_LENGTH ? results : recentSearches;

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
  }, [isExpanded, selectedIndex, results, query, recentSearches]);

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

  const handleClose = () => {
    setIsExpanded(false);
    setQuery("");
    setSelectedIndex(-1);
  };

  const saveRecentSearch = (user: User) => {
    const updated = [
      user,
      ...recentSearches.filter((u) => u.id !== user.id),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentUserSearches", JSON.stringify(updated));
  };

  const handleUserSelect = (user: User) => {
    console.log("Selected user:", user);
    saveRecentSearch(user);
    // TODO: Navigate to user profile or open user modal
    // router.push(`/profile/${user.username}`)
    handleClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentUserSearches");
  };

  const showRecentSearches =
    isExpanded && query.length < MIN_SEARCH_LENGTH && recentSearches.length > 0;
  const showResults = query.length >= MIN_SEARCH_LENGTH && results.length > 0;
  const showNoResults =
    query.length >= MIN_SEARCH_LENGTH && !isLoading && results.length === 0;
  const showMinCharsMessage =
    isExpanded && query.length > 0 && query.length < MIN_SEARCH_LENGTH;

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed state - just the icon
          <motion.button
            key="icon"
            onClick={handleExpand}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-shadow hover:shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            aria-label="Search users"
          >
            <Search className="h-5 w-5 text-slate-700" />
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
            <div className="relative flex items-center rounded-full bg-white px-4 py-2.5 shadow-lg">
              <Search className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 50))}
                placeholder="Search users..."
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Search for users by name or username"
              />
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                </motion.div>
              )}
              {query && !isLoading && (
                <motion.button
                  onClick={() => setQuery("")}
                  className="mr-2 text-slate-400 hover:text-slate-600"
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
                className="flex-shrink-0 text-slate-400 hover:text-slate-600"
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
                  className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  {/* Minimum characters message */}
                  {showMinCharsMessage && (
                    <div className="px-4 py-3 text-center text-sm text-slate-500">
                      Type at least {MIN_SEARCH_LENGTH} characters to search
                    </div>
                  )}

                  {/* Recent searches */}
                  {showRecentSearches && (
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Recent Searches
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-slate-400 transition-colors hover:text-slate-600"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {recentSearches.map((user, index) => (
                          <button
                            key={user.id}
                            ref={(el) => {
                              resultsRef.current[index] = el;
                            }}
                            onClick={() => handleUserSelect(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                              selectedIndex === index
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 font-medium text-white">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-slate-900">
                                {user.name}
                              </div>
                              <div className="truncate text-sm text-slate-500">
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
                    <div className="max-h-80 overflow-y-auto">
                      {results.map((user, index) => (
                        <motion.button
                          key={user.id}
                          ref={(el) => {
                            resultsRef.current[index] = el;
                          }}
                          onClick={() => handleUserSelect(user)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                            selectedIndex === index
                              ? "bg-blue-50"
                              : "hover:bg-slate-50"
                          }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 font-medium text-white">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-slate-900">
                              <HighlightMatch text={user.name} query={query} />
                            </div>
                            <div className="truncate text-sm text-slate-500">
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
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Search className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="mb-1 font-medium text-slate-900">
                        No users found
                      </div>
                      <div className="text-sm text-slate-500">
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
