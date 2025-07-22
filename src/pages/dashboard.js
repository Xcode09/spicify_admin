import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiBook,
  FiUsers,
  FiBell,
  FiStar,
  FiUser,
  FiLogOut,
  FiAlertTriangle
} from "react-icons/fi";
import { getAuth, signOut } from "firebase/auth";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const auth = getAuth();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FiHome /> },
    { name: "Genres", path: "/dashboard/categories", icon: <FiBook /> },
    { name: "Audiobooks", path: "/dashboard/audiobooks", icon: <FiBook /> },
    { name: "Chapters", path: "/dashboard/chapters", icon: <FiBook /> },
    { name: "Users", path: "/dashboard/users", icon: <FiUsers /> },
    { name: "Subscriber Club", path: "/dashboard/subscriber-club", icon: <FiStar /> },
    { name: "Notifications", path: "/dashboard/notifications", icon: <FiBell /> },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to login after logout
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-30 w-64 h-full bg-gray-900 text-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? "left-0" : "-left-64"
        } md:left-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-red-500">Spicify Admin</h1>
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={24} />
          </button>
        </div>

        <nav className="p-4 flex flex-col justify-between h-[calc(100%-64px)]">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center p-3 rounded-lg transition ${
                    location.pathname === item.path
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Profile & Logout Section */}
          <ul className="space-y-2 pt-6 border-t border-gray-700 mt-auto">
            <li>
              <Link
                to="/dashboard/profile"
                className={`flex items-center p-3 rounded-lg transition ${
                  location.pathname === "/dashboard/profile"
                    ? "bg-red-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <FiUser className="mr-3" />
                <span>Profile</span>
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/errors"
                className={`flex items-center p-3 rounded-lg transition ${
                  location.pathname === "/dashboard/errors"
                    ? "bg-red-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <FiAlertTriangle className="mr-3" />
                <span>Log errors</span>
              </Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition"
              >
                <FiLogOut className="mr-3" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <button
              className="md:hidden text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu size={24} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
