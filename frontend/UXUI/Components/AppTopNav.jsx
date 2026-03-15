import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/compose", label: "Compose" },
  { to: "/lib", label: "Library" },
  { to: "/today", label: "Today" },
  { to: "/charts", label: "Charts" },
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppTopNav() {
  const location = useLocation();

  return (
    <nav className="mb-6 border border-pink-900/70 bg-black/70 rounded-lg shadow-[0_0_18px_rgba(255,0,255,0.12)]">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Link
          to="/"
          className="mr-3 text-sm font-semibold uppercase tracking-[0.35em] text-pink-400"
        >
          PostPunk
        </Link>
        {navItems.map((item) => {
          const active = isActive(location.pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-pink-500 bg-pink-500 text-black"
                  : "border-teal-700 text-teal-200 hover:border-pink-500 hover:text-pink-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
