//! Demo 1 — Witnessed Hello.
//!
//! Says "hello world" the only way RVM allows anything to be said: as a
//! sequence of witnessed privileged actions. Then tampers with the log to
//! find out what the integrity machinery actually catches.
//!
//! The interesting result is that RVM's two integrity layers cover
//! different things, and only one of them covers the payload.

use rvm_types::{ActionKind, WitnessRecord};
use rvm_witness::{
    default_signer, verify_chain, ChainIntegrityError, HmacWitnessSigner, WitnessLog, WitnessSigner,
};

/// Ring capacity. Small so the whole log fits on screen.
const CAP: usize = 16;

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

/// Render a record's 8-byte payload as ASCII, dots for non-printables.
fn payload_ascii(r: &WitnessRecord) -> String {
    r.payload
        .iter()
        .map(|&b| {
            if (0x20..0x7f).contains(&b) {
                b as char
            } else {
                '.'
            }
        })
        .collect()
}

fn kind_name(k: u8) -> &'static str {
    match k {
        x if x == ActionKind::PartitionCreate as u8 => "PartitionCreate",
        x if x == ActionKind::CapabilityGrant as u8 => "CapabilityGrant",
        x if x == ActionKind::PartitionDestroy as u8 => "PartitionDestroy",
        _ => "other",
    }
}

fn dump(records: &[WitnessRecord], signer: &HmacWitnessSigner) {
    println!(
        "{:>3}  {:<16} {:>5} {:>6}  {:<10} {:>10} {:>10}  {:<9}",
        "seq", "action", "actor", "target", "payload", "prev_hash", "rec_hash", "signature"
    );
    for r in records {
        let sig_ok = if signer.verify(r) { "valid" } else { "BAD" };
        println!(
            "{:>3}  {:<16} {:>5} {:>6}  {:<10} {:>#10x} {:>#10x}  {:<9}",
            r.sequence,
            kind_name(r.action_kind),
            r.actor_partition_id,
            r.target_object_id,
            format!("{:?}", payload_ascii(r)),
            r.prev_hash,
            r.record_hash,
            sig_ok
        );
    }
}

/// Build a record carrying up to 8 bytes of text in its payload.
fn say(kind: ActionKind, actor: u32, target: u64, text: &str, ts: u64) -> WitnessRecord {
    let mut r = WitnessRecord::zeroed();
    r.action_kind = kind as u8;
    r.proof_tier = 1;
    r.actor_partition_id = actor;
    r.target_object_id = target;
    r.timestamp_ns = ts;
    r.capability_hash = 0xCAFE_0000 | u32::from(actor);
    let bytes = text.as_bytes();
    let n = bytes.len().min(8);
    r.payload[..n].copy_from_slice(&bytes[..n]);
    r
}

fn main() {
    println!("\x1b[1mRVM Demo 1 — Witnessed Hello\x1b[0m");
    println!("Every privileged action emits a 64-byte hash-chained audit record.");

    let log: WitnessLog<CAP> = WitnessLog::new();
    let signer = default_signer();

    // ---------------------------------------------------------------
    rule("1. Say hello, witnessed");
    // ---------------------------------------------------------------
    // signed_append fills sequence/prev_hash/record_hash, then signs the
    // fully-populated record into the `aux` field.
    log.signed_append(say(ActionKind::PartitionCreate, 0, 1, "hello", 1_000), &signer);
    log.signed_append(say(ActionKind::CapabilityGrant, 1, 2, "world", 2_000), &signer);
    log.signed_append(say(ActionKind::PartitionDestroy, 1, 1, "!", 3_000), &signer);

    let mut buf = [WitnessRecord::zeroed(); CAP];
    let n = log.snapshot(&mut buf);
    let records = &mut buf[..n];

    dump(records, &signer);
    println!(
        "\n{} records, {} bytes each, {} bytes total",
        n,
        core::mem::size_of::<WitnessRecord>(),
        n * core::mem::size_of::<WitnessRecord>()
    );

    // ---------------------------------------------------------------
    rule("2. Verify the untampered chain");
    // ---------------------------------------------------------------
    match verify_chain(records) {
        Ok(count) => println!("verify_chain  -> OK, {count} records link cleanly"),
        Err(e) => println!("verify_chain  -> FAILED: {e}"),
    }
    let sigs_ok = records.iter().all(|r| signer.verify(r));
    println!("signatures    -> {}", if sigs_ok { "all valid" } else { "INVALID" });

    // ---------------------------------------------------------------
    rule("3. Tamper with a payload: rewrite history's content");
    // ---------------------------------------------------------------
    // An attacker edits what was said, leaving the ordering intact.
    println!("Rewriting record 1's payload from \"world\" to \"pwned\"...\n");
    records[1].payload[..5].copy_from_slice(b"pwned");

    match verify_chain(records) {
        Ok(count) => println!("verify_chain  -> OK, {count} records link cleanly   <-- tamper NOT caught"),
        Err(e) => println!("verify_chain  -> FAILED: {e}"),
    }
    match records.iter().position(|r| !signer.verify(r)) {
        Some(i) => println!("signatures    -> INVALID at index {i}                <-- tamper caught here"),
        None => println!("signatures    -> all valid"),
    }

    println!(
        "\n\x1b[33mWhy:\x1b[0m `append` sets record_hash = compute_chain_hash(prev_hash, sequence).\n\
         It is derived purely from position in the chain, not from record contents --\n\
         despite the field docs describing it as a hash of bytes [0..44]. The unused\n\
         `compute_record_hash(data)` in hash.rs is what would cover contents.\n\
         So verify_chain proves *ordering*; only the HMAC signature proves *content*.\n\
         Using plain `append` instead of `signed_append` would leave this undetectable."
    );

    // restore
    records[1].payload[..5].copy_from_slice(b"world");

    // ---------------------------------------------------------------
    rule("4. Tamper with ordering: renumber a record");
    // ---------------------------------------------------------------
    println!("Changing record 2's sequence from 2 to 7...\n");
    records[2].sequence = 7;

    match verify_chain(records) {
        Ok(count) => println!("verify_chain  -> OK, {count} records"),
        Err(ChainIntegrityError::RecordCorrupted { sequence }) => {
            println!("verify_chain  -> FAILED: corrupted record at seq {sequence}   <-- caught")
        }
        Err(e) => println!("verify_chain  -> FAILED: {e}   <-- caught"),
    }
    records[2].sequence = 2;

    // ---------------------------------------------------------------
    rule("5. Throughput");
    // ---------------------------------------------------------------
    // The README claims ~17ns per witness emission. Measure it, unsigned
    // (the hash chain alone) and signed (chain + HMAC-SHA256).
    let big: WitnessLog<4096> = WitnessLog::new();
    let rec = say(ActionKind::PartitionCreate, 0, 1, "bench", 0);
    const ITERS: u32 = 1_000_000;

    let t0 = std::time::Instant::now();
    for _ in 0..ITERS {
        big.append(rec);
    }
    let unsigned = t0.elapsed();

    let t1 = std::time::Instant::now();
    for _ in 0..ITERS {
        big.signed_append(rec, &signer);
    }
    let signed = t1.elapsed();

    println!(
        "append          {ITERS} iters in {:>8.2?}  =  {:>6.1} ns/op",
        unsigned,
        unsigned.as_nanos() as f64 / f64::from(ITERS)
    );
    println!(
        "signed_append   {ITERS} iters in {:>8.2?}  =  {:>6.1} ns/op",
        signed,
        signed.as_nanos() as f64 / f64::from(ITERS)
    );
    println!(
        "\n\x1b[33mOn the ~17ns figure in RVM's README:\x1b[0m that is the FNV-1a path.\n\
         rvm-witness's *default* features include crypto-sha256, which is what you\n\
         get unless you opt out -- and it costs an order of magnitude more. Measured\n\
         on this machine:\n\
         \n\
         \x20   append, crypto-sha256 OFF (FNV-1a)   ~22 ns/op\n\
         \x20   append, crypto-sha256 ON  (default) ~295 ns/op   <- rvm's own bench agrees\n\
         \n\
         Both are honest numbers for different builds; the README just doesn't say\n\
         which one it is quoting. Re-run rvm's own bench to confirm:\n\
         \x20   cargo bench -p rvm-benches --bench witness"
    );
}
