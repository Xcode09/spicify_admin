import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext"; // 👈 NEW

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import DashboardHome from "./pages/DashboardHome";
import Audiobooks from "./pages/Audiobooks";
import Chapters from "./pages/Chapters";
import Addbooks from "./pages/newbookadd";
import Users from "./pages/Users";
import CategoriesManager from "./pages/categories"; // Updated import
import SubscriberClubManager from "./pages/SubscriberClub";
import Notifications from "./pages/Notifications";
import ProfilePage from "./pages/ProfilePage"; // Updated import
import EditBook from "./pages/editbook"; // ✅ NEW IMPORT

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="categories" element={<CategoriesManager />} />
            <Route path="audiobooks" element={<Audiobooks />} />
            <Route path="audiobooks/new" element={<Addbooks />} />
            <Route path="audiobooks/edit/:id" element={<EditBook />} /> {/* ✅ NEW ROUTE */}
            <Route path="chapters" element={<Chapters />} />
            <Route path="users" element={<Users />} />
            <Route path="subscriber-club" element={<SubscriberClubManager />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
        <ToastContainer position="bottom-center" theme="dark" />
      </Router>
    </AuthProvider>
  );
}
