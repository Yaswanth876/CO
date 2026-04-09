import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function SidebarItem({ to, icon: Icon, label, collapsed = false, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "sidebar-link group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium",
          collapsed ? "justify-center" : "gap-3",
          isActive
            ? "bg-red-100 text-red-900"
            : "text-slate-700 hover:bg-red-50 hover:text-red-900"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left bar */}
          {isActive && (
            <motion.span
              layoutId="sidebar-active-bar"
              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-red-700"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}

          <motion.span
            animate={{ scale: isActive ? 1.08 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="shrink-0"
          >
            <Icon size={18} />
          </motion.span>

          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300",
              collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
