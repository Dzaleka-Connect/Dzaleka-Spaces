import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHelpArticle, HELP_ARTICLES } from "@/lib/help-articles";

interface HelpArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: HelpArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  return {
    title: article ? `${article.title} — Help` : "Article not found",
    description: article?.summary,
  };
}

export default async function HelpArticlePage({
  params,
}: HelpArticlePageProps) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/help" className="hover:underline">
            Help centre
          </Link>{" "}
          / {article.title}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {article.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{article.summary}</p>
      </div>

      <div className="flex flex-col gap-6">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 border-t pt-6 text-sm">
        {HELP_ARTICLES.filter((a) => a.slug !== article.slug)
          .slice(0, 3)
          .map((a) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {a.title}
            </Link>
          ))}
      </div>
    </div>
  );
}
