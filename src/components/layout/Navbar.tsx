"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogOut,
  Network,
  Settings,
  Table2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tree", label: "Tree View", icon: Network },
  { href: "/table", label: "Table View", icon: Table2 },
  { href: "/uri", label: "URI View", icon: Globe },
  // { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196 67" className="h-8 w-auto text-foreground" aria-label="Madison Avenue Collective"><path d="M21.43 8.524h-1.396s-3.02 6.046-4.04 8.077c-1.011-2.03-4.04-8.077-4.04-8.077h-1.396l-9.46 18.907h2.236l7.915-15.833 4.73 9.457 4.753-9.457 7.915 15.833h2.236l-9.46-18.907zm-5.436 9.481L5.397 39.178h2.236c1.6-3.207 7.334-14.664 8.361-16.719 1.028 2.055 6.762 13.512 8.362 16.72h2.236L15.994 18.004zm57.074-.384h2.722l4.973 11.944 4.973-11.944h2.722v14.876h-2.212V21.574h-.086l-4.526 10.923h-1.742l-4.55-10.923h-.062v10.923h-2.212V17.621zm17.218 11.99c0-2.125 1.553-2.995 3.53-3.23l2.745-.322c1.02-.125 1.357-.321 1.357-.659v-.298c0-1.764-.918-2.235-2.463-2.235s-2.487.471-2.487 1.867v.259h-2.063v-.447c0-2.212 1.553-3.317 4.59-3.317 3.035 0 4.572 1.168 4.572 3.842v7.418h-2.016v-1.787h-.086c-.212.423-1.255 2-3.977 2-2.063 0-3.702-.918-3.702-3.106zm4.228 1.42c2.337 0 3.404-1.443 3.404-2.635v-1.208c-.15.236-.424.385-1.506.51l-2.087.274c-1.38.173-1.89.66-1.89 1.53 0 1.043.745 1.529 2.086 1.529zm7.271-4.054c0-4.015 2.463-5.74 4.934-5.74 1.64 0 3.044.744 3.695 1.952v-5.568h2.149v14.876h-2.149v-1.74c-.659 1.207-2.063 1.952-3.695 1.952-2.463 0-4.934-1.74-4.934-5.74zm5.381 3.928c1.702 0 3.358-1.23 3.358-3.928s-1.656-3.93-3.358-3.93c-1.702 0-3.334 1.232-3.334 3.93 0 2.697 1.616 3.928 3.334 3.928zm8.84-13.919c.683 0 1.279.572 1.279 1.278 0 .706-.596 1.278-1.279 1.278a1.278 1.278 0 010-2.556zm-1.059 4.462h2.149v11.049h-2.149v-11.05zm3.883 7.756h1.938c.172 1.356 1.341 1.85 2.698 1.85s2.424-.486 2.424-1.678c0-.894-.62-1.255-1.655-1.49l-2.063-.47c-2.087-.486-3.02-1.553-3.02-3.043 0-2.015 1.718-3.145 4.29-3.145 2.573 0 4.228 1.192 4.338 3.467h-1.804c-.188-1.357-1.129-1.804-2.51-1.804-1.381 0-2.236.486-2.236 1.443 0 .768.487 1.231 1.64 1.49l2.086.47c1.789.424 3.122 1.145 3.122 3.043 0 2.447-2.212 3.38-4.636 3.38-2.659 0-4.549-1.106-4.612-3.505zm10.464-2.228c0-3.952 2.636-5.74 5.381-5.74 2.746 0 5.397 1.788 5.397 5.74 0 3.953-2.635 5.74-5.397 5.74-2.761 0-5.381-1.787-5.381-5.74zm5.374 3.93c1.788 0 3.357-1.209 3.357-3.93 0-2.72-1.569-3.928-3.357-3.928-1.789 0-3.334 1.207-3.334 3.928s1.553 3.93 3.334 3.93zm12.354-7.866c-1.741 0-2.957 1.082-2.957 3.058v6.399h-2.149v-11.05h2.149v2.212h.063c.188-.831 1.255-2.423 3.718-2.423 2.165 0 3.914 1.255 3.914 4.376v6.885h-2.149v-6.399c0-1.976-.848-3.058-2.597-3.058zm16.072-5.419h2.761l5.593 14.876h-2.314l-1.255-3.419h-6.801l-1.255 3.42h-2.314l5.593-14.877zm4.166 9.78l-2.722-7.459h-.126L161.69 27.4h5.57zm2.957-5.953h2.189l3.318 9.01h.086l3.318-9.01h2.189l-4.213 11.049h-2.698l-4.189-11.05zm11.437 5.544c0-4.062 2.424-5.756 5.271-5.756s5.036 1.717 5.036 5.591c0 .385-.024.596-.063.831h-8.181c.172 2.314 1.341 3.38 3.318 3.38 1.357 0 2.4-.486 2.871-1.788h1.914c-.659 2.463-2.55 3.467-4.801 3.467-2.973 0-5.357-1.741-5.357-5.717zm8.267-.957c-.039-1.937-1.129-3.12-3.019-3.12-1.765 0-2.973 1.019-3.169 3.12zm3.247 5.278c0-.768.636-1.404 1.405-1.404.768 0 1.427.636 1.427 1.404 0 .769-.635 1.404-1.427 1.404-.793 0-1.405-.62-1.405-1.404zM72.746 45.452c0-4.933 2.745-7.63 6.824-7.63 3.083 0 5.483 1.552 5.907 4.799h-2.165c-.471-1.937-1.89-2.894-3.805-2.894-2.847 0-4.526 2.149-4.526 5.717 0 3.568 1.655 5.74 4.526 5.74 1.914 0 3.334-.956 3.805-2.91h2.165c-.424 3.271-2.824 4.824-5.93 4.824-4.064 0-6.801-2.698-6.801-7.654zm13.924 1.913c0-3.952 2.635-5.74 5.38-5.74 2.746 0 5.397 1.788 5.397 5.74 0 3.953-2.635 5.74-5.397 5.74-2.76 0-5.38-1.787-5.38-5.74zm5.38 3.93c1.789 0 3.358-1.208 3.358-3.93 0-2.72-1.569-3.928-3.358-3.928-1.788 0-3.333 1.207-3.333 3.928 0 2.722 1.553 3.93 3.334 3.93zm7.248-13.285h2.15v14.876h-2.15zm4.526 0h2.149v14.876h-2.149zm4.001 9.371c0-4.062 2.424-5.756 5.271-5.756s5.036 1.718 5.036 5.592c0 .384-.024.596-.063.83h-8.181c.172 2.314 1.341 3.38 3.318 3.38 1.357 0 2.4-.486 2.871-1.787h1.914c-.659 2.462-2.55 3.466-4.801 3.466-2.973 0-5.357-1.741-5.357-5.717zm8.267-.956c-.039-1.938-1.129-3.122-3.02-3.122-1.765 0-2.972 1.02-3.169 3.122zm3.467.956c0-3.991 2.612-5.756 5.397-5.756 1.977 0 4.424.847 4.824 4.14h-1.953c-.298-1.7-1.506-2.313-2.895-2.313-2.016 0-3.357 1.443-3.357 3.93 0 2.485 1.341 3.889 3.357 3.889 1.404 0 2.597-.636 2.895-2.36h1.953c-.361 3.332-2.847 4.187-4.824 4.187-2.785 0-5.397-1.718-5.397-5.717zm13.116 2.705v-6.548h-1.804v-1.702h1.804v-2.783h2.149v2.783h2.189v1.702h-2.189v6.187c0 1.082.361 1.576 1.553 1.576.259 0 .447 0 .785-.039v1.616a5.32 5.32 0 01-1.381.172c-1.851 0-3.106-.784-3.106-2.956zm7.288-12.711c.682 0 1.278.572 1.278 1.278 0 .706-.596 1.278-1.278 1.278a1.278 1.278 0 110-2.556zm-1.059 4.462h2.149v11.049h-2.149v-11.05zm3.671 0h2.188l3.318 9.01h.087l3.318-9.01h2.188l-4.212 11.049h-2.699l-4.188-11.05zm11.436 5.544c0-4.062 2.424-5.756 5.271-5.756 2.848 0 5.036 1.718 5.036 5.592 0 .384-.023.596-.062.83h-8.182c.173 2.314 1.342 3.38 3.318 3.38 1.357 0 2.401-.486 2.871-1.787h1.914c-.659 2.462-2.549 3.466-4.8 3.466-2.973 0-5.358-1.741-5.358-5.717zm8.268-.956c-.039-1.938-1.13-3.122-3.02-3.122-1.765 0-2.973 1.02-3.169 3.122zM64.337.188l-27.164 66.57h2.118L66.455.188zM16.033 26.945C7.193 26.945 0 34.002 0 42.683s7.193 15.739 16.033 15.739c4.597 0 8.943-1.937 11.994-5.317v-3.301c-2.534 4.085-7.099 6.618-11.994 6.618C8.3 56.422 2 50.258 2 42.683c0-7.575 6.291-13.739 14.033-13.739 4.895 0 9.46 2.533 11.994 6.619V32.26a16.12 16.12 0 00-11.994-5.316z" fill="currentColor"/></svg>
          <span className="hidden sm:inline">Migration Manager</span>
        </Link>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-secondary font-medium"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{link.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right: Admin + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Admin dropdown — only visible to admins */}
          {isAdmin(user) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Admin</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/import" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manage Users
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
              3
            </Badge>
          </Button>

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 rounded-full px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">
                  {user?.name ?? user?.email ?? ""}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
