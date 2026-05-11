import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { docs, getDocBySlug } from "../../content/registry";

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const index = docs.findIndex((item) => item.slug === doc.slug);
  const previous = docs[index - 1];
  const next = docs[index + 1];
  const Lesson = doc.Component;

  return (
    <article className="lesson">
      <header className="lessonHeader">
        <p className="eyebrow">{doc.kicker}</p>
        <h1>{doc.title}</h1>
        <p>{doc.summary}</p>
        <div className="sourceStrip">
          {doc.sources.map((source) => (
            <code key={source}>{source}</code>
          ))}
        </div>
      </header>
      <div className="lessonBody">
        <Lesson />
      </div>
      <footer className="pager">
        {previous ? (
          <Link href={`/${previous.slug}`}>
            <ArrowLeft size={16} aria-hidden="true" />
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/${next.slug}`}>
            {next.title}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </article>
  );
}
