import type { ComponentType } from "react";
import MentalModel from "./mental-model.mdx";
import SourceMap from "./source-map.mdx";
import DataStructures from "./data-structures.mdx";
import SyncProtocol from "./sync-protocol.mdx";
import PatchLogs from "./patch-logs.mdx";
import BugLab from "./bug-lab.mdx";
import DesktopLifecycle from "./desktop-lifecycle.mdx";

export type DocEntry = {
  slug: string;
  title: string;
  kicker: string;
  level: string;
  summary: string;
  sources: string[];
  Component: ComponentType;
};

export const docs: DocEntry[] = [
  {
    slug: "mental-model",
    title: "CRDT Objects, Ops, Actors, Heads",
    kicker: "Concept primer",
    level: "Start",
    summary:
      "Build the vocabulary Automerge uses internally before reading the patch stack.",
    sources: ["rust/automerge/src/types.rs", "rust/automerge/src/op_set2"],
    Component: MentalModel,
  },
  {
    slug: "source-map",
    title: "A Guided Map Of The Rust Core",
    kicker: "Code tour",
    level: "Map",
    summary:
      "Know where changes enter, where they become ops, and where storage rebuilds state.",
    sources: ["rust/automerge/src/automerge.rs", "rust/automerge/src/storage"],
    Component: SourceMap,
  },
  {
    slug: "data-structures",
    title: "Data Structures And Algorithms",
    kicker: "Mechanics",
    level: "Play",
    summary:
      "Interact with Bloom filters, change graph closure, and sequence-key reachability.",
    sources: [
      "rust/automerge/src/sync/bloom.rs",
      "rust/automerge/src/change_graph.rs",
      "rust/automerge/src/op_set2/change/batch.rs",
    ],
    Component: DataStructures,
  },
  {
    slug: "sync-protocol",
    title: "Sync State Is Per Peer",
    kicker: "Protocol",
    level: "Core",
    summary:
      "Trace heads, need, have, bloom filters, sent hashes, read-only peers, and reset semantics.",
    sources: ["rust/automerge/src/sync.rs", "rust/automerge/src/sync/state.rs"],
    Component: SyncProtocol,
  },
  {
    slug: "patch-logs",
    title: "Patch Logs And Materialized Views",
    kicker: "Boundary",
    level: "Sharp",
    summary:
      "Understand why a patch log belongs to one document actor table and why mismatch became a returned error.",
    sources: ["rust/automerge/src/patches/patch_log.rs", "rust/automerge/src/autocommit.rs"],
    Component: PatchLogs,
  },
  {
    slug: "bug-lab",
    title: "Desktop Panic Reduction Lab",
    kicker: "Bug lab",
    level: "Reductions",
    summary:
      "Explore the provisional desktop-patches reductions and learn what each error means at a peer boundary.",
    sources: ["rust/automerge/tests/test.rs", "rust/automerge/src/storage/document.rs"],
    Component: BugLab,
  },
  {
    slug: "desktop-lifecycle",
    title: "Peer Close, Reconnect, And Recovery Policy",
    kicker: "nteract",
    level: "Applied",
    summary:
      "Connect Automerge rules to daemon hubs, short-lived peers, runtime agents, and corruption concerns.",
    sources: [".context/nteract-coordination.md"],
    Component: DesktopLifecycle,
  },
];

export const patchTimeline = [
  {
    commit: "4d2f40d",
    title: "AutoCommit patch log mismatch",
    result: "Returned PatchLogMismatch instead of unwrapping transaction setup.",
  },
  {
    commit: "6c93f0e",
    title: "Unknown actor in batch apply",
    result: "Preflight import against the post-change actor table before mutation.",
  },
  {
    commit: "ce63175",
    title: "Unknown object in batch apply",
    result: "Rejected missing object targets as InvalidObjId without partial history.",
  },
  {
    commit: "30f8c74",
    title: "Sequence gaps",
    result: "Rejected forward actor sequence gaps before update_history assertions.",
  },
  {
    commit: "567113d",
    title: "Op counter overflow",
    result: "Validated inbound and local op counters before OpId construction.",
  },
  {
    commit: "d42157b",
    title: "Marks on non-text objects",
    result: "Rejected malformed mark ops before hydrate could see invalid state.",
  },
  {
    commit: "cd7b8c9",
    title: "Document dep indexes",
    result: "Validated saved-document dependency indexes during reconstruction.",
  },
  {
    commit: "c0ac445",
    title: "Duplicate document op ids",
    result: "Turned collector assertions into typed invalid-change errors.",
  },
  {
    commit: "0a314d0",
    title: "Invalid extra bytes metadata",
    result: "Checked extra-byte metadata ranges before slicing document columns.",
  },
  {
    commit: "b0e1c1a",
    title: "Unverified heads",
    result: "Derived in-memory heads so unverified loads remain saveable.",
  },
  {
    commit: "9c62368",
    title: "Bundle metadata",
    result: "Rejected malformed bundle metadata instead of panicking while unbundling.",
  },
  {
    commit: "2869377",
    title: "Missing sequence insert keys",
    result: "Rejected orphan list insert references as InvalidSeqKey.",
  },
  {
    commit: "eb8ffc2",
    title: "Dangling sequence update keys",
    result: "Rejected list update/delete references to missing elements.",
  },
  {
    commit: "345f172",
    title: "Stale sync need hashes",
    result: "Ignored need hashes that are already satisfied by current local state.",
  },
];

export function getDocBySlug(slug: string) {
  return docs.find((doc) => doc.slug === slug);
}
