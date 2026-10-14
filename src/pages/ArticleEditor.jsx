import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  CloudUploadOutlined,
  FormatBold,
  FormatClear,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  HorizontalRule,
  ImageOutlined,
  OndemandVideo,
  VideoLibraryOutlined,
  Link as LinkIcon,
  FormatQuote,
  SaveOutlined,
  Title,
} from "@mui/icons-material";
import api from "../services/api";

const API_ORIGIN = (() => {
  try {
    return new URL(api.defaults.baseURL).origin;
  } catch {
    return "";
  }
})();

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  categoryId: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  tagIds: [],
  isPublished: false,
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normaliseList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function apiImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function editorHtmlForDisplay(html) {
  if (!html || typeof window === "undefined") return html || "";
  const parsed = new DOMParser().parseFromString(String(html), "text/html");
  parsed.body.querySelectorAll("[src]").forEach((element) => {
    const src = element.getAttribute("src") || "";
    if (src.startsWith("/")) element.setAttribute("src", apiImageUrl(src));
  });
  return parsed.body.innerHTML;
}

function htmlForSave(editorElement) {
  if (!editorElement) return "";
  const clone = editorElement.cloneNode(true);
  clone.querySelectorAll("[src]").forEach((element) => {
    const src = element.getAttribute("src") || "";
    if (API_ORIGIN && src.startsWith(`${API_ORIGIN}/`)) {
      element.setAttribute("src", src.slice(API_ORIGIN.length));
    }
  });
  return clone.innerHTML.trim();
}

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const slugTouchedRef = useRef(false);

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoInput, setVideoInput] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [focusKeyword, setFocusKeyword] = useState("");
  const [seoAnalysis, setSeoAnalysis] = useState(null);
  const [seoAnalyzing, setSeoAnalyzing] = useState(false);
  const videoFileInputRef = useRef(null);

  const pageTitle = useMemo(() => (id ? "Edit Article" : "Create Article"), [id]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get("/categories");
      const items = normaliseList(response.data, ["items", "categories", "data"]);
      setCategories(items.filter((item) => item.isActive !== false && item.IsActive !== false));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadArticle = useCallback(async () => {
    if (!id) {
      setLoading(false);
      if (editorRef.current && !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = "<p><br></p>";
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      let response;
      try {
        response = await api.get(`/posts/${encodeURIComponent(id)}/admin`);
      } catch (firstError) {
        // Compatibility fallback for projects that expose the editor endpoint by ID.
        if (firstError?.response?.status !== 404) throw firstError;
        response = await api.get(`/posts/admin/${encodeURIComponent(id)}`);
      }

      const post = response.data?.post ?? response.data?.item ?? response.data;
      setForm({
        title: post.title ?? post.Title ?? "",
        slug: post.slug ?? post.Slug ?? "",
        excerpt: post.excerpt ?? post.Excerpt ?? "",
        content: post.content ?? post.Content ?? "",
        coverImageUrl: post.coverImageUrl ?? post.CoverImageUrl ?? "",
        categoryId: String(post.categoryId ?? post.CategoryId ?? ""),
        seoTitle: post.seoTitle ?? post.SeoTitle ?? "",
        seoDescription: post.seoDescription ?? post.SeoDescription ?? "",
        seoKeywords: post.seoKeywords ?? post.SeoKeywords ?? "",
        tagIds: post.tagIds ?? post.TagIds ?? post.tags?.map((tag) => tag.id) ?? [],
        isPublished: Boolean(post.isPublished ?? post.IsPublished),
      });
      slugTouchedRef.current = true;
      if (editorRef.current) {
        editorRef.current.innerHTML = editorHtmlForDisplay(post.content ?? post.Content ?? "");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "The article could not be loaded. Check the backend GET /api/posts/{id}/admin endpoint and your login token."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  // The editor is not mounted while the loading spinner is visible.
  // Populate its HTML only after the form has rendered, and only when loading/id changes.
  useEffect(() => {
    if (!loading && editorRef.current) {
      editorRef.current.innerHTML = editorHtmlForDisplay(form.content || "<p><br></p>");
    }
  }, [loading, id]);

  const syncContent = () => {
    if (editorRef.current) setField("content", editorRef.current.innerHTML);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
  };

  const runCommand = (command, value = null) => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    syncContent();
  };

  const formatBlock = (tag) => {
    restoreSelection();
    document.execCommand("formatBlock", false, `<${tag}>`);
    saveSelection();
    syncContent();
  };

  const insertHtmlAtCursor = (html) => {
    restoreSelection();
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        editor.insertAdjacentHTML("beforeend", html);
      }
    } else {
      editor.insertAdjacentHTML("beforeend", html);
    }
    saveSelection();
    syncContent();
  };

  const openImageDialog = () => {
    saveSelection();
    setImageUrl("");
    setImageAlt("");
    setImageDialogOpen(true);
  };

  const insertImageFromUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (!/^(https?:\/\/|\/)/i.test(url) || url.startsWith("//")) {
      setError("The image URL must start with http(s) or be a relative path such as /uploads/....");
      return;
    }
    const src = url.startsWith("/") ? apiImageUrl(url) : url;
    insertHtmlAtCursor(
      `<p><img src="${escapeAttribute(src)}" alt="${escapeAttribute(imageAlt)}" loading="lazy" /></p><p><br></p>`
    );
    setImageDialogOpen(false);
    setNotice("The image has been added to the article. Remember to save your changes.");
    setError("");
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError("Sirf JPG, PNG aur WebP images upload kar sakte hain.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The image size must be under 10 MB.");
      return;
    }

    setError("");
    setNotice("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post("/media/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = response.data?.url ?? response.data?.Url;
      if (!url) throw new Error("The image URL was not found in the upload response.");
      insertHtmlAtCursor(
        `<p><img src="${escapeAttribute(apiImageUrl(url))}" alt="${escapeAttribute(file.name.replace(/\.[^.]+$/, ""))}" loading="lazy" /></p><p><br></p>`
      );
      setNotice("The image has been uploaded and added to the article. Remember to save your changes.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "The image could not be uploaded. Check the login token and the POST /api/media/upload endpoint."
      );
    } finally {
      setUploading(false);
    }
  };

  const openLinkDialog = () => {
    saveSelection();
    setLinkUrl("https://");
    setLinkDialogOpen(true);
  };

  const openVideoDialog = () => {
    saveSelection();
    setVideoInput("");
    setVideoTitle("");
    setVideoDialogOpen(true);
    setError("");
  };

  // Converts YouTube/Vimeo URLs or a direct MP4/WebM/Ogg URL into safe article HTML.
  // If an iframe embed snippet is pasted, only its URL is extracted and validated.
  const buildVideoHtml = (input, title = "Article video") => {
    let value = String(input || "").trim();
    if (!value) throw new Error("Paste a YouTube, Vimeo, or direct video URL.");

    if (value.includes("<iframe")) {
      const parsed = new DOMParser().parseFromString(value, "text/html");
      value = parsed.querySelector("iframe")?.getAttribute("src") || "";
      if (!value) throw new Error("No valid iframe src was found in the embed code.");
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(value);
    } catch {
      throw new Error("Paste a valid full video URL starting with https://.");
    }
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      throw new Error("The video URL must start with http:// or https://.");
    }

    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    let embedUrl = "";

    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      let videoId = "";
      if (host === "youtu.be") videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
      else if (parsedUrl.pathname === "/watch") videoId = parsedUrl.searchParams.get("v") || "";
      else {
        const match = parsedUrl.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
        videoId = match?.[1] || "";
      }
      if (!/^[\w-]{11}$/.test(videoId)) throw new Error("Could not find the video ID in the YouTube link. Use a standard video or Shorts link.");
      embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    } else if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = parsedUrl.pathname.match(/(?:video\/)?(\d+)/);
      if (!match) throw new Error("Paste a valid Vimeo video link.");
      embedUrl = `https://player.vimeo.com/video/${match[1]}`;
    }

    const safeTitle = escapeAttribute(title.trim() || "Article video");
    if (embedUrl) {
      return `<figure class="infoyug-video"><iframe src="${escapeAttribute(embedUrl)}" title="${safeTitle}" width="100%" height="450" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><figcaption>${safeTitle}</figcaption></figure><p><br></p>`;
    }

    if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash)) {
      const extension = parsedUrl.pathname.split(".").pop().toLowerCase();
      const mime = extension === "mp4" ? "video/mp4" : extension === "webm" ? "video/webm" : "video/ogg";
      return `<figure class="infoyug-video"><video controls playsinline preload="metadata" style="width:100%;max-width:100%;"><source src="${escapeAttribute(parsedUrl.href)}" type="${mime}">Your browser does not support the video tag.</video><figcaption>${safeTitle}</figcaption></figure><p><br></p>`;
    }

    throw new Error("Use a YouTube, Vimeo, or direct .mp4/.webm/.ogg link. A regular webpage URL cannot be embedded as a video.");
  };

  const insertVideoFromUrl = () => {
    try {
      insertHtmlAtCursor(buildVideoHtml(videoInput, videoTitle));
      setVideoDialogOpen(false);
      setNotice("The video has been added to the article. Remember to save your changes.");
      setError("");
    } catch (err) {
      setError(err.message || "The video could not be added.");
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = { "video/mp4": [".mp4"], "video/webm": [".webm"], "video/ogg": [".ogv", ".ogg"] };
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowed[file.type]?.includes(extension)) {
      setError("Only MP4, WebM, and Ogg videos can be uploaded.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("The video size must be under 100 MB.");
      return;
    }

    setError("");
    setNotice("");
    setVideoUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post("/media/upload-video", body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });
      const url = response.data?.url ?? response.data?.Url;
      if (!url) throw new Error("The video URL was not found in the upload response.");
      const fullUrl = apiImageUrl(url);
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const mime = ext === ".mp4" ? "video/mp4" : ext === ".webm" ? "video/webm" : "video/ogg";
      insertHtmlAtCursor(`<figure class="infoyug-video"><video controls playsinline preload="metadata" style="width:100%;max-width:100%;"><source src="${escapeAttribute(fullUrl)}" type="${mime}">Your browser does not support the video tag.</video><figcaption>${escapeAttribute(file.name.replace(/\.[^.]+$/, ""))}</figcaption></figure><p><br></p>`);
      setNotice("The video has been uploaded and added to the article. Remember to save your changes.");
      setVideoDialogOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Video upload failed. Check the backend POST /api/media/upload-video endpoint.");
    } finally {
      setVideoUploading(false);
    }
  };

  const runSeoAnalysis = async () => {
    setError("");
    setNotice("");
    setSeoAnalyzing(true);
    try {
      const payload = {
        postId: id && /^\d+$/.test(String(id)) ? Number(id) : null,
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        content: htmlForSave(editorRef.current),
        coverImageUrl: form.coverImageUrl,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        seoKeywords: form.seoKeywords,
        focusKeyword: focusKeyword.trim(),
      };
      const response = await api.post("/seo/analyze", payload);
      setSeoAnalysis(response.data);
      setNotice("SEO analysis completed. Review the suggestions before publishing.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.title ||
          "SEO analysis failed. Confirm the backend SEO controller and database setup are installed."
      );
    } finally {
      setSeoAnalyzing(false);
    }
  };

  const applySuggestedSeoTitle = () => {
    if (!seoAnalysis?.suggestedSeoTitle) return;
    setField("seoTitle", seoAnalysis.suggestedSeoTitle);
    setSeoAnalysis(null);
  };

  const applySuggestedSeoDescription = () => {
    if (!seoAnalysis?.suggestedSeoDescription) return;
    setField("seoDescription", seoAnalysis.suggestedSeoDescription);
    setSeoAnalysis(null);
  };

  const insertLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError("The link must start with http:// or https://.");
      return;
    }
    restoreSelection();
    document.execCommand("createLink", false, url);
    syncContent();
    setLinkDialogOpen(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const title = form.title.trim();
    const slug = slugify(form.slug || form.title);
    const categoryId = Number(form.categoryId);
    const content = htmlForSave(editorRef.current);

    if (!title) return setError("An article title is required.");
    if (!slug) return setError("A slug is required. Try using English letters and numbers in the title.");
    if (!categoryId) return setError("Select a category.");
    if (!content || !editorRef.current?.innerText?.trim()) {
      return setError("Add article content.");
    }

    const payload = {
      title,
      slug,
      excerpt: form.excerpt.trim(),
      content,
      coverImageUrl: form.coverImageUrl.trim(),
      categoryId,
      seoTitle: form.seoTitle.trim() || title,
      seoDescription: form.seoDescription.trim() || form.excerpt.trim(),
      seoKeywords: form.seoKeywords.trim(),
      tagIds: Array.isArray(form.tagIds) ? form.tagIds.map(Number).filter((value) => value > 0) : [],
      isPublished: Boolean(form.isPublished),
    };

    setSaving(true);
    try {
      if (id) {
        await api.put(`/posts/${encodeURIComponent(id)}`, payload);
        setNotice("The article was updated successfully.");
      } else {
        await api.post("/posts", payload);
        setNotice("The article was created successfully.");
      }
      navigate("/admin/articles", { replace: true });
    } catch (err) {
      const validationErrors = err?.response?.data?.errors;
      const validationText = validationErrors
        ? Object.values(validationErrors).flat().join(" ")
        : "";
      setError(
        validationText ||
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "The article could not be saved. Check the category, slug, login, and backend response."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1180, mx: "auto", p: { xs: 2, md: 4 }, color: "#173536" }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Button component={Link} to="/admin/articles" startIcon={<ArrowBack />} sx={{ mb: 1, textTransform: "none" }}>
            Back to articles
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{pageTitle}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Write your article using H2/H3 headings, text formatting, and multiple inline images.
          </Typography>
        </Box>
        <Button form="article-editor-form" type="submit" variant="contained" startIcon={<SaveOutlined />} disabled={saving || uploading || videoUploading} sx={{ bgcolor: "#17684e", fontWeight: 800, px: 3, py: 1.2, "&:hover": { bgcolor: "#12543f" } }}>
          {saving ? "Saving..." : form.isPublished ? "Save & Publish" : "Save Draft"}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Box component="form" id="article-editor-form" onSubmit={handleSave}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 320px" }, gap: 3, alignItems: "start" }}>
          <Stack spacing={3}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: "1px solid #e0e9e4", borderRadius: 3 }}>
              <TextField label="Article Title" fullWidth required value={form.title} onChange={(event) => {
                const title = event.target.value;
                setForm((current) => ({ ...current, title, ...(slugTouchedRef.current ? {} : { slug: slugify(title) }) }));
              }} sx={{ mb: 2.5 }} />
              <TextField label="URL Slug" fullWidth required value={form.slug} onChange={(event) => {
                slugTouchedRef.current = true;
                setField("slug", slugify(event.target.value));
              }} helperText="Example: krishna-aradhya-love-story" sx={{ mb: 2.5 }} />
              <TextField label="Short Excerpt" fullWidth multiline minRows={2} value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} helperText="Article ka short summary" />
            </Paper>

            <Paper elevation={0} sx={{ border: "1px solid #e0e9e4", borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ p: 2, bgcolor: "#f6faf7", borderBottom: "1px solid #e0e9e4" }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Article Content</Typography>
                <Typography variant="body2" color="text.secondary">Place the cursor where you want the formatting, image, or video to be inserted.</Typography>
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ p: 1.2, borderBottom: "1px solid #e0e9e4", bgcolor: "#fff" }}>
                <Tooltip title="Paragraph"><Button size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("p")} startIcon={<Title />} sx={{ textTransform: "none" }}>Paragraph</Button></Tooltip>
                <Tooltip title="Heading 2"><Button size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("h2")} sx={{ fontWeight: 900, textTransform: "none" }}>H2</Button></Tooltip>
                <Tooltip title="Heading 3"><Button size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("h3")} sx={{ fontWeight: 900, textTransform: "none" }}>H3</Button></Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Tooltip title="Bold"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("bold")}><FormatBold /></IconButton></Tooltip>
                <Tooltip title="Italic"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("italic")}><FormatItalic /></IconButton></Tooltip>
                <Tooltip title="Underline"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("underline")}><FormatUnderlined /></IconButton></Tooltip>
                <Tooltip title="Bulleted list"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertUnorderedList")}><FormatListBulleted /></IconButton></Tooltip>
                <Tooltip title="Numbered list"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertOrderedList")}><FormatListNumbered /></IconButton></Tooltip>
                <Tooltip title="Quote"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => formatBlock("blockquote")}><FormatQuote /></IconButton></Tooltip>
                <Tooltip title="Insert link"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={openLinkDialog}><LinkIcon /></IconButton></Tooltip>
                <Tooltip title="Horizontal line"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertHorizontalRule")}><HorizontalRule /></IconButton></Tooltip>
                <Tooltip title="Clear formatting"><IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("removeFormat")}><FormatClear /></IconButton></Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Button size="small" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={openImageDialog} startIcon={<ImageOutlined />} sx={{ textTransform: "none" }}>Image URL</Button>
                <Button size="small" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => fileInputRef.current?.click()} startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadOutlined />} disabled={uploading || videoUploading} sx={{ textTransform: "none" }}>{uploading ? "Uploading" : "Upload image"}</Button>
                <Button size="small" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={openVideoDialog} startIcon={<OndemandVideo />} sx={{ textTransform: "none" }}>YouTube / Video URL</Button>
                <Button size="small" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={() => videoFileInputRef.current?.click()} startIcon={videoUploading ? <CircularProgress size={16} /> : <VideoLibraryOutlined />} disabled={uploading || videoUploading} sx={{ textTransform: "none" }}>{videoUploading ? "Uploading video" : "Upload video"}</Button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleImageUpload} />
                <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogv,.ogg" hidden onChange={handleVideoUpload} />
              </Stack>

              <Box
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Article content editor"
                aria-multiline="true"
                onInput={syncContent}
                onKeyUp={saveSelection}
                onMouseUp={saveSelection}
                onBlur={syncContent}
                sx={{
                  minHeight: 480,
                  p: { xs: 2, md: 3 },
                  outline: "none",
                  fontSize: 17,
                  lineHeight: 1.9,
                  color: "#354d49",
                  overflowWrap: "anywhere",
                  "&:empty:before": { content: '"Article yahan likhna shuru karein..."', color: "#9aa9a2", pointerEvents: "none" },
                  "& p": { my: 1.5 },
                  "& h2": { mt: 4, mb: 1.5, fontSize: { xs: 24, md: 30 }, lineHeight: 1.3, color: "#142e32", fontWeight: 900 },
                  "& h3": { mt: 3, mb: 1.2, fontSize: { xs: 21, md: 25 }, lineHeight: 1.35, color: "#142e32", fontWeight: 850 },
                  "& img": { display: "block", maxWidth: "100%", height: "auto", maxHeight: 650, objectFit: "contain", borderRadius: 2, my: 2 },
                  "& video": { display: "block", width: "100%", maxWidth: "100%", maxHeight: 600, borderRadius: 2, my: 2, bgcolor: "#111" },
                  "& iframe": { display: "block", width: "100%", maxWidth: "100%", aspectRatio: "16 / 9", height: "auto", minHeight: 220, border: 0, borderRadius: 2, my: 2 },
                  "& figure": { my: 3, mx: 0 },
                  "& figcaption": { mt: 1, color: "#71837c", fontSize: 13, textAlign: "center" },
                  "& blockquote": { borderLeft: "4px solid #21a36b", pl: 2, ml: 0, color: "#637970", fontStyle: "italic" },
                  "& ul, & ol": { pl: 4 },
                  "& a": { color: "#13845b", textDecoration: "underline" },
                  "& hr": { border: 0, borderTop: "1px solid #dce7e1", my: 3 },
                }}
              />
              <Box sx={{ px: 2, py: 1, bgcolor: "#f6faf7", borderTop: "1px solid #e0e9e4" }}>
                <Typography variant="caption" color="text.secondary">H2/H3 headings will appear in the sidebar. Images: JPG/PNG/WebP, max 10 MB. Videos: MP4/WebM/Ogg, max 100 MB. You can also add YouTube/Vimeo URLs or direct video URLs.</Typography>
              </Box>
            </Paper>
          </Stack>

          <Stack spacing={3}>
            <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e9e4", borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 900, mb: 2 }}>Publish Settings</Typography>
              <TextField select label="Category" fullWidth required value={form.categoryId} onChange={(event) => setField("categoryId", event.target.value)} sx={{ mb: 2 }}>
                {categories.map((category) => {
                  const categoryId = category.id ?? category.Id;
                  return <MenuItem key={categoryId} value={String(categoryId)}>{category.name ?? category.Name}</MenuItem>;
                })}
              </TextField>
              {categories.length === 0 && <Alert severity="warning" sx={{ mb: 2 }}>Categories could not be loaded. Check the backend GET /api/categories endpoint.</Alert>}
              <FormControlLabel control={<Checkbox checked={form.isPublished} onChange={(event) => setField("isPublished", event.target.checked)} />} label={form.isPublished ? "Published" : "Save as draft"} />
              <Typography variant="caption" display="block" color="text.secondary">Publish checkbox on hone par article public website par dikhega.</Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e9e4", borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 900, mb: 2 }}>Featured Image</Typography>
              <TextField label="Cover image URL" fullWidth value={form.coverImageUrl} onChange={(event) => setField("coverImageUrl", event.target.value)} placeholder="https://example.com/cover.jpg" helperText="Paste a URL for the cover image. Add inline images using the toolbar." />
              {form.coverImageUrl && <Box component="img" src={apiImageUrl(form.coverImageUrl)} alt="Cover preview" onError={(event) => { event.currentTarget.style.display = "none"; }} sx={{ mt: 2, width: "100%", maxHeight: 190, objectFit: "cover", borderRadius: 2 }} />}
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e9e4", borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 900, mb: 2 }}>SEO Assistant</Typography>
              <Stack spacing={2}>
                <TextField label="SEO Title" fullWidth value={form.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} inputProps={{ maxLength: 70 }} helperText={`${form.seoTitle.length}/70 characters; aim for 30–60.`} />
                <TextField label="Meta Description" fullWidth multiline minRows={3} value={form.seoDescription} onChange={(event) => setField("seoDescription", event.target.value)} inputProps={{ maxLength: 160 }} helperText={`${form.seoDescription.length}/160 characters; aim for 120–160.`} />
                <TextField label="SEO Keywords" fullWidth multiline minRows={2} value={form.seoKeywords} onChange={(event) => setField("seoKeywords", event.target.value)} placeholder="automobile news, technology, daily life" />
                <TextField label="Focus Keyword" fullWidth value={focusKeyword} onChange={(event) => { setFocusKeyword(event.target.value); setSeoAnalysis(null); }} placeholder="e.g. electric cars in India" helperText="The main search phrase this article should target." />
                <Button variant="contained" onClick={runSeoAnalysis} disabled={seoAnalyzing || saving || uploading || videoUploading} sx={{ bgcolor: "#17684e", fontWeight: 800, "&:hover": { bgcolor: "#12543f" } }}>
                  {seoAnalyzing ? "Analyzing SEO…" : "Analyze SEO"}
                </Button>
                {seoAnalyzing && <LinearProgress />}
                {seoAnalysis && (
                  <Box sx={{ border: "1px solid #dce7e1", borderRadius: 2, p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>{seoAnalysis.score}/100</Typography>
                        <Typography variant="body2" color="text.secondary">SEO score · {seoAnalysis.grade}</Typography>
                      </Box>
                      <Button size="small" onClick={() => api.get(`/seo/history${id && /^\d+$/.test(String(id)) ? `?postId=${id}` : ""}`).then((response) => setSeoAnalysis((current) => ({ ...current, history: response.data?.items || [] }))).catch((err) => setError(err?.response?.data?.message || "Could not load SEO history."))}>History</Button>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, Number(seoAnalysis.score) || 0))} sx={{ mt: 1.5, mb: 2, height: 8, borderRadius: 5 }} />
                    <Stack spacing={1.25}>
                      {(seoAnalysis.checks || []).map((check) => (
                        <Box key={check.key}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {check.status === "good" ? "✓" : check.status === "warning" ? "!" : "×"} {check.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{check.message}</Typography>
                        </Box>
                      ))}
                    </Stack>
                    {seoAnalysis.suggestions?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontWeight: 900, mb: 1 }}>Recommended improvements</Typography>
                        <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, mt: 0 }}>
                          {seoAnalysis.suggestions.map((suggestion, index) => <Typography component="li" variant="body2" key={`${index}-${suggestion}`}>{suggestion}</Typography>)}
                        </Stack>
                      </Box>
                    )}
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {seoAnalysis.suggestedSeoTitle && <Button size="small" variant="outlined" onClick={applySuggestedSeoTitle}>Apply suggested SEO title</Button>}
                      {seoAnalysis.suggestedSeoDescription && <Button size="small" variant="outlined" onClick={applySuggestedSeoDescription}>Apply suggested meta description</Button>}
                    </Stack>
                    {seoAnalysis.history && (
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontWeight: 900, mb: 1 }}>Recent SEO checks</Typography>
                        {seoAnalysis.history.length === 0 ? <Typography variant="body2" color="text.secondary">No saved checks found.</Typography> : seoAnalysis.history.map((item) => <Typography variant="body2" key={item.id}>{item.score}/100 · {new Date(item.createdAt).toLocaleString()}</Typography>)}
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Paper>

            <Button type="submit" form="article-editor-form" variant="contained" startIcon={<SaveOutlined />} disabled={saving || uploading || videoUploading} sx={{ py: 1.4, bgcolor: "#17684e", fontWeight: 900, "&:hover": { bgcolor: "#12543f" } }}>
              {saving ? "Saving..." : form.isPublished ? "Save & Publish" : "Save Draft"}
            </Button>
          </Stack>
        </Box>
      </Box>

      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Insert image using URL</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Image URL" fullWidth value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/image.jpg" />
            <TextField label="Alt text (SEO/accessibility)" fullWidth value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertImageFromUrl} variant="contained">Insert image</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add video to article</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">Paste a YouTube/Vimeo link, a direct MP4/WebM/Ogg URL, or iframe embed code from a trusted provider. Only a supported video URL will be used from the embed code.</Alert>
            <TextField autoFocus label="Video URL or embed code" fullWidth multiline minRows={2} value={videoInput} onChange={(event) => setVideoInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX" />
            <TextField label="Video caption (optional)" fullWidth value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Watch the video" />
            <Button variant="outlined" startIcon={<VideoLibraryOutlined />} onClick={() => { setVideoDialogOpen(false); videoFileInputRef.current?.click(); }} disabled={videoUploading}>Or upload video from computer (MP4/WebM/Ogg, max 100 MB)</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertVideoFromUrl} variant="contained">Insert video</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Insert link</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Link URL" fullWidth value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertLink} variant="contained">Add link</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
