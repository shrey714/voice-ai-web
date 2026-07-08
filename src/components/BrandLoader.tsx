import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

/** Branded full-screen loading state — pulsing logo with a spinning ring. */
export function BrandLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background/20 flex items-center justify-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-16 flex items-center justify-center">

          {/* Animated spinning border */}
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />

          {/* start */}
          <div
            className={
              "group relative shrink-0 bg-transparent outline-none border-none perspective-[24em] [-webkit-tap-highlight-color:transparent]"
            }
            style={{ width: 48, height: 48, fontSize: 48 / 4.5 }}
          >
            <span className="absolute inset-0 rounded-full overflow-hidden transform-3d">
              <span
                className="absolute inset-0 rounded-full block transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-bottom-right will-change-transform"
                style={{
                  background: "linear-gradient(var(--primary), var(--chart-2))",
                }}
              />
              <span className="absolute inset-0 rounded-full bg-white/15 flex backdrop-blur-[0.75em] transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] will-change-transform group-hover:transform-[translate3d(0,0,2em)]">
                <span className="m-auto flex items-center justify-center text-white">
                  <Store size={22} />
                </span>
              </span>
            </span>
          </div>
          {/* end */}
          
        </div>
        <div className="text-center">
          <p className="font-black text-foreground tracking-tight">ShopNear</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}