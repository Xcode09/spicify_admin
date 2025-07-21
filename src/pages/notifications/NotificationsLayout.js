// src/pages/notifications/NotificationsLayout.js
import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function NotificationsLayout() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📢 Notifications Center</h1>
      <nav className="mb-6 flex gap-4">
        <NavLink
          to=""
          end
          className={({ isActive }) =>
            isActive ? "font-semibold text-blue-600 underline" : "text-gray-600"
          }
        >
          All Notifications
        </NavLink>
        <NavLink
          to="create"
          className={({ isActive }) =>
            isActive ? "font-semibold text-blue-600 underline" : "text-gray-600"
          }
        >
          Create
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
