"use client";

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { blogPosts } from "@/lib/blogData";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export default function BlogIndex() {
  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 isolate pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Resources & Insights
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Expert guides and best practices to help you scale your swimming pool, hostel, or retail business with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article 
                key={post.slug} 
                className="group relative flex flex-col items-start justify-between bg-gray-50 dark:bg-white/5 rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center gap-x-4 text-xs mb-6">
                  <time dateTime={post.date} className="text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                  <span className="relative z-10 rounded-full bg-gray-200 dark:bg-white/10 px-3 py-1.5 font-medium text-gray-600 dark:text-gray-300">
                    {post.category}
                  </span>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-xl font-bold leading-6 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {post.description}
                  </p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4 w-full justify-between">
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      <span className="absolute inset-0" />
                      {post.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
