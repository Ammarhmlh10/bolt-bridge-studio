import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

/** Bottom sheet used across the app (phone-style), with a title row and a scrollable body. */
export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} dismissible={dismissible} repositionInputs={false}>
      <DrawerContent dir="rtl" className="mx-auto max-h-[92dvh] max-w-xl rounded-t-[28px] bg-card">
        <div className="flex items-center justify-between gap-3 px-5 pt-3">
          <DrawerTitle className="text-lg font-bold text-foreground">{title}</DrawerTitle>
          <DrawerClose
            aria-label="إغلاق"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </DrawerClose>
        </div>
        {description ? (
          <DrawerDescription className="px-5 text-sm text-muted-foreground">{description}</DrawerDescription>
        ) : (
          <DrawerDescription className="sr-only">{title}</DrawerDescription>
        )}
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
