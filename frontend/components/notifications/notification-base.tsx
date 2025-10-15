'use client'

import { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface NotificationBaseProps {
  avatar?: string | null
  fallbackIcon: ReactNode
  title: string
  description: string
  timestamp: number
  isRead: boolean
  actions?: ReactNode
  onClick?: () => void
}

const formatTimestamp = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

export default function NotificationBase({
  avatar,
  fallbackIcon,
  title,
  description,
  timestamp,
  isRead,
  actions,
  onClick,
}: NotificationBaseProps) {
  return (
    <div
      onClick={onClick}
      className={`px-6 py-4 cursor-pointer transition-colors ${
        isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white">
            {avatar ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={avatar} />
                <AvatarFallback>{fallbackIcon}</AvatarFallback>
              </Avatar>
            ) : (
              fallbackIcon
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-1">{description}</p>
          {!isRead && (
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              New
            </div>
          )}
          {actions && <div className="mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  )
}