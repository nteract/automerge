use crate::change_graph::ChangeGraph;
use crate::op_set2::change::{ActorMapper, BuildChangeMetadata};
use crate::op_set2::OpSet;
use crate::storage::change::{Unverified, Verified};
use crate::storage::{parse, Header};
use crate::types::{ActorId, ChangeHash};
use crate::{AutomergeError, Change};

use std::borrow::Cow;

mod builder;
mod error;
mod meta;
mod storage;

pub use builder::BundleChangeIter;

pub(crate) use builder::{BundleBuilder, BundleChangeIterUnverified, OpIter, OpIterUnverified};
pub(crate) use error::ParseError;
pub(crate) use meta::BundleMetadata;
pub(crate) use storage::BundleStorage;

/// EXPERIMENTAL: A set of changes compressed into a bundle
///
/// Bundles are produced by [`Automerge::bundle`](crate::Automerge::bundle) and
/// contain a set of compressed changes which is not necessarily the whole
/// document. A bundle can be loaded using
/// [`Automerge::load_incremental`](crate::Automerge::load_incremental) but can
/// also be loaded using `TryFrom<&[u8]>` in order to examine the contents of
/// the bundle.
///
/// This feature is experimental, the file format for bundles may still change
/// so do not use this feature in systems where you expect data to stick around
#[derive(Debug)]
pub struct Bundle {
    pub(crate) storage: BundleStorage<'static, Verified>,
}

impl Bundle {
    pub(crate) fn for_hashes<I>(
        op_set: &OpSet,
        change_graph: &ChangeGraph,
        hashes: I,
    ) -> Result<Bundle, AutomergeError>
    where
        I: IntoIterator<Item = ChangeHash>,
    {
        let changes = change_graph
            .get_bundle_metadata(hashes)
            .collect::<Result<_, _>>()?;
        Ok(Self::from_meta(op_set, changes))
    }

    fn from_meta(op_set: &OpSet, changes: Vec<BundleMetadata<'_>>) -> Bundle {
        let min = changes
            .iter()
            .map(|c| c.start_op as usize)
            .min()
            .unwrap_or(0);
        let max = changes.iter().map(|c| c.max_op as usize).max().unwrap_or(0) + 1;

        let mapper = ActorMapper::new(&op_set.actors);

        let mut collector = BundleBuilder::from_change_meta(changes, mapper);

        for op in op_set.iter_ctr_range(min..max) {
            let op_id = op.id;
            let op_succ = op.succ();
            collector.process_op(op);

            for id in op_succ {
                collector.process_succ(op_id, id);
            }
        }

        collector.finish()
    }

    pub(crate) fn new_from_unverified(
        stored: BundleStorage<'static, Unverified>,
    ) -> Result<Self, ParseError> {
        Ok(Self {
            storage: stored.verify()?,
        })
    }

    pub fn actors(&self) -> &[ActorId] {
        &self.storage.actors
    }

    pub fn authors(&self) -> &[Vec<u8>] {
        &[]
    }

    pub fn iter_changes(&self) -> BundleChangeIter<'_> {
        self.storage.iter_change_meta()
    }

    pub fn to_changes(&self) -> Result<Vec<Change>, AutomergeError> {
        self.storage
            .to_changes()
            .map_err(|e| AutomergeError::Unbundle(Box::new(e)))
    }

    pub fn bytes(&self) -> &[u8] {
        &self.storage.bytes
    }

    pub fn deps(&self) -> &[ChangeHash] {
        self.storage.deps()
    }
}

#[derive(Clone, Debug)]
pub struct BundleChange<'a> {
    pub actor: usize,
    pub author: Option<usize>,
    pub seq: u64,
    pub start_op: u64,
    pub max_op: u64,
    pub timestamp: i64,
    pub message: Option<Cow<'a, str>>,
    pub deps: Vec<u64>,
    pub extra: Cow<'a, [u8]>,
}

impl<'a> From<BundleChange<'a>> for BuildChangeMetadata<'a> {
    fn from(bundle: BundleChange<'a>) -> Self {
        BuildChangeMetadata {
            actor: bundle.actor,
            seq: bundle.seq,
            start_op: bundle.start_op,
            max_op: bundle.max_op,
            timestamp: bundle.timestamp,
            message: bundle.message,
            deps: bundle.deps,
            extra: bundle.extra,
            builder: 0,
        }
    }
}

impl<'a> TryFrom<&'a [u8]> for Bundle {
    type Error = InvalidBundle;

    fn try_from(bytes: &'a [u8]) -> Result<Self, Self::Error> {
        let input = parse::Input::new(bytes);
        let (i, header) = Header::parse::<crate::storage::chunk::error::Header>(input)
            .map_err(|e| InvalidBundle(format!("invalid header: {}", e)))?;
        let (_i, bundle) = BundleStorage::parse_following_header(i, header)
            .map_err(|e| InvalidBundle(format!("invalid contents: {}", e)))?;
        let verified = bundle
            .verify()
            .map_err(|e| InvalidBundle(format!("unable to verify ops: {}", e)))?;
        Ok(Self {
            storage: verified.into_owned(),
        })
    }
}

#[derive(Debug, thiserror::Error)]
#[error("invalid bundle: {0}")]
pub struct InvalidBundle(String);

#[cfg(test)]
mod test {
    use sha2::{Digest, Sha256};

    use crate::legacy::{Key, ObjectId, Op, OpType, SortedVec};
    use crate::storage::{columns::ColumnId, columns::ColumnSpec, parse, Chunk};
    use crate::transaction::Transactable;
    use crate::{Automerge, Change, ROOT};
    use std::num::NonZeroU64;

    fn rewrite_bundle_checksum(bytes: &mut [u8]) -> Result<(), String> {
        if bytes.len() < 8 {
            return Err("bundle should contain a header and checksum".to_string());
        }
        let mut hasher = Sha256::new();
        hasher.update(&bytes[8..]);
        let hash = hasher.finalize();
        bytes[4..8].copy_from_slice(&hash[..4]);
        Ok(())
    }

    fn assert_bundle_error_references(
        result: Result<Result<usize, crate::AutomergeError>, Box<dyn std::any::Any + Send>>,
        expected: &str,
    ) -> Result<(), String> {
        match result {
            Ok(Err(crate::AutomergeError::Load(
                crate::storage::load::Error::InvalidBundleColumn(err),
            ))) => {
                let parse_error = err
                    .downcast_ref::<crate::storage::bundle::ParseError>()
                    .ok_or_else(|| format!("expected bundle parse error, got {err:?}"))?;
                match parse_error {
                    crate::storage::bundle::ParseError::ReadOp(
                        crate::op_set2::ReadOpError::MissingValue(field),
                    ) if *field == expected => Ok(()),
                    _ => Err(format!(
                        "expected bundle error to reference {expected:?}, got {parse_error:?}"
                    )),
                }
            }
            Ok(Err(err)) => Err(format!("expected invalid bundle column error, got {err:?}")),
            Ok(Ok(applied)) => Err(format!(
                "expected invalid bundle to return Err, applied {applied} ops"
            )),
            Err(_) => Err("expected invalid bundle to return Err without panic".to_string()),
        }
    }

    fn root_put_change_with_extra(extra: Vec<u8>) -> Result<Change, String> {
        let op = Op {
            action: OpType::Put(crate::ScalarValue::Str("value".into())),
            obj: ObjectId::Root,
            key: Key::Map("key".into()),
            pred: SortedVec::new(),
            insert: false,
        };
        let stored = crate::storage::Change::builder()
            .with_actor(crate::ActorId::from(b"bundle-extra" as &[u8]))
            .with_seq(1)
            .with_start_op(
                NonZeroU64::new(1).ok_or_else(|| "expected non-zero start op".to_string())?,
            )
            .with_timestamp(0)
            .with_extra_bytes(extra)
            .build([op].iter())
            .map_err(|err| err.to_string())?;
        Ok(Change::new(stored))
    }

    fn one_change_bundle_bytes() -> Result<Vec<u8>, String> {
        let change = root_put_change_with_extra(vec![1, 2])?;
        let hash = change.hash();
        let mut doc = Automerge::new();
        doc.apply_changes([change]).map_err(|err| err.to_string())?;
        Ok(doc
            .bundle([hash])
            .map_err(|err| err.to_string())?
            .bytes()
            .to_vec())
    }

    fn parsed_bundle(
        bytes: &[u8],
    ) -> Result<crate::storage::BundleStorage<'_, crate::storage::change::Unverified>, String> {
        let (_, chunk) = Chunk::parse(parse::Input::new(bytes)).map_err(|err| err.to_string())?;
        let Chunk::Bundle(bundle) = chunk else {
            return Err("expected bundle chunk".to_string());
        };
        Ok(bundle)
    }

    #[test]
    fn make_bundle() {
        let mut doc = Automerge::new();

        let mut tx = doc.transaction();
        tx.put(&ROOT, "aaa", "aaa").unwrap();
        let (Some(h0), _) = tx.commit() else { panic!() };

        let mut d2 = doc.fork();

        let mut tx = doc.transaction();
        tx.put(&ROOT, "bbb", "bbb").unwrap();
        let (Some(h1), _) = tx.commit() else { panic!() };

        let mut tx = doc.transaction();
        tx.put(&ROOT, "ccc", "ccc").unwrap();
        let (Some(h2), _) = tx.commit() else { panic!() };

        let bundle = doc.bundle([h0, h1, h2]).unwrap();
        let changes = bundle.to_changes().unwrap();
        assert_eq!(changes.len(), 3);
        assert_eq!(changes[0].max_op(), 1);
        assert_eq!(changes[0].hash(), h0);
        assert_eq!(changes[1].max_op(), 2);
        assert_eq!(changes[1].hash(), h1);
        assert_eq!(changes[2].max_op(), 3);
        assert_eq!(changes[2].hash(), h2);

        d2.load_incremental(bundle.bytes()).unwrap();

        assert_eq!(doc.save(), d2.save());

        let bundle = doc.bundle([h0, h2]).unwrap();
        let changes = bundle.to_changes().unwrap();
        assert_eq!(changes.len(), 2);
        assert_eq!(changes[0].max_op(), 1);
        assert_eq!(changes[0].hash(), h0);
        assert_eq!(changes[1].max_op(), 3);
        assert_eq!(changes[1].hash(), h2);
    }

    #[test]
    fn load_bundle_with_invalid_extra_count_returns_error_without_panic() -> Result<(), String> {
        let mut bytes = one_change_bundle_bytes()?;
        let extra_count_byte = {
            let bundle = parsed_bundle(&bytes)?;
            let extra_count_range = bundle
                .changes_meta
                .as_map()
                .get(&ColumnSpec::new_group(ColumnId::new(6)))
                .ok_or_else(|| "bundle should have extra count column".to_string())?
                .clone();
            bundle.changes_data.start + extra_count_range.end - 1
        };

        bytes[extra_count_byte] = bytes[extra_count_byte]
            .checked_add(1)
            .ok_or_else(|| "extra count byte overflowed".to_string())?;
        rewrite_bundle_checksum(&mut bytes)?;

        let mut doc = Automerge::new();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            doc.load_incremental(&bytes)
        }));

        assert_bundle_error_references(result, "extra")
    }

    #[test]
    fn load_bundle_with_invalid_value_meta_returns_error_without_panic() -> Result<(), String> {
        let mut bytes = one_change_bundle_bytes()?;
        let value_meta_byte = {
            let bundle = parsed_bundle(&bytes)?;
            let value_meta_range = bundle
                .ops_meta
                .as_map()
                .get(&ColumnSpec::new_value_metadata(ColumnId::new(5)))
                .ok_or_else(|| "bundle should have value metadata column".to_string())?
                .clone();
            bundle.ops_data.start + value_meta_range.end - 1
        };

        bytes[value_meta_byte] = bytes[value_meta_byte]
            .checked_add(16)
            .ok_or_else(|| "value metadata byte overflowed".to_string())?;
        rewrite_bundle_checksum(&mut bytes)?;

        let mut doc = Automerge::new();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            doc.load_incremental(&bytes)
        }));

        assert_bundle_error_references(result, "value")
    }
}
