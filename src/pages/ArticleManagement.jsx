
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Container, IconButton,
  InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import {
  Add, ArrowBack, Delete, EditOutlined, OpenInNew, Refresh,
  Search, VisibilityOutlined, Publish, Unpublished
} from "@mui/icons-material";
import api from "../services/api";
import { clearAdminSession, restoreAdminSession } from "../Auth/AdminAuth";

const listFrom = (data) => Array.isArray(data) ? data : data?.items ?? data?.posts ?? [];
const published = (post) => post.isPublished === true || post.published === true || String(post.status || "").toLowerCase() === "published";

export default function ArticleManagement() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (!restoreAdminSession()) {
        clearAdminSession();
        navigate("/login", { replace: true });
        return;
      }
      const response = await api.get("/posts/admin", { params: { page: 1, pageSize: 100 } });
      setPosts(listFrom(response.data));
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        clearAdminSession();
        navigate("/login", { replace: true });
        return;
      }
      setError(e?.response?.data?.message || "Articles load nahi hue. /posts/admin endpoint aur API connection check karein.");
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filteredPosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = `${post.title || ""} ${post.slug || ""} ${post.categoryName || post.category?.name || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || (status === "published" ? published(post) : !published(post));
    return matchesSearch && matchesStatus;
  }), [posts, search, status]);

  const changeStatus = async (post) => {
    setBusyId(post.id); setError(""); setNotice("");
    try {
      if (published(post)) {
        await api.patch(`/posts/${post.id}/draft`);
        setNotice("Article draft mein move ho gaya.");
      } else {
        await api.patch(`/posts/${post.id}/publish`);
        setNotice("Article publish ho gaya.");
      }
      await loadPosts();
    } catch (e) {
      setError(e?.response?.data?.message || "Status update nahi hua. Permissions aur API response check karein.");
    } finally { setBusyId(null); }
  };

  const deletePost = async (post) => {
    if (!window.confirm(`"${post.title || "Untitled article"}" permanently delete karna hai?`)) return;
    setBusyId(post.id); setError(""); setNotice("");
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((old) => old.filter((item) => item.id !== post.id));
      setNotice("Article delete ho gaya.");
    } catch (e) {
      setError(e?.response?.data?.message || "Article delete nahi hua. Delete ke liye Admin role required hai.");
    } finally { setBusyId(null); }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7f5", color: "#142e32", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
          <Box>
            <Button component={Link} to="/admin" startIcon={<ArrowBack />} sx={{ mb: 1, textTransform: "none", color: "#315d52" }}>Dashboard</Button>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>Article management</Typography>
            <Typography sx={{ color: "#657a79", mt: 0.5 }}>Create, edit, publish aur manage InfoYug articles.</Typography>
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadPosts} disabled={loading} sx={{ textTransform: "none" }}>Refresh</Button>
            <Button component={Link} to="/admin/articles/new" variant="contained" startIcon={<Add />} sx={{ bgcolor: "#153d3d", textTransform: "none", "&:hover": { bgcolor: "#216b58" } }}>New article</Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e0e9e4", borderRadius: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <TextField fullWidth value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, slug, category..." size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
            <TextField select SelectProps={{ native: true }} value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: { md: 180 } }}>
              <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option>
            </TextField>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ border: "1px solid #e0e9e4", borderRadius: 3, overflow: "hidden" }}>
          {loading ? <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>
          : filteredPosts.length === 0 ? <Box sx={{ py: 8, px: 3, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>No articles found</Typography>
              <Typography sx={{ color: "#718482", my: 1 }}>Search clear karo ya first article create karo.</Typography>
              <Button component={Link} to="/admin/articles/new" startIcon={<Add />}>Create article</Button>
            </Box>
          : <TableContainer><Table>
              <TableHead><TableRow sx={{ bgcolor: "#f8faf8" }}>
                <TableCell sx={{ fontWeight: 800 }}>Article</TableCell><TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>{filteredPosts.map((post) => <TableRow key={post.id} hover>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 750 }}>{post.title || "Untitled article"}</Typography>
                  <Typography variant="caption" sx={{ color: "#718482" }}>{post.slug || `ID: ${post.id}`}</Typography>
                </TableCell>
                <TableCell>{post.categoryName || post.category?.name || "—"}</TableCell>
                <TableCell><Chip size="small" label={published(post) ? "Published" : "Draft"} color={published(post) ? "success" : "default"} variant={published(post) ? "filled" : "outlined"} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                    <Tooltip title="Edit"><IconButton component={Link} to={`/admin/articles/${post.id}/edit`} size="small"><EditOutlined /></IconButton></Tooltip>
                    {published(post) && post.slug && <Tooltip title="View public article"><IconButton component={Link} to={`/post/${encodeURIComponent(post.slug)}`} target="_blank" size="small"><OpenInNew /></IconButton></Tooltip>}
                    <Tooltip title={published(post) ? "Move to draft" : "Publish"}><span><IconButton onClick={() => changeStatus(post)} disabled={busyId === post.id} size="small" color={published(post) ? "default" : "success"}>{published(post) ? <Unpublished /> : <Publish />}</IconButton></span></Tooltip>
                    <Tooltip title="Delete"><span><IconButton onClick={() => deletePost(post)} disabled={busyId === post.id} size="small" color="error"><Delete /></IconButton></span></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>}
        </Paper>
        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#718482" }}>
          Delete endpoint backend mein Admin role require karta hai. Publish/draft endpoints Admin ya Editor role accept karte hain.
        </Typography>
      </Container>
    </Box>
  );
}
