
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const categoryInfo = {
  automobile: {
    name: "Automobile",
    description: "Cars, bikes, reviews and the latest automobile updates.",
  },
  technology: {
    name: "Technology",
    description: "Discover technology, digital tools and emerging innovations.",
  },
  "daily-life": {
    name: "Daily Life",
    description: "Practical knowledge, useful ideas and everyday tips.",
  },
};

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function imageUrl(url) {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatDate(date) {
  if (!date) return "Recently published";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently published";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Category() {
  const { slug } = useParams();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const category = categoryInfo[slug];

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/posts");
        const data = response.data;

        const items = Array.isArray(data)
          ? data
          : data?.items ?? data?.posts ?? [];

        if (!cancelled) {
          setPosts(items);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Articles load nahi ho paaye. Backend aur API connection check karein."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    document.title = category
      ? `${category.name} Articles | InfoYug`
      : "Category Not Found | InfoYug";
  }, [category]);

  const filteredPosts = useMemo(() => {
    if (!category) return [];

    return posts.filter((post) => {
      const postSlug =
        post.categorySlug ||
        post.category?.slug ||
        slugify(post.categoryName || post.category?.name || "");

      return postSlug === slug;
    });
  }, [posts, slug, category]);

  if (!category) {
    return (
      <Container maxWidth="md" sx={{ py: 10 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Ye category available nahi hai.
        </Alert>

        <Button component={Link} to="/" startIcon={<ArrowBackIcon />}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7f5" }}>
      <Box
        component="header"
        sx={{
          bgcolor: "#102a30",
          color: "#fff",
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ gap: 2, flexWrap: "wrap" }}
          >
            <Typography
              component={Link}
              to="/"
              sx={{
                color: "#fff",
                textDecoration: "none",
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              Info<span style={{ color: "#83e0b0" }}>Yug</span>
            </Typography>

            <Button
              component={Link}
              to="/"
              startIcon={<ArrowBackIcon />}
              sx={{ color: "#a7edc5", textTransform: "none" }}
            >
              Back to Home
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box
        sx={{
          bgcolor: "#153d3d",
          color: "#fff",
          py: { xs: 6, md: 9 },
        }}
      >
        <Container maxWidth="xl">
          <Chip
            label="EXPLORE CATEGORY"
            sx={{
              mb: 2,
              bgcolor: "rgba(131,224,176,0.15)",
              color: "#a7edc5",
              fontWeight: 800,
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 38, md: 60 },
              fontWeight: 900,
              lineHeight: 1.15,
            }}
          >
            {category.name}
          </Typography>

          <Typography
            sx={{
              mt: 2,
              maxWidth: 650,
              color: "#c1d7d2",
              lineHeight: 1.8,
              fontSize: { xs: 16, md: 18 },
            }}
          >
            {category.description}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 4, gap: 2, flexWrap: "wrap" }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "#438d74", fontWeight: 800 }}
            >
              LATEST STORIES
            </Typography>

            <Typography
              variant="h4"
              sx={{ fontWeight: 850, color: "#153d3d" }}
            >
              {category.name} Articles
            </Typography>
          </Box>

          {!loading && (
            <Chip
              label={`${filteredPosts.length} articles`}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {loading ? (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <CircularProgress sx={{ color: "#216b58" }} />
            <Typography sx={{ mt: 2 }}>
              Articles load ho rahe hain...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredPosts.length === 0 ? (
          <Box
            sx={{
              py: 8,
              px: 3,
              textAlign: "center",
              bgcolor: "#fff",
              borderRadius: 4,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Abhi koi article available nahi hai.
            </Typography>

            <Typography sx={{ mt: 1, color: "#647a7b" }}>
              Is category mein publish kiye gaye articles yahan dikhenge.
            </Typography>

            <Button component={Link} to="/" sx={{ mt: 2 }}>
              Explore Home Page
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {filteredPosts.map((post) => (
              <Card
                key={post.id ?? post.slug}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 5px 20px rgba(18,47,48,0.05)",
                  transition: "transform .2s ease",
                  "&:hover": { transform: "translateY(-4px)" },
                }}
              >
                {post.coverImageUrl ? (
                  <CardMedia
                    component="img"
                    image={imageUrl(post.coverImageUrl)}
                    alt={post.title || "Article cover"}
                    sx={{
                      height: 220,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 220,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#dceee5",
                      color: "#216b58",
                      fontSize: 32,
                      fontWeight: 900,
                    }}
                  >
                    InfoYug
                  </Box>
                )}

                <CardContent
                  sx={{
                    p: 3,
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Chip
                    size="small"
                    label={category.name}
                    sx={{
                      mb: 2,
                      bgcolor: "#e0f5e9",
                      color: "#216b53",
                      fontWeight: 800,
                    }}
                  />

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 850,
                      lineHeight: 1.4,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {post.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.5,
                      color: "#627574",
                      lineHeight: 1.8,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {post.excerpt || "Discover this story on InfoYug."}
                  </Typography>

                  <Box sx={{ flexGrow: 1, minHeight: 20 }} />

                  <Typography
                    variant="caption"
                    sx={{ mt: 2, color: "#758683" }}
                  >
                    {formatDate(post.publishedAt)}
                  </Typography>

                  <Button
                    component={Link}
                    to={`/post/${encodeURIComponent(post.slug || "")}`}
                    endIcon={<ArrowForwardIcon />}
                    disabled={!post.slug}
                    sx={{
                      mt: 2,
                      px: 0,
                      color: "#216b58",
                      fontWeight: 800,
                      textTransform: "none",
                    }}
                  >
                    Read full article
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>

      <Box
        component="footer"
        sx={{ bgcolor: "#102a30", color: "#a9c1c3", py: 3 }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2">
            © {new Date().getFullYear()} InfoYug. Automobile · Technology ·
            Daily Life
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
