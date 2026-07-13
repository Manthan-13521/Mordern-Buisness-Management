import { getBlogPost, blogPosts } from "@/lib/blogData";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

// Generate static params for all blog posts so they are pre-rendered
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: { params: Promise<any> }) {
  const resolvedParams = await params;
  const post = getBlogPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-white dark:bg-[#020617] min-h-screen text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 isolate pt-32 pb-24">
        <article className="max-w-4xl mx-auto px-6">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          
          <header className="mb-14">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 font-medium border border-blue-200 dark:border-blue-800">
                {post.category}
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              {post.description}
            </p>
          </header>

          <div 
            className="prose prose-lg dark:prose-invert prose-blue max-w-none 
              prose-headings:font-bold prose-headings:tracking-tight
              prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:border prose-img:border-gray-200 dark:prose-img:border-white/10"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
          <hr className="my-12 border-gray-200 dark:border-white/10" />
          
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-8 text-center border border-gray-200 dark:border-white/10">
            <h3 className="text-2xl font-bold mb-4">Ready to implement these best practices?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              AquaSync provides all the tools you need to run your business efficiently. Start your free trial today.
            </p>
            <Link
              href="/select-plan"
              className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              Start Free Trial
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
