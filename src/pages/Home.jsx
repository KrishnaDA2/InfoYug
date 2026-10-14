
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Box,
  Container,
  Typography,
  Button,
  Divider,
  Stack,
  Card,
  CardContent,
  CardMedia,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  IconButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
const categoriesFallback = [
  { name: "Automobile", slug: "automobile" },
  { name: "Technology", slug: "technology" },
  { name: "Daily Life", slug: "daily-life" },
];
const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
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
  if (Number.isNaN(parsed.getTime())) return "Recently published";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function ArticleImage({ src, title, height = 220 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <Box
        sx={{
          height,
          background:
            "linear-gradient(135deg, #102c32 0%, #17665e 55%, #9ae6b4 150%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#d6fff0",
          p: 3,
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, textAlign: "center" }}
        >
          InfoYug
        </Typography>
      </Box>
    );
  }
  return (
    <CardMedia
      component="img"
      image={src}
      alt={title || "InfoYug article"}
      onError={() => setFailed(true)}
      sx={{ display: "block", width: "100%", height: { xs: Math.min(height, 240), sm: height }, objectFit: "cover" }}
    />
  );
}
export default function Home() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(categoriesFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function loadHomePage() {
      setLoading(true);
      setError("");
      try {
        const [postsResult, categoriesResult] = await Promise.allSettled([
          api.get("/posts"),
          api.get("/categories"),
        ]);
        if (!mounted) return;
        if (postsResult.status === "fulfilled") {
          const data = postsResult.value.data;
          const items = Array.isArray(data)
            ? data
            : data?.items ?? data?.posts ?? [];
          setPosts(items);
        } else {
          setError(
            "Articles load nahi ho paaye. Backend URL aur API status check karo."
          );
        }
        if (categoriesResult.status === "fulfilled") {
          const data = categoriesResult.value.data;
          const items = Array.isArray(data)
            ? data
            : data?.items ?? data?.categories ?? [];
          if (items.length) setCategories(items);
        }
      } catch {
        if (mounted) {
          setError("Backend se connection nahi ho pa raha hai.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadHomePage();
    return () => {
      mounted = false;
    };
  }, []);
  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const category =
        post.categoryName || post.category?.name || "";
      const matchesCategory =
        activeCategory === "All" ||
        category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !query ||
        [post.title, post.excerpt, post.categoryName, post.authorName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [posts, search, activeCategory]);
  const featured = filteredPosts[0];
  const latestPosts = filteredPosts.slice(1);
  const categoryName = (category) =>
    typeof category === "string" ? category : category.name;
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7f5", color: "#142e32" }}>
      {/* Navigation */}
      <Box
        component="header"
        sx={{
          bgcolor: "#102a30",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              minHeight: { xs: 72, md: 82 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              columnGap: { xs: 1, md: 3 },
              rowGap: 1.5,
              flexWrap: "wrap",
              py: { xs: 1.5, md: 2 },
            }}
          >
            <Box
              component={Link}
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              sx={{ color: "inherit", textDecoration: "none", minWidth: 0, flexShrink: 0 }}
            >
              <Typography
                component="div"
                sx={{ fontWeight: 900, letterSpacing: "-1.8px", fontSize: { xs: 27, sm: 31, md: 34 }, lineHeight: 1.1 }}
              >
                Info<span style={{ color: "#83e0b0" }}>Yug</span>
                <Typography
                  component="span"
                  sx={{ display: { xs: "none", sm: "block" }, fontSize: 9, color: "#a9c1c3", letterSpacing: { sm: 1.8, md: 2.5 }, mt: 0.5 }}
                >
                  IDEAS FOR A CHANGING WORLD
                </Typography>
              </Typography>
            </Box>

            <IconButton
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              sx={{
                display: { xs: "inline-flex", md: "none" },
                color: "#a7edc5",
                border: "1px solid rgba(167,237,197,.35)",
                borderRadius: 2,
                ml: "auto",
              }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 0, md: 3 }}
              useFlexGap
              sx={{
                display: { xs: mobileMenuOpen ? "flex" : "none", md: "flex" },
                order: { xs: 3, md: 0 },
                width: { xs: "100%", md: "auto" },
                alignItems: { xs: "stretch", md: "center" },
                flexWrap: "nowrap",
                gap: { xs: 0.5, md: 3 },
                py: { xs: 1, md: 0 },
                borderTop: { xs: mobileMenuOpen ? "1px solid rgba(255,255,255,.12)" : "none", md: "none" },
              }}
            >
              {["Home", "Blog", "Automobile", "Technology", "Daily Life"].map((item) => (
                <Typography
                  key={item}
                  component={Link}
                  to={item === "Home" ? "/" : item === "Blog" ? "/#latest-articles" : `/category/${item.toLowerCase().replace(" ", "-")}`}
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{
                    color: item === "Home" ? "#83e0b0" : "#d3e0df",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    py: { xs: 1, md: 0.5 },
                    "&:hover": { color: "#83e0b0" },
                  }}
                >
                  {item}
                </Typography>
              ))}
              <Button
                component={Link}
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                variant="outlined"
                sx={{
                  display: { xs: "inline-flex", md: "none" },
                  alignSelf: "flex-start",
                  mt: 1,
                  color: "#a7edc5",
                  borderColor: "#4e8d7d",
                  borderRadius: 2,
                  px: 2,
                  textTransform: "none",
                  "&:hover": { borderColor: "#a7edc5" },
                }}
              >
                Author Login
              </Button>
            </Stack>

            <Button
              component={Link}
              to="/login"
              variant="outlined"
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "#a7edc5",
                borderColor: "#4e8d7d",
                borderRadius: 3,
                px: 2.5,
                textTransform: "none",
                flexShrink: 0,
                "&:hover": { borderColor: "#a7edc5" },
              }}
            >
              Author Login
            </Button>
          </Box>
        </Container>
      </Box>
      {/* Hero */}
      <Box
        sx={{
          bgcolor: "#102a30",
          color: "#fff",
          pb: { xs: 7, md: 11 },
          pt: { xs: 5, md: 8 },
          overflow: "hidden",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
              gap: { xs: 5, md: 8 },
              alignItems: "center",
            }}
          >
            <Box>
              <Chip
                label="KNOW MORE. LIVE BETTER."
                sx={{
                  bgcolor: "rgba(131,224,176,0.12)",
                  color: "#a4edc2",
                  border: "1px solid rgba(131,224,176,0.3)",
                  fontWeight: 700,
                  letterSpacing: 1,
                  mb: 3,
                }}
              />
              <Typography
                sx={{
                  fontSize: { xs: "clamp(2.25rem, 10vw, 2.8rem)", sm: 55, md: 72 },
                  fontWeight: 900,
                  letterSpacing: { xs: -1.5, md: -4 },
                  lineHeight: 1.04,
                  maxWidth: 650,
                }}
              >
                The world,
                <br />
                <Box component="span" sx={{ color: "#83e0b0" }}>
                  explained
                </Box>{" "}
                simply.
              </Typography>
              <Typography
                sx={{
                  color: "#b6cbcb",
                  fontSize: { xs: 16, md: 18 },
                  lineHeight: 1.8,
                  maxWidth: 550,
                  mt: 3,
                }}
              >
                Automobile updates, emerging technology and practical ideas
                for everyday life — all in one place.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ mt: 4, maxWidth: 570 }}
              >
                <TextField
                  fullWidth
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search articles..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      document.getElementById("latest-articles")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <span style={{ color: "#6c8585" }}>⌕</span>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: 2,
                    "& fieldset": { border: "none" },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() =>
                    document.getElementById("latest-articles")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  sx={{
                    px: 3,
                    py: 1.8,
                    borderRadius: 2,
                    bgcolor: "#83e0b0",
                    color: "#102a30",
                    fontWeight: 800,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    "&:hover": { bgcolor: "#a0edc3" },
                  }}
                >
                  Explore Articles
                </Button>
              </Stack>
              <Stack direction="row" spacing={{ xs: 2, sm: 3 }} useFlexGap sx={{ mt: 4, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    3
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#a8c0c0" }}>
                    Core categories
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderColor: "#355057" }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Daily
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#a8c0c0" }}>
                    Fresh perspectives
                  </Typography>
                </Box>
              </Stack>
            </Box>
            <Box
              sx={{
                minHeight: { xs: 270, md: 440 },
                borderRadius: 5,
                p: { xs: 3, md: 5 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background:
                  "radial-gradient(circle at 80% 20%, rgba(131,224,176,0.24), transparent 32%), linear-gradient(140deg, #1a4549, #14343a 60%, #0d2228)",
                border: "1px solid rgba(172,233,208,0.18)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Typography
                sx={{
                  color: "#a9edc6",
                  fontWeight: 700,
                  letterSpacing: 2,
                  fontSize: 12,
                }}
              >
                YOUR DAILY KNOWLEDGE DESTINATION
              </Typography>
              <Box
                sx={{
                  position: "absolute",
                  width: 240,
                  height: 240,
                  border: "1px solid rgba(131,224,176,0.18)",
                  borderRadius: "50%",
                  right: -40,
                  top: 50,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 28,
                    border: "1px solid rgba(131,224,176,0.24)",
                    borderRadius: "50%",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 58,
                    border: "1px solid rgba(131,224,176,0.3)",
                    borderRadius: "50%",
                  },
                }}
              />
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 32, md: 45 },
                    fontWeight: 800,
                    letterSpacing: -1.5,
                    lineHeight: 1.15,
                    maxWidth: 400,
                  }}
                >
                  Curiosity leads to better decisions.
                </Typography>
                <Typography sx={{ mt: 2, color: "#b6d0ce", maxWidth: 370, lineHeight: 1.8 }}>
                  Discover stories, understand trends and find something useful
                  to take into your day.
                </Typography>
                <Button
                  href="#latest-articles"
                  sx={{
                    mt: 3,
                    color: "#83e0b0",
                    px: 0,
                    fontWeight: 800,
                    textTransform: "none",
                  }}
                >
                  Discover what's new →
                </Button>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
      {/* Categories */}
      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: "#438d74", fontWeight: 800, letterSpacing: 2 }}>
              EXPLORE YOUR INTERESTS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: -1 }}>
              Browse by category
            </Typography>
          </Box>
          <Typography sx={{ color: "#647a7b", maxWidth: 430 }}>
            From your next car to tomorrow's technology, explore topics that
            matter to you.
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {[
            {
              name: "Automobile",
              slug: "automobile",
              number: "01",
              description: "Cars, bikes, reviews and industry news.",
              symbol: "A",
              color: "#d9eee4",
            },
            {
              name: "Technology",
              slug: "technology",
              number: "02",
              description: "Innovation, digital tools and future trends.",
              symbol: "T",
              color: "#dce7f6",
            },
            {
              name: "Daily Life",
              slug: "daily-life",
              number: "03",
              description: "Useful knowledge for everyday decisions.",
              symbol: "D",
              color: "#f5e7cf",
            },
          ].map((category) => (
            <Card
              key={category.slug}
              component={Link}
              to={`/category/${category.slug}`}
              sx={{
                color: "inherit",
                textDecoration: "none",
                cursor: "pointer",
                borderRadius: 4,
                bgcolor: category.color,
                boxShadow: "none",
                border: "1px solid rgba(20,46,50,0.06)",
                transition: "transform .2s ease, box-shadow .2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 15px 35px rgba(20,46,50,0.08)",
                },
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 12, color: "#637a79", fontWeight: 800, letterSpacing: 2 }}>
                    {category.number}
                  </Typography>
                  <Box
                    sx={{
                      width: 43,
                      height: 43,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.65)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 21,
                      fontWeight: 900,
                      color: "#1c5148",
                    }}
                  >
                    {category.symbol}
                  </Box>
                </Stack>
                <Typography variant="h5" sx={{ mt: 3, fontWeight: 850 }}>
                  {category.name}
                </Typography>
                <Typography sx={{ color: "#526a69", mt: 1, lineHeight: 1.7 }}>
                  {category.description}
                </Typography>
                <Typography sx={{ mt: 2, fontWeight: 800, color: "#216c58" }}>
                  Explore articles →
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
      {/* Featured article */}
      {!loading && featured && activeCategory === "All" && !search && (
        <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 8 } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: -1 }}>
              Editor's pick
            </Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: "#dbe4df" }} />
          </Stack>
          <Card
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              borderRadius: 5,
              overflow: "hidden",
              boxShadow: "0 15px 45px rgba(18,47,48,0.07)",
            }}
          >
            <ArticleImage
              src={imageUrl(featured.coverImageUrl)}
              title={featured.title}
              height={380}
            />
            <CardContent
              sx={{
                p: { xs: 3, md: 5 },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <Chip
                label={featured.categoryName || "Featured"}
                size="small"
                sx={{ bgcolor: "#e0f5e9", color: "#216b53", fontWeight: 800 }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: 29, md: 39 },
                  lineHeight: 1.2,
                  fontWeight: 850,
                  letterSpacing: -1.5,
                  mt: 2,
                }}
              >
                {featured.title}
              </Typography>
              <Typography sx={{ color: "#617575", lineHeight: 1.9, mt: 2 }}>
                {featured.excerpt || "Read the latest story on InfoYug."}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, color: "#718482" }}>
                {featured.authorName || "InfoYug Editorial"} ·{" "}
                {formatDate(featured.publishedAt)}
              </Typography>
              <Button
                component={Link}
                to={featured.slug ? `/post/${encodeURIComponent(featured.slug)}` : "/"}
                variant="contained"
                sx={{
                  mt: 3,
                  px: 3,
                  py: 1.4,
                  borderRadius: 2,
                  bgcolor: "#153d3d",
                  textTransform: "none",
                  fontWeight: 800,
                  "&:hover": { bgcolor: "#216b58" },
                }}
              >
                Read full article →
              </Button>
            </CardContent>
          </Card>
        </Container>
      )}
      {/* Latest posts */}
      <Box id="latest-articles" sx={{ bgcolor: "#eaf0ec", py: { xs: 5, md: 8 } }}>
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mb: 4, alignItems: { xs: "flex-start", md: "flex-end" }, justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: "#438d74", fontWeight: 800, letterSpacing: 2 }}>
                FRESH PERSPECTIVES
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: -1 }}>
                Latest articles
              </Typography>
            </Box>
            <Stack direction="row" gap={1} sx={{ flexWrap: "wrap" }}>
              {["All", ...categories.map(categoryName)].map((category, index) => (
                <Chip
                  key={`${category}-${index}`}
                  label={category}
                  onClick={() => setActiveCategory(category)}
                  variant={activeCategory === category ? "filled" : "outlined"}
                  sx={{
                    fontWeight: 700,
                    bgcolor: activeCategory === category ? "#153d3d" : "transparent",
                    color: activeCategory === category ? "#fff" : "#526a69",
                    borderColor: "#cbd8d1",
                    "&:hover": {
                      bgcolor: activeCategory === category ? "#216b58" : "#dfe8e2",
                    },
                  }}
                />
              ))}
            </Stack>
          </Stack>
          {error && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
              <CircularProgress sx={{ color: "#216b58" }} />
            </Box>
          ) : filteredPosts.length === 0 ? (
            <Box
              sx={{
                py: 8,
                px: 3,
                textAlign: "center",
                bgcolor: "#f7faf7",
                borderRadius: 4,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {posts.length === 0 ? "No published articles yet" : "No articles found"}
              </Typography>
              <Typography sx={{ mt: 1, color: "#647a7b" }}>
                {posts.length === 0
                  ? "Publish your first article in the backend to display it here."
                  : "Try another search or category."}
              </Typography>
              {(search || activeCategory !== "All") && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("All");
                  }}
                  sx={{ mt: 2, textTransform: "none" }}
                >
                  Clear filters
                </Button>
              )}
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
              {(activeCategory === "All" && !search
                ? latestPosts
                : filteredPosts
              ).map((post) => (
                <Card
                  key={post.id}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 4,
                    overflow: "hidden",
                    boxShadow: "0 5px 20px rgba(18,47,48,0.045)",
                    transition: "transform .2s ease, box-shadow .2s ease",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0 15px 35px rgba(18,47,48,0.1)",
                    },
                  }}
                >
                  <ArticleImage
                    src={imageUrl(post.coverImageUrl)}
                    title={post.title}
                    height={220}
                  />
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
                      label={post.categoryName || "Article"}
                      sx={{
                        bgcolor: "#e0f5e9",
                        color: "#216b53",
                        fontWeight: 800,
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 850, lineHeight: 1.4 }}
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
                    <Box sx={{ flexGrow: 1 }} />
                    <Divider sx={{ width: "100%", my: 2 }} />
                    <Stack
                      direction="row"
                      sx={{ width: "100%", gap: 1, justifyContent: "space-between", alignItems: "center" }}
                    >
                      <Typography variant="caption" sx={{ color: "#758683" }}>
                        {formatDate(post.publishedAt)}
                      </Typography>
                      <Button
                        component={Link}
                        to={post.slug ? `/post/${encodeURIComponent(post.slug)}` : "/"}
                        sx={{
                          color: "#216b58",
                          fontWeight: 800,
                          textTransform: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Read more →
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Container>
      </Box>
      {/* Newsletter / CTA */}
      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
        <Box
          sx={{
            bgcolor: "#153d3d",
            color: "#fff",
            borderRadius: 5,
            p: { xs: 3, md: 6 },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 850, letterSpacing: -1 }}
            >
              Stay curious.
            </Typography>
            <Typography sx={{ color: "#c1d7d2", mt: 1, lineHeight: 1.8 }}>
              Explore fresh ideas and discover your next interesting read.
            </Typography>
          </Box>
          <Button
            href="#latest-articles"
            variant="contained"
            sx={{
              bgcolor: "#83e0b0",
              color: "#102a30",
              px: 3,
              py: 1.6,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: "none",
              "&:hover": { bgcolor: "#a0edc3" },
            }}
          >
            Explore InfoYug →
          </Button>
        </Box>
      </Container>
      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: "#102a30", color: "#fff", py: 4 }}>
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: 22 }}>
              Info<span style={{ color: "#83e0b0" }}>Yug</span>
            </Typography>
            <Typography variant="body2" sx={{ color: "#a9c1c3" }}>
              Automobile · Technology · Daily Life
            </Typography>
            <Typography variant="caption" sx={{ color: "#a9c1c3" }}>
              © {new Date().getFullYear()} InfoYug. All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
