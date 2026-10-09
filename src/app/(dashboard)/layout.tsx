import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DataGate } from "@/components/layout/data-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataGate>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 pt-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </DataGate>
  );
}
