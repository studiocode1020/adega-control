import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <Image
          src="/logo.png"
          alt="Adega Control"
          width={96}
          height={96}
          className="h-24 w-24 object-contain animate-pulse"
          priority
        />
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-foreground">
            Adega Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Carregando...
          </p>
        </div>
        <div className="h-1 w-32 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-wine animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
