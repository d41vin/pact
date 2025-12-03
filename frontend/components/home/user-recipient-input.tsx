"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { User, X, Users, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/date-utils";

export interface RecipientUser {
  _id: string;
  name: string;
  username: string;
  userAddress: string;
  profileImageUrl?: string;
  isFriend?: boolean;
  lastPaymentDate?: number;
}

interface UserRecipientInputProps {
  value: RecipientUser | string | null;
  onChange: (value: RecipientUser | string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function UserRecipientInput({
  value,
  onChange,
  placeholder = "Search user or paste address",
  className,
}: UserRecipientInputProps) {
  const { address } = useAppKitAccount();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RecipientUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search users
  const searchResults = useQuery(
    api.users.searchUsers,
    inputValue.trim().length > 0
      ? {
          query: inputValue.trim(),
          currentUserAddress: address,
        }
      : "skip",
  );

  // Validate if input is a valid wallet address
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  // When a complete wallet address is pasted/typed, validate it
  const isCompleteAddress = isValidAddress(inputValue.trim());
  const addressCheck = useQuery(
    api.payments.checkUserByAddress,
    isCompleteAddress ? { address: inputValue.trim() } : "skip",
  );

  // Get recent recipients
  const recentRecipients = useQuery(
    api.users.getRecentRecipients,
    address && !inputValue.trim() && isOpen ? { userAddress: address } : "skip",
  );

  // Check if input is a wallet address format (even if incomplete)
  const looksLikeAddress = inputValue.trim().startsWith("0x");

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle user selection
  const handleSelectUser = (user: RecipientUser) => {
    setSelectedUser(user);
    setInputValue("");
    setIsOpen(false);
    onChange(user);
  };

  // Handle clear
  const handleClear = () => {
    setSelectedUser(null);
    setInputValue("");
    onChange(null);
    inputRef.current?.focus();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // If it's a valid wallet address, set it as raw address (will be validated by addressCheck)
    if (isValidAddress(newValue)) {
      // Don't set immediately - let addressCheck query run first
      // We'll handle this in the dropdown display
    } else {
      onChange(null);
    }
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // If user is selected, show the card view
  if (selectedUser) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedUser.profileImageUrl} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-slate-900">
              {selectedUser.name}
            </div>
            {selectedUser.isFriend && (
              <Badge variant="secondary" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                Friend
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-500">
            @{selectedUser.username} • {formatAddress(selectedUser.userAddress)}
          </div>
        </div>
        <button
          onClick={handleClear}
          className="flex-shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn("pr-10", className)}
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <Command className="rounded-lg">
            <CommandList>
              {/* Recent Recipients */}
              {!inputValue.trim() &&
                recentRecipients &&
                recentRecipients.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recentRecipients.map((recipient) => (
                      <CommandItem
                        key={recipient._id}
                        onSelect={() => handleSelectUser(recipient)}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={recipient.profileImageUrl} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {recipient.name}
                            </span>
                            {recipient.isFriend && (
                              <Badge variant="secondary" className="text-xs">
                                Friend
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>@{recipient.username}</span>
                            {recipient.lastPaymentDate && (
                              <>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTimeAgo(recipient.lastPaymentDate)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

              {/* Search Results */}
              {inputValue.trim() && (
                <>
                  {/* Show user from address check first if it's a complete address */}
                  {isCompleteAddress &&
                  addressCheck?.exists &&
                  addressCheck.user ? (
                    <CommandGroup heading="User Found">
                      <CommandItem
                        onSelect={() => {
                          const user: RecipientUser = {
                            _id: addressCheck.user._id,
                            name: addressCheck.user.name,
                            username: addressCheck.user.username,
                            userAddress: addressCheck.user.userAddress,
                            profileImageUrl: addressCheck.user.profileImageUrl,
                            isFriend: addressCheck.user.isFriend,
                          };
                          handleSelectUser(user);
                        }}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={addressCheck.user.profileImageUrl}
                          />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {addressCheck.user.name}
                            </span>
                            {addressCheck.user.isFriend && (
                              <Badge variant="secondary" className="text-xs">
                                Friend
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            @{addressCheck.user.username}
                          </div>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  ) : searchResults && searchResults.length > 0 ? (
                    <CommandGroup
                      heading={looksLikeAddress ? "User Found" : "Users"}
                    >
                      {searchResults.map((user) => (
                        <CommandItem
                          key={user._id}
                          onSelect={() => handleSelectUser(user)}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
                              {user.isFriend && (
                                <Badge variant="secondary" className="text-xs">
                                  Friend
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              @{user.username}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : looksLikeAddress ? (
                    <CommandEmpty className="px-3 py-6 text-center">
                      {isValidAddress(inputValue.trim()) ? (
                        addressCheck === undefined ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            <span className="text-sm text-slate-500">
                              Checking address...
                            </span>
                          </div>
                        ) : addressCheck?.exists ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-slate-900">
                              User Found
                            </div>
                            <div className="text-xs text-slate-500">
                              Select the user above
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-slate-900">
                              Send to external address
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatAddress(inputValue.trim())}
                            </div>
                            <div className="text-xs text-slate-400">
                              No Pact user found with this address
                            </div>
                            <button
                              onClick={() => {
                                // Set as raw address and close dropdown
                                onChange(inputValue.trim());
                                setIsOpen(false);
                              }}
                              className="mt-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Use this address
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="text-sm text-slate-500">
                          Enter a valid wallet address
                        </div>
                      )}
                    </CommandEmpty>
                  ) : (
                    <CommandEmpty className="px-3 py-6 text-center text-sm text-slate-500">
                      No users found
                    </CommandEmpty>
                  )}
                </>
              )}

              {/* Empty state when no input and no recent */}
              {!inputValue.trim() &&
                (!recentRecipients || recentRecipients.length === 0) && (
                  <CommandEmpty className="px-3 py-6 text-center text-sm text-slate-500">
                    Search by name, username, or paste wallet address
                  </CommandEmpty>
                )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
