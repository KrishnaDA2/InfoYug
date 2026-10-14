import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArticleOutlined,
  Add,
  AutoStoriesOutlined,
  CategoryOutlined,
  DashboardOutlined,
  Logout,
  Refresh,
  OpenInNew,
} from "@mui/icons-material";
import api from "../services/api";
import { clearAdminSession, getAdminUser, restoreAdminSession } from "../Auth/AdminAuth";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getAdminUser();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!restoreAdminSession()) {
        clearAdminSession();
        navigate("/login", { replace: true });
        return;
      }
      const [postsResult, categoriesResult] = await Promise.allSettled([
      api.get("/posts/admin", {
  params: { page: 1, pageSize: 100 },
}),
        api.get("/categories"),
      ]);
      if (postsResult.status === "fulfilled") {
        setPosts(normalizeList(postsResult.value.data, ["items", "posts"]));
      } else {
        const status = postsResult.reason?.response?.status;
        if (status === 401 || status === 403) {
          clearAdminSession();
          navigate("/login", { replace: true });
          return;
        }
        setError("Articles load nahi hue. API endpoint aur backend connection check karein.");
      }
      if (categoriesResult.status === "fulfilled") {
        setCategories(normalizeList(categoriesResult.value.data, ["items", "categories"]));
      }
    } catch {
      setError("Dashboard load nahi hua. Backend/API connection check karein.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const logout = () => {
    clearAdminSession();
    navigate("/login", { replace: true });
  };

  const published = posts.filter((post) => {
    const status = String(post.status || "").toLowerCase();
    return post.isPublished === true || post.published === true || status === "published" || Boolean(post.publishedAt);
  }).length;
  const drafts = Math.max(posts.length - published, 0);
  const displayPosts = [...posts].sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0)).slice(0, 8);

  const stats = [
    { label: "Total articles", value: posts.length, icon: <ArticleOutlined />, note: "All articles returned by API" },
    { label: "Published", value: published, icon: <AutoStoriesOutlined />, note: "Based on available status fields" },
    { label: "Draft / other", value: drafts, icon: <DashboardOutlined />, note: "Not detected as published" },
    { label: "Categories", value: categories.length, icon: <CategoryOutlined />, note: "Content categories" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7f5", color: "#142e32" }}>
      <Box component="header" sx={{ bgcolor: "#102a30", color: "#fff" }}>
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 2, flexWrap: "wrap" }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: "#83e0b0", color: "#102a30", display: "grid", placeItems: "center" }}><DashboardOutlined /></Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 20 }}>InfoYug Admin</Typography>
                <Typography variant="caption" sx={{ color: "#a9c1c3" }}>Content management</Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Button component={Link} to="/" target="_blank" endIcon={<OpenInNew />} sx={{ color: "#d3e0df", textTransform: "none" }}>View website</Button>
              <Tooltip title="Sign out"><IconButton onClick={logout} sx={{ color: "#a7edc5", border: "1px solid #42635f" }}><Logout /></IconButton></Tooltip>
            </Stack>
          </Stack>
        </Container>

      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>Dashboard overview</Typography>
            <Typography sx={{ color: "#657a79", mt: 0.75 }}>Welcome back, {user?.name || "Admin"}. Here's your content at a glance.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadDashboard} disabled={loading} sx={{ textTransform: "none", borderRadius: 2, borderColor: "#b9ccc3", color: "#315d52" }}>Refresh</Button>
            <Button component={Link} to="/admin/articles/new" variant="contained" startIcon={<Add />} sx={{ bgcolor: "#153d3d", borderRadius: 2, textTransform: "none", fontWeight: 800, "&:hover": { bgcolor: "#216b58" } }}>New article</Button>
          </Stack>
        </Stack>

        {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 4 }}>
          {stats.map((stat) => (
            <Card key={stat.label} elevation={0} sx={{ border: "1px solid #e0e9e4", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ color: "#647a7b", fontWeight: 700, fontSize: 14 }}>{stat.label}</Typography>
                  <Avatar variant="rounded" sx={{ bgcolor: "#e1f5e9", color: "#17684e", width: 42, height: 42 }}>{stat.icon}</Avatar>
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 900, mt: 1.5 }}>{loading ? "—" : stat.value}</Typography>
                <Typography variant="caption" sx={{ color: "#7a8c88" }}>{stat.note}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper elevation={0} sx={{ border: "1px solid #e0e9e4", borderRadius: 3, overflow: "hidden" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1} sx={{ p: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>Recent articles</Typography>
              <Typography variant="body2" sx={{ color: "#718482" }}>Latest articles available from your API.</Typography>
            </Box>
            <Chip label={`${posts.length} total`} sx={{ bgcolor: "#e1f5e9", color: "#17684e", fontWeight: 800 }} />
          </Stack>
          <Divider />
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 7 }}><CircularProgress sx={{ color: "#216b58" }} /></Box>
          ) : displayPosts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 7, px: 3 }}>
              <ArticleOutlined sx={{ fontSize: 42, color: "#91a6a0" }} />
              <Typography sx={{ mt: 1, fontWeight: 800 }}>No articles found</Typography>
              <Typography variant="body2" sx={{ color: "#718482", mt: 0.5 }}>When your API returns articles, they will appear here.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead><TableRow sx={{ bgcolor: "#f8faf8" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Article</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Public link</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {displayPosts.map((post, index) => {
                    const isPublished = post.isPublished === true || post.published === true || String(post.status || "").toLowerCase() === "published" || Boolean(post.publishedAt);
                    return <TableRow key={post.id ?? post.slug ?? index} hover>
                      <TableCell sx={{ maxWidth: 380 }}>
                        <Typography sx={{ fontWeight: 750 }}>{post.title || "Untitled article"}</Typography>
                        <Typography variant="caption" sx={{ color: "#718482" }}>{post.authorName || post.author?.name || "InfoYug Editorial"}</Typography>
                      </TableCell>
                      <TableCell>{post.categoryName || post.category?.name || "—"}</TableCell>
                      <TableCell><Chip size="small" label={isPublished ? "Published" : "Draft / unknown"} color={isPublished ? "success" : "default"} variant={isPublished ? "filled" : "outlined"} /></TableCell>
                      <TableCell>{formatDate(post.publishedAt || post.createdAt)}</TableCell>
                      <TableCell align="right">
                        {post.slug ? <Button component={Link} to={`/post/${encodeURIComponent(post.slug)}`} target="_blank" size="small" endIcon={<OpenInNew />} sx={{ textTransform: "none", color: "#216b58" }}>View</Button> : "—"}
                      </TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#7a8c88" }}>
          Note: “New article” currently points to /admin/articles/new; article editor routes can be added next.
        </Typography>
      </Container>
    </Box>
  );
}
