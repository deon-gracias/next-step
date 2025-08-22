"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Minimal styles; tweak to match your design system
const baseOverlay =
  "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0";
const baseContent =
  "fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow focus:outline-none";
const headerCls = "mb-2";
const titleCls = "text-base font-semibold leading-6";
const descCls = "mt-1 text-sm text-muted-foreground";
const footerCls = "mt-4 flex items-center justify-end gap-2";

type AlertDialogRootContext = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const DialogCtx = React.createContext<AlertDialogRootContext | null>(null);

export function AlertDialog(props: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DialogCtx.Provider value={{ open, setOpen }}>{props.children}</DialogCtx.Provider>
  );
}

export function AlertDialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DialogCtx);
  if (!ctx) return <>{children}</>;
  const triggerProps = {
    onClick: () => ctx.setOpen(true),
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      ...(children as any).props,
      ...triggerProps,
    });
  }
  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DialogCtx);
  const [mounted, setMounted] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx?.setOpen(false);
    };
    if (ctx?.open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [ctx]);

  // Close on overlay click
  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) ctx?.setOpen(false);
  };

  if (!ctx || !mounted || !ctx.open) return null;

  return createPortal(
    <>
      <div
        ref={overlayRef}
        data-state={ctx.open ? "open" : "closed"}
        className={baseOverlay}
        onMouseDown={onOverlayClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-state={ctx.open ? "open" : "closed"}
        className={cn(baseContent, className)}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(headerCls, className)}>{children}</div>;
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={titleCls}>{children}</h3>;
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(descCls, className)}>{children}</p>;
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(footerCls, className)}>{children}</div>;
}

export function AlertDialogCancel(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const ctx = React.useContext(DialogCtx);
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        ctx?.setOpen(false);
      }}
    />
  );
}

export function AlertDialogAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const ctx = React.useContext(DialogCtx);
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        // Do not auto-close here; caller decides. If you want auto-close, uncomment next line.
        // ctx?.setOpen(false);
      }}
    />
  );
}
