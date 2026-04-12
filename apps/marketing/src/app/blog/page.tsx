import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Antellion",
  description:
    "Insights on AI employer visibility, candidate discovery, and how AI is reshaping the way talent evaluates where to work.",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = getBlogPosts();

  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          Research and analysis on AI employer visibility.
        </p>

        <div className="mt-14 space-y-10">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                <time
                  dateTime={post.date}
                  className="text-sm font-medium text-gray-400"
                >
                  {formatDate(post.date)}
                </time>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-gray-600">
                  {post.description}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
