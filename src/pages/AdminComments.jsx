
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import api from "../services/api";
import {
  clearAdminSession,
  getAdminUser,
  restoreAdminSession,
} from "../Auth/AdminAuth";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "401 Unauthorized: JWT token invalid, expired, ya backend configuration mismatch hai.";
  }

  if (status === 403) {
    return "403 Forbidden: account ko comments moderation ki permission nahi hai.";
  }

  if (status === 404) {
    return "404: API route nahi mili. /api/comments/moderation check karein.";
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "Request failed. Backend aur network logs check karein."
  );
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.comments)) return data.comments;
  return [];
}

export default function AdminComments() {
  const navigate = useNavigate();
  const user = getAdminUser();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const sessionValid = restoreAdminSession();

      if (!sessionValid) {
        setError(
          "Admin session nahi mila. Pehle login karein, phir page refresh karein."
        );
        setLoading(false);
        return;
      }

      const response = await api.get("/comments/moderation");

      console.log("Moderation API success:", {
        status: response.status,
        url: response.config?.baseURL + response.config?.url,
        count: normalizeList(response.data).length,
      });

      setComments(normalizeList(response.data));
    } catch (err) {
      // Temporary debugging logs: inspect these in browser Console.
      console.error("Moderation API Error:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        baseURL: err?.config?.baseURL,
        authorizationSent: Boolean(
          err?.config?.headers?.Authorization ||
          err?.config?.headers?.authorization
        ),
      });

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const approveComment = async (comment) => {
    const id = comment?.id ?? comment?.Id;
    if (id == null) return;

    setBusyId(id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(`/comments/${id}/approve`);

      console.log("Approve response:", response.status);

      setComments((current) =>
        current.filter((item) => (item.id ?? item.Id) !== id)
      );

      setNotice("Comment approve ho gaya. Ab published article par dikh sakta hai.");
    } catch (err) {
      console.error("Approve API Error:", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });

      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const deleteComment = async (comment) => {
    const id = comment?.id ?? comment?.Id;
    if (id == null) return;

    const confirmed = window.confirm(
      "Is comment ko permanently delete karna hai?"
    );

    if (!confirmed) return;

    setBusyId(id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/comments/${id}`);

      setComments((current) =>
        current.filter((item) => (item.id ?? item.Id) !== id)
      );

      setNotice("Comment delete kar diya gaya.");
    } catch (err) {
      console.error("Delete API Error:", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });

      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const logout = () => {
    clearAdminSession();
    navigate("/login", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        py: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              aria-label="Go back"
              onClick={() => navigate(-1)}
              sx={{ bgcolor: "#fff", border: "1px solid #e5eaf2" }}
            >
              <span aria-hidden="true">←</span>
            </IconButton>

            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: "#172033" }}
              >
                Comment Moderation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                InfoYug · Reader comments awaiting approval
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<span aria-hidden="true">↻</span>}
              onClick={loadComments}
              disabled={loading}
              sx={{ bgcolor: "#fff", textTransform: "none" }}
            >
              Refresh
            </Button>

            <Button
              variant="text"
              color="inherit"
              onClick={logout}
              sx={{ textTransform: "none" }}
            >
              Logout
            </Button>
          </Stack>
        </Stack>

        <Card
          elevation={0}
          sx={{ mb: 3, border: "1px solid #e5eaf2", borderRadius: 3 }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: "#e1f5ee",
                  color: "#147d64",
                  width: 52,
                  height: 52,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 24 }}>
                  ☰
                </span>
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Pending comments
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {comments.length}
                </Typography>
              </Box>

              <Chip label={user?.name || "Admin"} variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {notice && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setNotice("")}
          >
            {notice}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : comments.length === 0 && !error ? (
          <Card
            elevation={0}
            sx={{ border: "1px solid #e5eaf2", borderRadius: 3 }}
          >
            <CardContent sx={{ py: 8, textAlign: "center" }}>
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  display: "block",
                  fontSize: 48,
                  color: "#16846a",
                  mb: 1,
                  lineHeight: 1,
                }}
              >
                ✓
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No pending comments
              </Typography>
              <Typography color="text.secondary">
                Naye reader comments yahan approval ke liye dikhai denge.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {comments.map((comment) => {
              const id = comment.id ?? comment.Id;
              const name = comment.name ?? comment.Name ?? "Reader";
              const content = comment.content ?? comment.Content ?? "";
              const email = comment.email ?? comment.Email ?? "";
              const postTitle =
                comment.post?.title ??
                comment.Post?.Title ??
                comment.postTitle ??
                comment.PostTitle ??
                "Article";
              const createdAt = comment.createdAt ?? comment.CreatedAt;
              const busy = busyId === id;

              return (
                <Card
                  key={id}
                  elevation={0}
                  sx={{ border: "1px solid #e5eaf2", borderRadius: 3 }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "stretch", sm: "flex-start" }}
                      spacing={2}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Avatar sx={{ bgcolor: "#e9edf8", color: "#34456c" }}>
                            {String(name).trim().charAt(0).toUpperCase() || "R"}
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 750 }}>
                              {name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {email || "No email provided"} ·{" "}
                              {formatDate(createdAt)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          Article: {postTitle}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 1,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            color: "#273247",
                            lineHeight: 1.75,
                          }}
                        >
                          {content}
                        </Typography>
                      </Box>

                      <Stack
                        direction={{ xs: "row", sm: "column" }}
                        spacing={1}
                      >
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={
                            busy ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <span aria-hidden="true">✓</span>
                            )
                          }
                          onClick={() => approveComment(comment)}
                          disabled={busy}
                          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                        >
                          Approve
                        </Button>

                        <Tooltip title="Permanently delete comment">
                          <span>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<span aria-hidden="true">×</span>}
                              onClick={() => deleteComment(comment)}
                              disabled={busy}
                              sx={{ textTransform: "none" }}
                            >
                              Delete
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        <Divider sx={{ my: 4 }} />

        <Typography variant="caption" color="text.secondary">
          Only approve comments that are relevant and safe for readers. Email
          addresses are shown only in this admin view.
        </Typography>
      </Container>
    </Box>
  );
}
