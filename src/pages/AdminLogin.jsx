
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  ArrowBack,
} from "@mui/icons-material";

import api from "../services/api";
import {
  getAdminToken,
  getAdminUser,
  saveAdminSession,
} from "../Auth/AdminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already logged-in admin goes directly to dashboard.
  const token = getAdminToken();
  const user = getAdminUser();

  const isAdmin =
    Boolean(token) &&
    String(user?.role || "").toLowerCase() === "admin";

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      // Save JWT and admin details.
      saveAdminSession(response.data);

      // Always redirect to AdminDashboard.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.title;

      setError(
        status === 401 || status === 400
          ? apiMessage ||
              "Email/password galat hai, ya account ko Admin role nahi mila hai."
          : apiMessage ||
              err?.message ||
              "Login nahi ho paaya. API URL aur backend status check karein."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f3f7f5",
        display: "grid",
        placeItems: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{
            mb: 2,
            color: "#315d52",
            textTransform: "none",
          }}
        >
          Back to InfoYug
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: "1px solid #e0e9e4",
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: "#e1f5e9",
              color: "#17684e",
              display: "grid",
              placeItems: "center",
              mb: 2,
            }}
          >
            <LockOutlined />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: "#142e32",
              letterSpacing: -1,
            }}
          >
            Admin Login
          </Typography>

          <Typography sx={{ mt: 1, mb: 3, color: "#647a7b" }}>
            Sign in to manage InfoYug articles and content.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              fullWidth
              required
              margin="normal"
            />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
              required
              margin="normal"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                bgcolor: "#153d3d",
                fontWeight: 800,
                textTransform: "none",
                "&:hover": { bgcolor: "#216b58" },
              }}
            >
              {loading ? (
                <CircularProgress size={23} color="inherit" />
              ) : (
                "Sign in securely"
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 3,
              color: "#758683",
            }}
          >
            Admin-only access. Your account must have the Admin role
            assigned by the backend.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
