
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import PostDetails from "./pages/PostDetails.jsx";
import Category from "./pages/Category.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ArticleManagement from "./pages/ArticleManagement.jsx";
import ArticleEditor from "./pages/ArticleEditor.jsx";
import AdminComments from "./pages/AdminComments.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/post/:slug" element={<PostDetails />} />
      <Route path="/category/:slug" element={<Category />} />
      <Route path="/login" element={<AdminLogin />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/articles" element={<ArticleManagement />} />
        <Route path="/admin/articles/new" element={<ArticleEditor />} />
        <Route path="/admin/articles/:id/edit" element={<ArticleEditor />} />
        <Route path="/admin/comments" element={<AdminComments />} /> 
      </Route>
    </Routes>
  );
}
