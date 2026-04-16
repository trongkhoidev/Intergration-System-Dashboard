"use client";

import { cn } from "@/lib/utils";
import { Bell, Search, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

interface Breadcrumb {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [{ label: "Home", href: "/dashboard" }];

  let currentPath = "";
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    if (path !== "dashboard") {
      breadcrumbs.push({
        label: path.charAt(0).toUpperCase() + path.slice(1),
        href: index < paths.length - 1 ? currentPath : undefined,
      });
    }
  });

  return breadcrumbs;
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {index === 0 && <Home className="h-4 w-4" />}
                  {index > 0 && crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden md:block">
            <Input
              type="search"
              placeholder="Search..."
              className="pl-10 h-9 bg-secondary border-transparent"
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
        </div>
      </div>
    </header>
  );
}
