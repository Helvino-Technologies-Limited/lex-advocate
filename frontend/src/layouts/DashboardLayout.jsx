import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import MobileMoreDrawer from '../components/layout/MobileMoreDrawer'
import SubscriptionBanner from '../components/layout/SubscriptionBanner'
import { subscriptionApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)
  const { user } = useAuthStore()

  const { data: subData } = useQuery({
    queryKey: ['subscription-status-banner'],
    queryFn: () => subscriptionApi.getStatus().then(r => r.data.data),
    enabled: !!user && user.role !== 'super_admin',
    refetchInterval: 5 * 60 * 1000,
    retry: false
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar
          isOpen={true}
          isCollapsed={sidebarCollapsed}
          onClose={() => {}}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SubscriptionBanner subscriptionData={subData} />
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav onMoreClick={() => setMoreDrawerOpen(true)} />
      <MobileMoreDrawer isOpen={moreDrawerOpen} onClose={() => setMoreDrawerOpen(false)} />
    </div>
  )
}
