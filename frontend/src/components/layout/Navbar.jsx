import { Menu, User, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function Navbar({ user, onLogout, onMenuClick, onOpenProfile, onOpenSettings }) {
  return (
    <motion.header
      className="navbar-blur fixed inset-x-0 top-0 z-40 border-b border-red-100/80"
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-24 flex-col justify-center px-4 md:h-20 md:flex-row md:items-center md:justify-between md:px-8">
        {/* Mobile: centered banner */}
        <div className="mb-1 flex justify-center md:hidden">
          <img src="/tce-banner.png" alt="TCE Logo" className="h-8 w-auto" />
        </div>

        <div className="flex w-full items-center justify-between md:gap-6">
          {/* Left: menu + logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={onMenuClick}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </Button>

            <img
              src="/tce-banner.png"
              alt="TCE Logo"
              className="hidden h-12 w-auto md:block"
            />

            <motion.h1
              className="text-base font-semibold text-red-700 md:text-xl"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              TCE COAS
            </motion.h1>
          </div>

          {/* Right: user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 md:py-2.5 md:text-base"
                whileTap={{ scale: 0.97 }}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-100 text-red-800">
                  <User size={15} />
                </span>
                <span className="hidden sm:inline">{user?.role || "Staff"}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </motion.button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44 shadow-lg">
              <DropdownMenuItem onSelect={onOpenProfile}>Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenSettings}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onSelect={onLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}