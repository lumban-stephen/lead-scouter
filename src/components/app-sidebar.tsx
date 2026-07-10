'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LayoutDashboard, Bookmark, Target, MapPin } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLeads } from '@/hooks/use-leads'

const items = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Discover',
    url: '/discover',
    icon: MapPin,
  },
  {
    title: 'Saved Leads',
    url: '/leads',
    icon: Bookmark,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { leads } = useLeads()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-semibold text-lg text-primary">
          <Target className="h-6 w-6" />
          <span>Lead Scouter</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.title} render={<Link href={item.url} />}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.url === '/leads' && leads.length > 0 && (
                        <span className="ml-auto text-xs rounded-full bg-primary/10 text-primary px-1.5 py-0.5">
                          {leads.length}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Lead Scouter
      </SidebarFooter>
    </Sidebar>
  )
}
