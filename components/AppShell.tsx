import Link from "next/link";
import { Activity, Database, HardDrive } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/82 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-[#f0efea]">
              <HardDrive className="h-5 w-5 text-accent" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-normal text-ink">SSD Price Board</span>
              <span className="text-sm text-muted">台灣電腦零組件價格追蹤</span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-medium text-muted">
            <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-[#f0efea] hover:text-ink" href="/">
              <Database className="h-4 w-4" />
              今日價格
            </Link>
            <Link className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-[#f0efea] hover:text-ink" href="/admin/scrape-logs">
              <Activity className="h-4 w-4" />
              爬蟲狀態
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
