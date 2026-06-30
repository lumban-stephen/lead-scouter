import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-col flex-1 w-full overflow-hidden bg-muted/20">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search local businesses..."
                  className="w-full sm:w-[400px] bg-background border rounded-md h-9 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
