import Link from "next/link";
import {
  ArrowRight,
  Binary,
  Braces,
  Cpu,
  FileWarning,
  GitBranch,
  Route,
  ShieldAlert,
} from "lucide-react";
import { docs, patchTimeline } from "../content/registry";

const icons = [Braces, GitBranch, Cpu, Binary, ShieldAlert, FileWarning, Route];

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Local-first code archaeology</p>
          <h1>Learn Automerge from the inside out.</h1>
          <p>
            A source-guided MDX explorer for the Rust core, the sync protocol,
            and the nteract desktop panic reductions currently staged on
            <code>desktop-patches</code>.
          </p>
        </div>
        <div className="heroPanel" aria-label="Learning loop">
          <div>
            <span>01</span>
            Build the model
          </div>
          <div>
            <span>02</span>
            Follow the source
          </div>
          <div>
            <span>03</span>
            Re-run the bug
          </div>
          <div>
            <span>04</span>
            Test yourself
          </div>
        </div>
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Start anywhere</p>
        <h2>Explorer tracks</h2>
      </section>

      <div className="docGrid">
        {docs.map((doc, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Link href={`/${doc.slug}`} className="docCard" key={doc.slug}>
              <div className="docCardTop">
                <Icon size={22} aria-hidden="true" />
                <span>{doc.level}</span>
              </div>
              <p>{doc.kicker}</p>
              <h3>{doc.title}</h3>
              <span className="docSummary">{doc.summary}</span>
              <span className="cardCta">
                Open lesson <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="timelineBand">
        <div className="sectionHeader">
          <p className="eyebrow">Provisional patch bundle</p>
          <h2>Bug lab timeline</h2>
        </div>
        <div className="timeline">
          {patchTimeline.map((item) => (
            <div key={item.commit} className="timelineItem">
              <span>{item.commit}</span>
              <h3>{item.title}</h3>
              <p>{item.result}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
