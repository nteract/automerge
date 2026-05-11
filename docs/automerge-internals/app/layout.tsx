import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, GitFork, Network } from "lucide-react";
import "./globals.css";
import { docs } from "../content/registry";

export const metadata: Metadata = {
  title: "Automerge Internals Explorer",
  description:
    "A local MDX learning lab for Automerge internals, source tours, and desktop sync panic reductions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sideRail" aria-label="Automerge internals navigation">
            <Link href="/" className="brand">
              <span className="brandMark">
                <Network size={22} aria-hidden="true" />
              </span>
              <span>
                <strong>Automerge Lab</strong>
                <small>desktop-patches</small>
              </span>
            </Link>
            <nav className="navList">
              {docs.map((doc) => (
                <Link key={doc.slug} href={`/${doc.slug}`}>
                  <span>{doc.kicker}</span>
                  {doc.title}
                </Link>
              ))}
            </nav>
            <div className="sideNote">
              <BookOpenCheck size={18} aria-hidden="true" />
              <p>Read a concept, inspect the source trail, then answer the check.</p>
            </div>
            <a
              className="repoLink"
              href="https://github.com/nteract/automerge/tree/desktop-patches"
            >
              <GitFork size={16} aria-hidden="true" />
              nteract/automerge
            </a>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
