// test drawer component instead of dialog 

'use client'

import { useState } from 'react'
import { Send, QrCode, FileText, Split } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const actions = [
  {
    id: 'send',
    label: 'Send',
    icon: Send,
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'receive',
    label: 'Receive',
    icon: QrCode,
    color: 'from-green-400 to-green-600',
  },
  {
    id: 'request',
    label: 'Request',
    icon: FileText,
    color: 'from-purple-400 to-purple-600',
  },
  {
    id: 'split',
    label: 'Split',
    icon: Split,
    color: 'from-orange-400 to-orange-600',
  },
]

export default function QuickActions() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  const handleActionClick = (actionId: string) => {
    setActiveDialog(actionId)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-slate-700">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={activeDialog === 'send'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment</DialogTitle>
            <DialogDescription>
              Send money to friends or contacts
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-slate-500">
            {/* TODO: Implement send payment form */}
            Send payment functionality coming soon
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={activeDialog === 'receive'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Share your QR code or wallet address
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-slate-500">
            {/* TODO: Implement QR code display */}
            Receive payment functionality coming soon
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={activeDialog === 'request'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment</DialogTitle>
            <DialogDescription>
              Request money from friends or contacts
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-slate-500">
            {/* TODO: Implement payment request form */}
            Request payment functionality coming soon
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={activeDialog === 'split'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Bill</DialogTitle>
            <DialogDescription>
              Split expenses with friends or groups
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-slate-500">
            {/* TODO: Implement bill splitting form */}
            Bill splitting functionality coming soon
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}