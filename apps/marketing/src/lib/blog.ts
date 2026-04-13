import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
  tags?: string[];
  status: string;
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function isPublishable(post: BlogPost): boolean {
  return post.status !== "draft" && new Date(post.date) <= new Date();
}

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => parseBlogFile(filename))
    .filter((p): p is BlogPost => p !== null)
    .filter(isPublishable)
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getBlogPost(slug: string): BlogPost | null {
  const filepath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  const post = parseBlogFile(`${slug}.md`);
  if (!post || !isPublishable(post)) return null;
  return post;
}

function parseBlogFile(filename: string): BlogPost | null {
  const filepath = path.join(BLOG_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);

  if (!data.title || !data.description || !data.date || !data.author) {
    return null;
  }

  return {
    slug: filename.replace(/\.md$/, ""),
    title: data.title,
    description: data.description,
    date: data.date,
    author: data.author,
    image: data.image,
    tags: data.tags,
    status: (data.status as string) ?? "ready",
    content,
  };
}
