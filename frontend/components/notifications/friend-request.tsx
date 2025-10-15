'use client'

import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { useAppKitAccount } from '@reown/appkit/react'
import NotificationBase from './notification-base'

interface FriendRequestNotificationProps {
  notificationId: Id<'notifications'>
  friendshipId: Id<'friendships'>
  fromUser: {
    _id: Id<'users'>
    name: string
    username: string
    profileImageUrl?: string
  }
  timestamp: number
  isRead: boolean
  onMarkRead: (id: Id<'notifications'>) => void
}

export function FriendRequestNotification({
  notificationId,
  friendshipId,
  fromUser,
  timestamp,
  isRead,
  onMarkRead,
}: FriendRequestNotificationProps) {
  const acceptRequest = useMutation(api.friendships.acceptFriendRequest)
  const declineRequest = useMutation(api.friendships.declineFriendRequest)
  
  // Get current user ID
  const { address } = useAppKitAccount()
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : 'skip'
  )

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return
    try {
      await acceptRequest({ userId: currentUser._id, friendshipId })
      toast.success(`You are now friends with ${fromUser.name}`)
      onMarkRead(notificationId)
    } catch (error) {
      toast.error('Failed to accept friend request')
    }
  }

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser) return
    try {
      await declineRequest({ userId: currentUser._id, friendshipId })
      toast.success('Friend request declined')
      onMarkRead(notificationId)
    } catch (error) {
      toast.error('Failed to decline friend request')
    }
  }

  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<UserPlus className="w-5 h-5" />}
      title="New friend request"
      description={`${fromUser.name} wants to connect with you`}
      timestamp={timestamp}
      isRead={isRead}
      onClick={() => !isRead && onMarkRead(notificationId)}
      actions={
        !isRead && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAccept} className="flex-1">
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        )
      }
    />
  )
}