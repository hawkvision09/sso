"use client";

import { useEffect, useRef, useState } from "react";
import { MdKeyboardArrowRight } from "react-icons/md";

interface AppsDrawerItem {
  id: string;
  name: string;
  href: string;
}

interface AppsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppsDrawerItem[];
  adminServicesHref: string;
  adminUsersHref: string;
  isAdmin?: boolean;
}

export default function AppsDrawer({
  isOpen,
  onClose,
  apps,
  adminServicesHref,
  adminUsersHref,
  isAdmin = false,
}: AppsDrawerProps) {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const adminTriggerRef = useRef<HTMLButtonElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsAdminMenuOpen(false);
    onClose();
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isAdminMenuOpen) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedInsideDrawer = drawerRef.current?.contains(target) ?? false;
      const clickedInsideTrigger = adminTriggerRef.current?.contains(target) ?? false;
      const clickedInsideAdminMenu = adminMenuRef.current?.contains(target) ?? false;

      if (clickedInsideDrawer && !clickedInsideTrigger && !clickedInsideAdminMenu) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isAdminMenuOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-[48px] z-40">
      <button
        type="button"
        aria-label="Close apps navigation"
        onClick={handleClose}
        className="absolute inset-0 bg-[var(--theme-background)]/60 backdrop-blur-[1px]"
      />

      <aside
        ref={drawerRef}
        className="absolute left-0 top-0 flex h-full w-[18rem] flex-col border-r border-[var(--theme-border)] bg-[var(--theme-surface)] px-8 py-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--theme-text)]">All Apps</h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {apps.length > 0 ? (
              apps.map((app) => (
                <a
                  key={app.id}
                  href={app.href}
                  className="block rounded-xl py-3 text-sm text-[var(--theme-text)] transition-all hover:bg-[var(--theme-surface-soft)]"
                  onClick={onClose}
                >
                  {app.name}
                </a>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-6 text-center text-sm text-[var(--theme-muted)]">
                No apps available yet
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="relative mt-5 border-t border-[var(--theme-border)] pt-4">
            <button
              ref={adminTriggerRef}
              type="button"
              onClick={() => setIsAdminMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] transition-all hover:bg-[var(--theme-surface-soft)]"
              aria-expanded={isAdminMenuOpen}
              aria-haspopup="menu"
            >
              <span>Admin</span>
              <span className="text-[var(--theme-muted)]">
                <MdKeyboardArrowRight size={16} />
              </span>
            </button>

            {isAdminMenuOpen && (
              <div
                ref={adminMenuRef}
                className="absolute left-full bottom-0 z-50 ml-3 w-64 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-[var(--theme-shadow)]"
              >
                <div className="space-y-2">
                  <a
                    href={adminServicesHref}
                    className="block rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] transition-all hover:bg-[var(--theme-surface-soft)]"
                    onClick={handleClose}
                  >
                    Services
                  </a>
                  <a
                    href={adminUsersHref}
                    className="block rounded-xl px-4 py-3 text-sm text-[var(--theme-text)] transition-all hover:bg-[var(--theme-surface-soft)]"
                    onClick={handleClose}
                  >
                    Users
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
