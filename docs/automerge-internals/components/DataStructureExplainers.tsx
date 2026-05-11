"use client";

import { useMemo, useState } from "react";

function hashText(value: string, seed: number) {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function probesFor(value: string, bitCount: number, probeCount: number) {
  const x = hashText(value, 0x9e3779b9) % bitCount;
  let y = hashText(value, 0x85ebca6b) % bitCount;
  const z = hashText(value, 0xc2b2ae35) % bitCount;
  const probes = [x];
  let current = x;
  for (let index = 1; index < probeCount; index += 1) {
    current = (current + y) % bitCount;
    y = (y + z) % bitCount;
    probes.push(current);
  }
  return probes;
}

export function BloomFilterExplainer() {
  const [rawItems, setRawItems] = useState("a1, b7, c3");
  const [query, setQuery] = useState("d9");
  const [bitCount, setBitCount] = useState(32);
  const [probeCount, setProbeCount] = useState(4);

  const items = useMemo(
    () =>
      rawItems
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [rawItems],
  );
  const itemProbes = useMemo(
    () => items.map((item) => ({ item, probes: probesFor(item, bitCount, probeCount) })),
    [items, bitCount, probeCount],
  );
  const queryProbes = useMemo(
    () => probesFor(query.trim() || "empty", bitCount, probeCount),
    [query, bitCount, probeCount],
  );
  const setBits = useMemo(() => {
    const bits = new Set<number>();
    for (const entry of itemProbes) {
      for (const probe of entry.probes) bits.add(probe);
    }
    return bits;
  }, [itemProbes]);
  const maybePresent = queryProbes.every((probe) => setBits.has(probe));
  const definitelyPresent = items.includes(query.trim());

  return (
    <section className="explainer">
      <div>
        <p className="eyebrow">Interactive explainer</p>
        <h3>Bloom filter membership</h3>
        <p>
          Automerge sync uses Bloom filters inside <code>Have</code> summaries.
          A missing bit proves the peer does not have a change. All bits set
          means maybe, because unrelated hashes can collide.
        </p>
      </div>
      <div className="controlsGrid">
        <label>
          Changes already present
          <input value={rawItems} onChange={(event) => setRawItems(event.target.value)} />
        </label>
        <label>
          Query change hash
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Bit array size: {bitCount}
          <input
            max="64"
            min="16"
            onChange={(event) => setBitCount(Number(event.target.value))}
            type="range"
            value={bitCount}
          />
        </label>
        <label>
          Probe count: {probeCount}
          <input
            max="7"
            min="2"
            onChange={(event) => setProbeCount(Number(event.target.value))}
            type="range"
            value={probeCount}
          />
        </label>
      </div>
      <div className="bitGrid" style={{ gridTemplateColumns: `repeat(${Math.min(bitCount, 16)}, 1fr)` }}>
        {Array.from({ length: bitCount }, (_, index) => {
          const isSet = setBits.has(index);
          const isProbe = queryProbes.includes(index);
          return (
            <span
              className="bitCell"
              data-probe={isProbe}
              data-set={isSet}
              key={index}
              title={`bit ${index}`}
            >
              {index}
            </span>
          );
        })}
      </div>
      <div className="resultPanel" data-state={maybePresent ? "maybe" : "no"}>
        <strong>{maybePresent ? "Maybe present" : "Definitely absent"}</strong>
        <p>
          Query probes: {queryProbes.join(", ")}.{" "}
          {definitelyPresent
            ? "This query is one of the inserted values."
            : maybePresent
              ? "This is a possible false positive; all query bits were already set."
              : "At least one query bit is unset, so the peer cannot have this change."}
        </p>
      </div>
      <div className="miniList">
        {itemProbes.map((entry) => (
          <span key={entry.item}>
            <code>{entry.item}</code> {"->"} {entry.probes.join(", ")}
          </span>
        ))}
      </div>
    </section>
  );
}

const graphNodes = [
  { id: "A", deps: [] },
  { id: "B", deps: ["A"] },
  { id: "C", deps: ["A"] },
  { id: "D", deps: ["B", "C"] },
  { id: "E", deps: ["D"] },
];

function closure(selected: Set<string>) {
  const missing = new Set<string>();
  const included = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of graphNodes) {
      if (selected.has(node.id) || [...included].some((id) => id === node.id)) {
        included.add(node.id);
        for (const dep of node.deps) {
          if (!included.has(dep)) {
            missing.add(dep);
            included.add(dep);
            changed = true;
          }
        }
      }
    }
  }
  return { included, missing };
}

export function ChangeGraphExplainer() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["B", "C"]));
  const { included, missing } = useMemo(() => closure(selected), [selected]);
  const heads = useMemo(() => {
    const children = new Set<string>();
    for (const node of graphNodes) {
      for (const dep of node.deps) {
        if (included.has(node.id)) children.add(dep);
      }
    }
    return [...included].filter((id) => !children.has(id));
  }, [included]);

  return (
    <section className="explainer">
      <div>
        <p className="eyebrow">Interactive explainer</p>
        <h3>Change graph closure and heads</h3>
        <p>
          A head is a frontier change. Asking for a head implies all of its
          dependencies. Toggle advertised heads and watch the dependency closure.
        </p>
      </div>
      <div className="nodeRow">
        {graphNodes.map((node) => (
          <button
            className="nodeButton"
            data-selected={selected.has(node.id)}
            key={node.id}
            onClick={() =>
              setSelected((current) => {
                const next = new Set(current);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              })
            }
            type="button"
          >
            <strong>{node.id}</strong>
            <span>{node.deps.length ? `deps ${node.deps.join(", ")}` : "root change"}</span>
          </button>
        ))}
      </div>
      <div className="algorithmColumns">
        <div>
          <strong>Advertised heads</strong>
          <p>{[...selected].join(", ") || "none"}</p>
        </div>
        <div>
          <strong>Required closure</strong>
          <p>{[...included].sort().join(", ") || "none"}</p>
        </div>
        <div>
          <strong>Derived current heads</strong>
          <p>{heads.sort().join(", ") || "none"}</p>
        </div>
      </div>
      <div className="resultPanel" data-state={missing.size ? "maybe" : "ok"}>
        <strong>{missing.size ? "Dependencies pulled in" : "Closure already satisfied"}</strong>
        <p>
          Missing dependencies discovered from the chosen frontier:{" "}
          {[...missing].sort().join(", ") || "none"}.
        </p>
      </div>
    </section>
  );
}

const sequenceOptions = ["HEAD", "1@aa", "2@aa", "9@aa"];

export function SequenceReachabilityExplainer() {
  const [key, setKey] = useState("2@aa");
  const [kind, setKind] = useState<"insert" | "update">("insert");
  const reachable = new Set(["HEAD", "1@aa", "2@aa"]);
  const valid = kind === "insert" ? reachable.has(key) : reachable.has(key) && key !== "HEAD";

  return (
    <section className="explainer">
      <div>
        <p className="eyebrow">Interactive explainer</p>
        <h3>Sequence key reachability</h3>
        <p>
          The desktop patch stack rejects list operations that point at missing
          element ids. Inserts may target <code>HEAD</code>; updates and deletes
          must target a reachable existing element.
        </p>
      </div>
      <div className="sequenceRail" aria-label="reachable sequence">
        <span>HEAD</span>
        <span>1@aa</span>
        <span>2@aa</span>
      </div>
      <div className="controlsGrid">
        <label>
          Operation kind
          <select value={kind} onChange={(event) => setKind(event.target.value as "insert" | "update")}>
            <option value="insert">insert</option>
            <option value="update">update/delete</option>
          </select>
        </label>
        <label>
          Sequence key
          <select value={key} onChange={(event) => setKey(event.target.value)}>
            {sequenceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="resultPanel" data-state={valid ? "ok" : "no"}>
        <strong>{valid ? "Valid sequence reference" : "InvalidSeqKey"}</strong>
        <p>
          {valid
            ? "The key is reachable under this operation's rules."
            : kind === "update" && key === "HEAD"
              ? "Updates and deletes cannot target HEAD because HEAD is a predecessor, not an element."
              : "The key is not in the reachable element graph, so accepting it would create malformed history."}
        </p>
      </div>
    </section>
  );
}
