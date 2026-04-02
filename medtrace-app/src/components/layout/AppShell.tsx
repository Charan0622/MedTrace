"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { AiTaskNotifier } from "@/components/ui/AiTaskNotifier";

const NO_SIDEBAR_PATHS = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  return (
    <AuthGuard>
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "ml-[260px] min-h-screen p-8 gradient-mesh" : "min-h-screen"}>
        {children}
      </main>
      {showSidebar && <AiTaskNotifier />}
    </AuthGuard>
  );
}
