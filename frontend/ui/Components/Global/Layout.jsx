// 💠 Layout.jsx
import { Sidebar } from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}