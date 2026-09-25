import Image from "next/image";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <Image
        src="/logo.png"
        alt="Carregando..."
        width={48}
        height={48}
        className="h-12 w-12 object-contain animate-pulse"
        priority
      />
      <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
    </div>
  );
}
