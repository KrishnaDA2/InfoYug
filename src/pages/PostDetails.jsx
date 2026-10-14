import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useParams } from "react-router-dom";

import {

  Alert,

  Avatar,

  Box,

  Breadcrumbs,

  Button,

  Card,

  CardActionArea,

  CardContent,

  Chip,

  CircularProgress,

  Container,

  Divider,

  Paper,

  Stack,

  TextField,

  Typography,

} from "@mui/material";

import {

  AccessTime,

  ArrowBack,

  ArrowUpward,

  CalendarMonth,

  ContentCopy,

  HomeOutlined,

  MenuBook,

  ShareOutlined,

  Send,

  VisibilityOutlined,

} from "@mui/icons-material";

import api from "../services/api";



const API_ORIGIN = (() => {

  try {

    return new URL(api.defaults.baseURL).origin;

  } catch {

    return "";

  }

})();



function imageUrl(url) {

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) return url;

  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;

}



function formatDate(date) {

  if (!date) return "Recently published";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Recently published";

  return parsed.toLocaleDateString("en-IN", {

    day: "numeric",

    month: "long",

    year: "numeric",

  });

}



function slugify(value) {

  return String(value || "")

    .toLowerCase()

    .trim()

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-|-$/g, "");

}



function escapeHtml(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#39;");

}



function readingTime(content) {

  const text = String(content || "")

    .replace(/<[^>]*>/g, " ")

    .replace(/[#\*_`]/g, " ")

    .trim();

  const words = text ? text.split(/\s+/).length : 0;

  return Math.max(1, Math.ceil(words / 200));

}



// Sanitizes article HTML, adds IDs to headings and builds the sidebar TOC.

function prepareContent(content) {

  const source = String(content || "");

  if (typeof window === "undefined") return { html: "", headings: [] };



  const looksLikeHtml = /<\/?(p|h[1-6]|div|ul|ol|li|blockquote|img|table|br|strong|em|a|figure|figcaption|video|source|iframe)\b/i.test(source);

  const rawHtml = looksLikeHtml

    ? source

    : source

        .split(/\n{2,}/)

        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)

        .join("");



  const parsed = new DOMParser().parseFromString(rawHtml, "text/html");

  parsed

    .querySelectorAll("script, style, object, embed, form, input, button, textarea, select")

    .forEach((element) => element.remove());



  const allowedTags = new Set([

    "P", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "HR", "STRONG", "B", "EM", "I", "U", "S",

    "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE", "A", "IMG", "FIGURE", "FIGCAPTION",

    "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DIV", "SPAN", "SUB", "SUP",

    "VIDEO", "SOURCE", "IFRAME",

  ]);



  [...parsed.body.querySelectorAll("*")].reverse().forEach((element) => {

    if (!allowedTags.has(element.tagName)) {

      element.replaceWith(parsed.createTextNode(element.textContent || ""));

      return;

    }



    [...element.attributes].forEach((attribute) => {

      const name = attribute.name.toLowerCase();

      const value = attribute.value.trim();



      if (name.startsWith("on") || name === "style" || name === "srcdoc") {

        element.removeAttribute(attribute.name);

        return;

      }

      if (name === "href" && !/^(https?:|mailto:|tel:|#|\/)/i.test(value)) {

        element.removeAttribute(attribute.name);

        return;

      }

      if (name === "src") {

        if (!/^(https?:\/\/|\/)/i.test(value) || /^\/\//.test(value)) {

          element.removeAttribute("src");

          return;

        }

        if (element.tagName === "IFRAME") {

          try {

            const frameUrl = new URL(value);

            const host = frameUrl.hostname.toLowerCase().replace(/^www\./, "");

            const allowedFrameHosts = ["youtube.com", "youtube-nocookie.com", "player.vimeo.com"];

            if (!allowedFrameHosts.includes(host)) {

              element.remove();

              return;

            }

            element.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");

            element.setAttribute("allowfullscreen", "");

            element.setAttribute("loading", "lazy");

            element.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

          } catch {

            element.remove();

            return;

          }

        } else {

          element.setAttribute("src", imageUrl(value));

        }

        return;

      }

      const allowedAttributes = ["href", "src", "alt", "title", "colspan", "rowspan", "target", "rel", "width", "height", "controls", "playsinline", "preload", "poster", "type", "allowfullscreen", "frameborder", "allow", "referrerpolicy", "loading", "sandbox"];

      if (!allowedAttributes.includes(name)) element.removeAttribute(attribute.name);

    });



    if (element.tagName === "A") {

      element.setAttribute("rel", "noopener noreferrer");

      if (element.getAttribute("target") === "_blank") element.setAttribute("rel", "noopener noreferrer");

    }

  });



  const headings = [];

  const usedIds = new Set();

  parsed.body.querySelectorAll("h1, h2, h3").forEach((heading, index) => {

    const title = heading.textContent.trim();

    if (!title) return;

    const baseId = slugify(title) || `section-${index + 1}`;

    let id = baseId;

    let suffix = 2;

    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;

    usedIds.add(id);

    heading.id = id;

    headings.push({ id, title, level: Number(heading.tagName.substring(1)) });

  });



  return { html: parsed.body.innerHTML, headings };

}



function ArticleImage({ src, title, height = 440 }) {

  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);



  if (!src || failed) {

    return (

      <Box sx={{ height, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #102c32, #17665e 65%, #9ae6b4)", color: "#e5fff4", borderRadius: 4 }}>

        <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -2 }}>InfoYug</Typography>

      </Box>

    );

  }

  return (

    <Box

      component="img"

      src={imageUrl(src)}

      alt={title || "InfoYug article cover"}

      onError={() => setFailed(true)}

      sx={{ display: "block", width: "100%", height, objectFit: "cover", borderRadius: 4 }}

    />

  );

}



function RelatedArticleCard({ post }) {

  return (

    <Card elevation={0} sx={{ height: "100%", border: "1px solid #e3eae6", borderRadius: 3, transition: "transform .2s, box-shadow .2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 30px rgba(20,46,50,.08)" } }}>

      <CardActionArea component={Link} to={`/post/${encodeURIComponent(post.slug)}`} sx={{ height: "100%" }}>

        <ArticleImage src={post.coverImageUrl} title={post.title} height={170} />

        <CardContent>

          <Typography variant="caption" sx={{ color: "#21845e", fontWeight: 800 }}>{post.categoryName || "InfoYug"}</Typography>

          <Typography variant="h6" sx={{ mt: 1, fontWeight: 800, lineHeight: 1.4, color: "#173b3b" }}>{post.title}</Typography>

          <Typography variant="body2" sx={{ mt: 1, color: "#6a7d7b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt || "Read this article on InfoYug."}</Typography>

        </CardContent>

      </CardActionArea>

    </Card>

  );

}



export default function PostDetails() {

  const { slug } = useParams();

  const [post, setPost] = useState(null);

  const [relatedPosts, setRelatedPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [progress, setProgress] = useState(0);

  const [copyMessage, setCopyMessage] = useState("");

  // Article comments
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const [commentForm, setCommentForm] = useState({ name: "", email: "", content: "" });



  const loadPost = useCallback(async () => {

    setLoading(true);

    setError("");

    setPost(null);

    try {

      const response = await api.get(`/posts/${encodeURIComponent(slug)}`);

      setPost(response.data);

    } catch (err) {

      setError(err?.response?.status === 404

        ? "Article nahi mila. Ho sakta hai article delete ho gaya ho ya publish nahi hua ho."

        : err?.response?.data?.message || "Article load nahi hua. Backend connection check karein.");

    } finally {

      setLoading(false);

    }

  }, [slug]);



  useEffect(() => { loadPost(); }, [loadPost]);



  useEffect(() => {

    let active = true;

    async function loadRelatedPosts() {

      if (!post) return;

      try {

        const response = await api.get("/posts", { params: { page: 1, pageSize: 12 } });

        const items = Array.isArray(response.data) ? response.data : response.data?.items ?? response.data?.posts ?? [];

        const sameCategory = items.filter((item) => item.slug !== post.slug && item.categoryName && item.categoryName.toLowerCase() === String(post.categoryName || "").toLowerCase());

        const others = items.filter((item) => item.slug !== post.slug);

        if (active) setRelatedPosts((sameCategory.length ? sameCategory : others).slice(0, 3));

      } catch {

        if (active) setRelatedPosts([]);

      }

    }

    loadRelatedPosts();

    return () => { active = false; };

  }, [post]);



  useEffect(() => {
    let active = true;

    async function loadComments() {
      if (!post?.id) return;
      setCommentsLoading(true);
      setCommentError("");
      try {
        const response = await api.get(`/comments/post/${post.id}`);
        const items = Array.isArray(response.data)
          ? response.data
          : response.data?.items ?? response.data?.comments ?? [];
        if (active) setComments(items);
      } catch (err) {
        if (active) {
          setComments([]);
          setCommentError(err?.response?.status === 404
            ? "Comments endpoint abhi API mein available nahi hai. Backend comment controller add karein."
            : "Comments load nahi ho paaye. Please thodi der baad try karein.");
        }
      } finally {
        if (active) setCommentsLoading(false);
      }
    }

    loadComments();
    return () => { active = false; };
  }, [post?.id]);

  const handleCommentChange = (event) => {
    const { name, value } = event.target;
    setCommentForm((current) => ({ ...current, [name]: value }));
  };

  const submitComment = async (event) => {
    event.preventDefault();
    setCommentError("");
    setCommentNotice("");

    const name = commentForm.name.trim();
    const email = commentForm.email.trim();
    const content = commentForm.content.trim();

    if (!name || !email || !content) {
      setCommentError("Name, email aur comment teeno fill karein.");
      return;
    }
    if (content.length > 2000) {
      setCommentError("Comment maximum 2000 characters ka ho sakta hai.");
      return;
    }

    setCommentSubmitting(true);
    try {
      const response = await api.post("/comments", {
        postId: post.id,
        name,
        email,
        content,
      });
      setCommentForm({ name: "", email: "", content: "" });
      setCommentNotice(response?.data?.message || "Thanks! Comment moderation ke baad publish hoga.");
    } catch (err) {
      setCommentError(err?.response?.data?.message || "Comment submit nahi hua. Please dobara try karein.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  useEffect(() => {

    const updateProgress = () => {

      const root = document.documentElement;

      const scrollableHeight = root.scrollHeight - window.innerHeight;

      const value = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;

      setProgress(Math.min(100, Math.max(0, value)));

    };

    updateProgress();

    window.addEventListener("scroll", updateProgress, { passive: true });

    window.addEventListener("resize", updateProgress);

    return () => {

      window.removeEventListener("scroll", updateProgress);

      window.removeEventListener("resize", updateProgress);

    };

  }, [post]);



  const articleContent = useMemo(() => prepareContent(post?.content), [post?.content]);

  const minutes = useMemo(() => readingTime(post?.content), [post?.content]);



  useEffect(() => {
    if (!post) return undefined;

    const previousTitle = document.title;
    document.title = post.seoTitle || post.title || "InfoYug";
    const restorers = [];

    const setMeta = (attribute, key, content) => {
      const selector = `meta[${attribute}="${key}"]`;
      let element = document.head.querySelector(selector);
      const created = !element;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      const previousContent = element.getAttribute("content");
      element.setAttribute("content", content || "");
      restorers.push(() => {
        if (created) element.remove();
        else element.setAttribute("content", previousContent ?? "");
      });
    };

    const setLink = (rel, href) => {
      let element = document.head.querySelector(`link[rel="${rel}"]`);
      const created = !element;
      if (!element) {
        element = document.createElement("link");
        element.rel = rel;
        document.head.appendChild(element);
      }
      const previousHref = element.getAttribute("href");
      element.href = href;
      restorers.push(() => {
        if (created) element.remove();
        else element.setAttribute("href", previousHref || "");
      });
    };

    const title = post.seoTitle || post.title || "InfoYug";
    const description = (
      post.seoDescription || post.excerpt || post.title ||
      "Read the latest articles on InfoYug."
    ).slice(0, 160);
    const canonicalUrl = `${window.location.origin}/post/${encodeURIComponent(post.slug)}`;
    const coverImage = post.coverImageUrl ? imageUrl(post.coverImageUrl) : "";

    // Standard SEO metadata
    setMeta("name", "description", description);
    setMeta("name", "keywords", post.seoKeywords || "");
    setMeta("name", "robots", "index, follow");

    // Open Graph metadata for social sharing
    setMeta("property", "og:type", "article");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:site_name", "InfoYug");
    if (coverImage) setMeta("property", "og:image", coverImage);

    // Twitter/X card metadata
    setMeta("name", "twitter:card", coverImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (coverImage) setMeta("name", "twitter:image", coverImage);

    setLink("canonical", canonicalUrl);

    // Structured data for search engines that support JSON-LD
    let jsonLd = document.getElementById("infoyug-article-jsonld");
    const jsonLdCreated = !jsonLd;
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "infoyug-article-jsonld";
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    const previousJsonLd = jsonLd.textContent;
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      url: canonicalUrl,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
      image: coverImage ? [coverImage] : undefined,
      datePublished: post.publishedAt || undefined,
      dateModified: post.updatedAt || undefined,
      author: {
        "@type": "Person",
        name: post.authorName || "InfoYug Editorial Team",
      },
      publisher: {
        "@type": "Organization",
        name: "InfoYug",
      },
    });

    return () => {
      document.title = previousTitle;
      restorers.reverse().forEach((restore) => restore());
      if (jsonLdCreated) jsonLd.remove();
      else jsonLd.textContent = previousJsonLd || "";
    };
  }, [post]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareText = post?.title || "Read this article on InfoYug";

  const shareTo = (platform) => {

    const url = encodeURIComponent(shareUrl);

    const title = encodeURIComponent(shareText);

    const urls = {

      whatsapp: `https://wa.me/?text=${title}%20${url}`,

      facebook: `https://www\.facebook.com/sharer/sharer.php?u=${url}`,

      linkedin: `https://www\.linkedin.com/sharing/share-offsite/?url=${url}`,

    };

    window.open(urls[platform], "_blank", "noopener,noreferrer,width=650,height=550");

  };



  const copyLink = async () => {

    try {

      await navigator.clipboard.writeText(shareUrl);

      setCopyMessage("Article link copied!");

    } catch {

      setCopyMessage("Link copy nahi hua. Browser permission check karein.");

    }

    window.setTimeout(() => setCopyMessage(""), 2500);

  };



  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });



  const jumpToHeading = (event, headingId) => {

    event.preventDefault();

    const target = document.getElementById(headingId);

    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    window.history.replaceState(null, "", `#${headingId}`);

  };



  if (loading) {

    return <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", bgcolor: "#f7f9f7" }}><Stack sx={{ alignItems: "center" }}  spacing={2}><CircularProgress sx={{ color: "#17684e" }} /><Typography color="text.secondary">Loading InfoYug article...</Typography></Stack></Box>;

  }



  if (error || !post) {

    return (

      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", bgcolor: "#f7f9f7", p: 3 }}>

        <Paper elevation={0} sx={{ maxWidth: 560, width: "100%", p: 4, borderRadius: 4, border: "1px solid #e3eae6", textAlign: "center" }}>

          <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>Article unavailable</Typography>

          <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>{error || "Article nahi mila."}</Alert>

          <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "center" }}  spacing={1}>

            <Button variant="contained" onClick={loadPost} sx={{ bgcolor: "#153d3d" }}>Try again</Button>

            <Button component={Link} to="/" startIcon={<HomeOutlined />}>Back to home</Button>

          </Stack>

        </Paper>

      </Box>

    );

  }



  const articleDate = post.publishedAt || post.createdAt;



  return (

    <Box sx={{ bgcolor: "#f7f9f7", minHeight: "100vh", color: "#173536", width: "100%", minWidth: 0, overflowX: "clip" }}>

      <Box sx={{ position: "fixed", top: 0, left: 0, width: "100%", height: 4, zIndex: 1300, bgcolor: "#dce8e1" }}>

        <Box sx={{ height: "100%", width: `${progress}%`, bgcolor: "#21a36b", transition: "width 100ms linear" }} />

      </Box>



      <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5ece7" }}>

        <Container maxWidth="lg">

          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", py: { xs: 1.25, sm: 2 }, gap: { xs: 1, sm: 2 }, minWidth: 0 }}>

            <Button component={Link} to="/" startIcon={<ArrowBack />} sx={{ color: "#315d52", textTransform: "none", fontWeight: 700, minWidth: 0, px: { xs: 0.5, sm: 1.5 }, fontSize: { xs: 12, sm: 14 }, whiteSpace: "nowrap" }}>Back to InfoYug</Button>

            <Typography component={Link} to="/" sx={{ textDecoration: "none", color: "#153d3d", fontWeight: 950, fontSize: { xs: 21, sm: 26 }, letterSpacing: -1 }}>InfoYug<span style={{ color: "#21a36b" }}>.</span></Typography>

          </Stack>

        </Container>

      </Box>



      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>

        <Breadcrumbs sx={{ mb: 3, fontSize: 13 }}>

          <Link to="/" style={{ color: "#627a74", textDecoration: "none" }}>Home</Link>

          {post.categoryName && <Link to={`/category/${slugify(post.categoryName)}`} style={{ color: "#627a74", textDecoration: "none" }}>{post.categoryName}</Link>}

          <Typography color="text.primary" sx={{ fontSize: 13, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</Typography>

        </Breadcrumbs>



        <Box sx={{ maxWidth: 900, width: "100%", minWidth: 0, mx: "auto" }}>

          <Stack direction="row"  gap={1} sx={{ flexWrap: "wrap",  mb: 2 }}>

            {post.categoryName && <Chip label={post.categoryName} component={Link} clickable to={`/category/${slugify(post.categoryName)}`} sx={{ bgcolor: "#e2f4e9", color: "#17684e", fontWeight: 800, borderRadius: 1.5 }} />}

            {post.tags?.slice(0, 3).map((tag) => <Chip key={tag.id || tag.slug || tag.name} label={tag.name} size="small" variant="outlined" sx={{ borderColor: "#dce7e1", color: "#58716a" }} />)}

          </Stack>

          <Typography component="h1" sx={{ fontSize: { xs: 32, sm: 42, md: 54 }, lineHeight: { xs: 1.2, md: 1.12 }, letterSpacing: { xs: -1, md: -1.8 }, fontWeight: 950, color: "#142e32", mb: 2.5, overflowWrap: "anywhere" }}>{post.title}</Typography>

          {post.excerpt && <Typography sx={{ fontSize: { xs: 17, md: 20 }, lineHeight: 1.8, color: "#617570", mb: 3 }}>{post.excerpt}</Typography>}

          <Stack direction={{ xs: "column", sm: "row" }}   gap={2} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between",  mb: 4 }}>

            <Stack direction="row" sx={{ alignItems: "center" }}  spacing={1.5}>

              <Avatar sx={{ width: 46, height: 46, bgcolor: "#153d3d", fontWeight: 800 }}>{(post.authorName || "I").charAt(0).toUpperCase()}</Avatar>

              <Box><Typography sx={{ fontWeight: 800, color: "#173536" }}>{post.authorName || "InfoYug Editorial Team"}</Typography><Typography variant="body2" sx={{ color: "#748780" }}>InfoYug Contributor</Typography></Box>

            </Stack>

            <Stack direction="row"  gap={{ xs: 1.5, sm: 2 }} sx={{ flexWrap: "wrap",  color: "#6b7e77" }}>

              <Stack direction="row" sx={{ alignItems: "center" }}  spacing={0.6}><CalendarMonth sx={{ fontSize: 18 }} /><Typography variant="body2">{formatDate(articleDate)}</Typography></Stack>

              <Stack direction="row" sx={{ alignItems: "center" }}  spacing={0.6}><AccessTime sx={{ fontSize: 18 }} /><Typography variant="body2">{minutes} min read</Typography></Stack>

              <Stack direction="row" sx={{ alignItems: "center" }}  spacing={0.6}><VisibilityOutlined sx={{ fontSize: 18 }} /><Typography variant="body2">{Number(post.viewCount || 0).toLocaleString("en-IN")} views</Typography></Stack>

            </Stack>

          </Stack>

        </Box>



        <Box sx={{ maxWidth: 1050, mx: "auto", mb: 5 }}><ArticleImage src={post.coverImageUrl} title={post.title} height="auto" /></Box>



        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "250px minmax(0, 1fr)" }, gap: { xs: 2.5, md: 5 }, alignItems: "start", maxWidth: 1100, width: "100%", minWidth: 0, mx: "auto" }}>

          <Box sx={{ position: { md: "sticky" }, top: { md: 28 } }}>

            {articleContent.headings.length > 0 && (

              <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e3eae6", borderRadius: 3, bgcolor: "#fff" }}>

                <Stack direction="row"  spacing={1} sx={{ alignItems: "center",  mb: 2 }}><MenuBook sx={{ color: "#21845e" }} /><Typography sx={{ fontWeight: 900 }}>In this article</Typography></Stack>

                <Stack spacing={1.3}>

                  {articleContent.headings.map((heading) => (

                    <Box

                      key={heading.id}

                      component="a"

                      href={`#${heading.id}`}

                      onClick={(event) => jumpToHeading(event, heading.id)}

                      sx={{ display: "block", pl: heading.level === 3 ? 2 : 0, textDecoration: "none", color: "#637970", fontSize: 14, lineHeight: 1.6, cursor: "pointer", "&:hover": { color: "#17845c" } }}

                    >

                      {heading.title}

                    </Box>

                  ))}

                </Stack>

              </Paper>

            )}



            <Paper elevation={0} sx={{ mt: 2, p: 2.5, border: "1px solid #e3eae6", borderRadius: 3, bgcolor: "#fff" }}>

              <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Share this article</Typography>

              <Stack spacing={1}>

                <Button variant="outlined" startIcon={<ShareOutlined />} onClick={() => shareTo("whatsapp")} sx={{ justifyContent: "flex-start", textTransform: "none", borderColor: "#dce7e1", color: "#315d52" }}>WhatsApp</Button>

                <Button variant="outlined" startIcon={<ShareOutlined />} onClick={() => shareTo("facebook")} sx={{ justifyContent: "flex-start", textTransform: "none", borderColor: "#dce7e1", color: "#315d52" }}>Facebook</Button>

                <Button variant="outlined" startIcon={<ShareOutlined />} onClick={() => shareTo("linkedin")} sx={{ justifyContent: "flex-start", textTransform: "none", borderColor: "#dce7e1", color: "#315d52" }}>LinkedIn</Button>

                <Button variant="contained" startIcon={<ContentCopy />} onClick={copyLink} sx={{ bgcolor: "#153d3d", textTransform: "none", "&:hover": { bgcolor: "#216b58" } }}>Copy link</Button>

                {copyMessage && <Typography variant="caption" color="success.main">{copyMessage}</Typography>}

              </Stack>

            </Paper>

          </Box>



          <Box sx={{ minWidth: 0 }}>

            <Box

              className="infoyug-article-content"

              dangerouslySetInnerHTML={{ __html: articleContent.html }}

              sx={{ color: "#354d49", fontSize: { xs: 17, md: 18 }, lineHeight: 1.95, overflowWrap: "anywhere", "& p": { mb: 2.5 }, "& h1, & h2, & h3": { color: "#142e32", fontWeight: 900, lineHeight: 1.3, letterSpacing: -0.5, scrollMarginTop: "40px" }, "& h1": { fontSize: { xs: 28, md: 36 }, mt: 4, mb: 2 }, "& h2": { fontSize: { xs: 25, md: 31 }, mt: 4, mb: 2 }, "& h3": { fontSize: { xs: 21, md: 25 }, mt: 3, mb: 1.5 }, "& a": { color: "#13845b", textDecoration: "underline", textUnderlineOffset: 3 }, "& ul, & ol": { pl: 3, mb: 3 }, "& li": { mb: 1 }, "& blockquote": { m: 0, my: 3, py: 1, pl: 3, borderLeft: "4px solid #21a36b", color: "#526e64", fontStyle: "italic" }, "& img": { display: "block", maxWidth: "100%", height: "auto", borderRadius: 3, my: 3 }, "& video": { display: "block", width: "100%", maxWidth: "100%", maxHeight: 650, borderRadius: 3, my: 3, bgcolor: "#111" }, "& iframe": { display: "block", width: "100%", aspectRatio: "16 / 9", height: "auto", minHeight: 220, border: 0, borderRadius: 3, my: 3 }, "& figure": { my: 3, mx: 0 }, "& figcaption": { mt: 1, color: "#71837c", fontSize: 13, textAlign: "center" }, "& pre": { maxWidth: "100%", overflowX: "auto", p: 2, bgcolor: "#eaf1ed", borderRadius: 2 }, "& table": { display: "block", width: "100%", overflowX: "auto", borderCollapse: "collapse" }, "& th, & td": { p: 1.2, border: "1px solid #dce7e1", textAlign: "left" }, "& th": { bgcolor: "#edf5ef", fontWeight: 800 }, "& hr": { border: 0, borderTop: "1px solid #e0e9e4", my: 4 } }}

            />



            <Divider sx={{ my: 4, borderColor: "#e0e9e4" }} />

            {post.tags?.length > 0 && <Box sx={{ mb: 3 }}><Typography sx={{ fontWeight: 900, mb: 1.5 }}>Topics</Typography><Stack direction="row" sx={{ flexWrap: "wrap" }}  gap={1}>{post.tags.map((tag) => <Chip key={tag.id || tag.slug || tag.name} label={tag.name} variant="outlined" sx={{ borderColor: "#dce7e1", color: "#42665a" }} />)}</Stack></Box>}



            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid #e0e9e4", borderRadius: 3, bgcolor: "#fff" }}>

              <Stack direction="row" sx={{ alignItems: "center" }}  spacing={2}>

                <Avatar sx={{ width: 58, height: 58, bgcolor: "#153d3d", fontSize: 23, fontWeight: 900 }}>{(post.authorName || "I").charAt(0).toUpperCase()}</Avatar>

                <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">ARTICLE BY</Typography><Typography variant="h6" sx={{ fontWeight: 900 }}>{post.authorName || "InfoYug Editorial Team"}</Typography><Typography variant="body2" sx={{ color: "#71837c" }}>Exploring automobile, technology and everyday life.</Typography></Box>

              </Stack>

            </Paper>

          </Box>

        </Box>



        <Box id="article-comments" sx={{ maxWidth: 1100, mx: "auto", mt: { xs: 5, md: 7 } }}>
          <Divider sx={{ mb: 4, borderColor: "#e0e9e4" }} />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "#eaf5ee", color: "#17684e" }}>
              <Typography sx={{ fontSize: 22, fontWeight: 900 }}>“</Typography>
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 950, letterSpacing: -1 }}>Comments</Typography>
              <Typography variant="body2" sx={{ color: "#71837c" }}>Apni thoughts share karein aur discussion ka hissa banein.</Typography>
            </Box>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.1fr) minmax(300px, .9fr)" }, gap: 3, mt: 3, alignItems: "start" }}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid #e0e9e4", borderRadius: 4, bgcolor: "#fff" }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>Leave a comment</Typography>
              <Typography variant="body2" sx={{ color: "#71837c", mb: 2.5 }}>Email public nahi dikhaya jayega. Comments publish hone se pehle review kiye ja sakte hain.</Typography>
              <Box component="form" onSubmit={submitComment}>
                <Stack spacing={2}>
                  <TextField name="name" label="Your name" value={commentForm.name} onChange={handleCommentChange} required fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
                  <TextField name="email" label="Email address" type="email" value={commentForm.email} onChange={handleCommentChange} required fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
                  <TextField name="content" label="Your comment" value={commentForm.content} onChange={handleCommentChange} required fullWidth multiline minRows={4} slotProps={{ htmlInput: { maxLength: 2000 } }} helperText={`${commentForm.content.length}/2000 characters`} />
                  {commentError && <Alert severity="error">{commentError}</Alert>}
                  {commentNotice && <Alert severity="success">{commentNotice}</Alert>}
                  <Button type="submit" variant="contained" disabled={commentSubmitting} endIcon={commentSubmitting ? <CircularProgress size={18} color="inherit" /> : <Send />} sx={{ alignSelf: "flex-start", px: 3, py: 1.2, bgcolor: "#153d3d", textTransform: "none", fontWeight: 800, "&:hover": { bgcolor: "#216b58" } }}>
                    {commentSubmitting ? "Submitting..." : "Post comment"}
                  </Button>
                </Stack>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid #e0e9e4", borderRadius: 4, bgcolor: "#fff" }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }} spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Reader discussion</Typography>
                <Chip label={comments.length} sx={{ bgcolor: "#eaf5ee", color: "#17684e", fontWeight: 900 }} />
              </Stack>
              {commentsLoading ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 4, justifyContent: "center" }}><CircularProgress size={22} sx={{ color: "#17684e" }} /><Typography color="text.secondary">Loading comments...</Typography></Stack>
              ) : comments.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography sx={{ fontWeight: 800, color: "#315d52" }}>Be the first to comment</Typography>
                  <Typography variant="body2" sx={{ color: "#71837c", mt: 0.7 }}>Abhi koi approved comment nahi hai.</Typography>
                </Box>
              ) : (
                <Stack spacing={2.2} sx={{ mt: 2.5 }}>
                  {comments.map((comment) => (
                    <Box key={comment.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: "#153d3d", fontWeight: 800 }}>{String(comment.name || "R").charAt(0).toUpperCase()}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0, sm: 1 }} sx={{ alignItems: { xs: "flex-start", sm: "baseline" } }}>
                          <Typography sx={{ fontWeight: 900, color: "#173b3b" }}>{comment.name || "Reader"}</Typography>
                          <Typography variant="caption" sx={{ color: "#71837c" }}>{formatDate(comment.createdAt)}</Typography>
                        </Stack>
                        <Typography sx={{ mt: 0.5, color: "#435a53", lineHeight: 1.8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{comment.content}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        </Box>

        {relatedPosts.length > 0 && <Box sx={{ maxWidth: 1100, mx: "auto", mt: { xs: 6, md: 9 } }}>

          <Divider sx={{ mb: 4, borderColor: "#e0e9e4" }} />

          <Stack direction={{ xs: "column", sm: "row" }}   gap={1} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between",  mb: 3 }}>

            <Box><Typography variant="overline" sx={{ color: "#21845e", fontWeight: 900, letterSpacing: 2 }}>KEEP EXPLORING</Typography><Typography variant="h4" sx={{ mt: 0.5, fontWeight: 950, letterSpacing: -1 }}>Related articles</Typography></Box>

            <Button component={Link} to="/" sx={{ textTransform: "none", color: "#17684e" }}>Explore all articles</Button>

          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>

            {relatedPosts.map((item) => <RelatedArticleCard key={item.id} post={item} />)}

          </Box>

        </Box>}



        <Stack direction={{ xs: "column", sm: "row" }}   gap={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" },  maxWidth: 1100, mx: "auto", mt: 5 }}>

          <Button component={Link} to="/" startIcon={<ArrowBack />} sx={{ color: "#315d52", textTransform: "none" }}>Back to all articles</Button>

          <Button variant="outlined" startIcon={<ArrowUpward />} onClick={scrollToTop} sx={{ textTransform: "none", borderColor: "#dce7e1", color: "#315d52" }}>Back to top</Button>

        </Stack>

      </Container>



      <Box sx={{ mt: 5, py: 4, bgcolor: "#102f30", color: "#e5f3ec" }}>

        <Container maxWidth="lg">

          <Typography sx={{ fontWeight: 950, fontSize: 24 }}>InfoYug<span style={{ color: "#5cdb9a" }}>.</span></Typography>

          <Typography variant="body2" sx={{ mt: 1, color: "#b3c9bf", lineHeight: 1.8 }}>Automobile, technology and everyday life — explained simply.</Typography>

          <Typography variant="caption" sx={{ display: "block", mt: 3, color: "#8eaaa0" }}>© {new Date().getFullYear()} InfoYug. All rights reserved.</Typography>

        </Container>

      </Box>

    </Box>

  );

}
