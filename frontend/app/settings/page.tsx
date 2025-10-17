'use client'

import { useState } from 'react'
import { User, Shield, Bell, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import AccountSettings from '@/components/settings/AccountSettings'
import PrivacySettings from '@/components/settings/PrivacySettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import AboutSettings from '@/components/settings/AboutSettings'

type SettingsSection = 'account' | 'privacy' | 'notifications' | 'about'

const sections = [
  {
    id: 'account' as SettingsSection,
    label: 'Account',
    icon: User,
  },
  {
    id: 'privacy' as SettingsSection,
    label: 'Privacy & Security',
    icon: Shield,
  },
  {
    id: 'notifications' as SettingsSection,
    label: 'Notifications',
    icon: Bell,
  },
  {
    id: 'about' as SettingsSection,
    label: 'About',
    icon: Info,
  },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />
      case 'privacy':
        return <PrivacySettings />
      case 'notifications':
        return <NotificationSettings />
      case 'about':
        return <AboutSettings />
      default:
        return <AccountSettings />
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-28 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-slate-200 shadow-sm p-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                      activeSection === section.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}s