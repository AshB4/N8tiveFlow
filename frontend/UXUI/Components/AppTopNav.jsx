import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/InteralAssets/PostPunkTransparentLogo.png";

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
    to: "/archive",
    label: "Posted Archive",
    baseClass:
      "border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-black",
    activeClass: "border-cyan-400 bg-cyan-500 text-black",
  },
  {
    to: "/batch",
    label: "Batch Forge",
    baseClass:
      "border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-500 hover:text-black",
    activeClass: "border-fuchsia-400 bg-fuchsia-500 text-black",
  },
  {
    to: "/affiliate",
    label: "Affiliate Engine",
    baseClass:
      "border-orange-400 text-orange-200 hover:bg-orange-400 hover:text-black",
    activeClass: "border-orange-300 bg-orange-400 text-black",
  },
  {
    to: "/charts",
    label: "View Charts",
    baseClass:
      "border-violet-500 text-violet-300 hover:bg-violet-500 hover:text-black",
    activeClass: "border-violet-400 bg-violet-500 text-black",
  },
  {
    to: "/archive",
    label: "Posted Archive",
    baseClass:
      "border-orange-500 text-orange-300 hover:bg-orange-500 hover:text-black",
    activeClass: "border-orange-400 bg-orange-500 text-black",
  },
  {
    to: "/setup",
    label: "Tune Rotation",
    baseClass:
      "border-lime-500 text-lime-300 hover:bg-lime-500 hover:text-black",
    activeClass: "border-lime-400 bg-lime-500 text-black",
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
    <div className="relative left-1/2 right-1/2 mb-6 w-screen -translate-x-1/2 border-b border-pink-500 bg-black/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="shrink-0">
          <img
            src={logo}
            alt="PostPunk Home"
            className="h-14 md:h-16 w-auto shrink-0 drop-shadow-[0_0_12px_#ff00ff]"
          />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pr-2">
          {items.map((item) => {
            const active = isActive(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded border px-3 py-1.5 text-sm transition-colors ${
                  active ? item.activeClass : item.baseClass
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
