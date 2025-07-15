import React, { useEffect, useState, useContext } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import UserFormModal from "../components/UserFormModal";

export default function Users() {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    uid: "",
    profileImage: "",
    isVerified: false,
    isSubscriber: false,
  });
  const [searchText, setSearchText] = useState("");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const q = query(collection(db, "users"), orderBy("email"), limit(pageSize));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers(list);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === pageSize);
  };

  const loadMore = async () => {
    if (!lastDoc) return;
    const q = query(
      collection(db, "users"),
      orderBy("email"),
      startAfter(lastDoc),
      limit(pageSize)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers((prev) => [...prev, ...list]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === pageSize);
  };

  const addUser = async () => {
    if (!form.email || !form.uid) return toast.error("Email and UID required");
    try {
      await addDoc(collection(db, "users"), form);
      toast.success("User added");
      setForm({
        name: "",
        email: "",
        uid: "",
        profileImage: "",
        isVerified: false,
        isSubscriber: false,
      });
      fetchUsers();
    } catch (err) {
      toast.error("Error adding user");
    }
  };

  const updateUser = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), form);
      toast.success("User updated");
      fetchUsers();
    } catch (err) {
      toast.error("Error updating user");
    }
  };

  const deleteUser = async (id) => {
    try {
      await deleteDoc(doc(db, "users", id));
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error("Error deleting user");
    }
  };

  const openAddUserModal = () => {
    setForm({
      name: "",
      email: "",
      uid: "",
      profileImage: "",
      isVerified: false,
      isSubscriber: false,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditUserModal = (user) => {
    setForm(user);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (isEditing) {
      await updateUser(form.id);
    } else {
      await addUser();
    }
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">User Manager</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full p-2 mb-2 border rounded text-black"
        />
      </div>

      {isAdmin && (
        <div className="mb-6">
          <button
            onClick={openAddUserModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Add User
          </button>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">User List</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-900 bg-white rounded shadow">
          <thead>
            <tr>
              <th className="p-2 border-b">#</th>
              <th className="p-2 border-b">Name</th>
              <th className="p-2 border-b">Email</th>
              <th className="p-2 border-b">UID</th>
              <th className="p-2 border-b">Verified</th>
              <th className="p-2 border-b">Subscriber</th>
              {isAdmin && <th className="p-2 border-b">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, i) => (
              <tr key={user.id} className="bg-white hover:bg-gray-100">
                <td className="p-2 border-b text-gray-800">{i + 1}</td>
                <td className="p-2 border-b text-gray-800">{user.name}</td>
                <td className="p-2 border-b text-gray-800">{user.email}</td>
                <td className="p-2 border-b text-gray-800">{user.uid}</td>
                <td className="p-2 border-b text-gray-800">
                  {user.isVerified ? "✅" : "❌"}
                </td>
                <td className="p-2 border-b text-gray-800">
                  {user.isSubscriber ? "👑" : "—"}
                </td>
                {isAdmin && (
                  <td className="p-2 border-b space-x-2">
                    <button
                      onClick={() => openEditUserModal(user)}
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Load More
          </button>
        </div>
      )}

      {/* Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleModalSubmit}
        isEdit={isEditing}
      />
    </div>
  );
}
