import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  brandName: string;
  href: string;
  className?: string;
}

export function GameCard({
  id,
  title,
  description,
  imageUrl,
  brandName,
  href,
  className,
}: GameCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md",
        className
      )}
    >
      <div className="relative h-40 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <div className="absolute bottom-3 left-3 z-20">
          <span className="inline-block rounded-full bg-primary/80 px-2 py-1 text-xs font-medium text-primary-foreground">
            {brandName}
          </span>
        </div>
        <Image
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          width={400}
          height={300}
        />
      </div>
      <div className="p-3">
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
