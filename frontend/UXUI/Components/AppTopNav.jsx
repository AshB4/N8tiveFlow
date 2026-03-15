import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/PostPunkTransparentLogo.png";

const navItems = [
  {
    to: "/today",
    label: "Today Ops",
    baseClass:
      "border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-black",
    activeClass: "border-amber-400 bg-amber-500 text-black",
  },
  {
    to: "/compose",
    label: "Summon Composer",
    baseClass:
      "border-pink-500 text-pink-300 hover:bg-pink-500 hover:text-black",
    activeClass: "border-pink-400 bg-pink-500 text-black",
  },
  {
    to: "/lib",
    label: "Open Library Vault",
    baseClass:
      "border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-black",
    activeClass: "border-cyan-400 bg-cyan-500 text-black",
  },
  {
    to: "/charts",
    label: "View Charts",
    baseClass:
      "border-violet-500 text-violet-300 hover:bg-violet-500 hover:text-black",
    activeClass: "border-violet-400 bg-violet-500 text-black",
  },
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppTopNav({ includeLab = false }) {
  const location = useLocation();
  const items = includeLab
    ? [
        ...navItems,
        {
          to: "/lab",
          label: "Open Scribble Sanctum",
          baseClass:
            "border-teal-400 text-teal-300 hover:bg-teal-400 hover:text-black",
          activeClass: "border-teal-300 bg-teal-400 text-black",
        },
      ]
    : navItems;

  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-pink-500 pb-4">
      <Link to="/" className="shrink-0">
        <img
          src={logo}
          alt="PostPunk Home"
          className="h-24 md:h-28 w-auto drop-shadow-[0_0_12px_#ff00ff]"
        />
      </Link>
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => {
          const active = isActive(location.pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-4 py-2 border rounded transition-colors ${
                active ? item.activeClass : item.baseClass
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
