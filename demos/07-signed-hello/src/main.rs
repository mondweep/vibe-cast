//! Demo 7 — Signed Hello Package.
//!
//! Packs a hello agent into an RVForge container, verifies identity,
//! manifest, content hashes, signature and capability mapping, then corrupts
//! one byte at a time and watches the loader refuse.
//!
//! rvm-rvf only ever *reads* containers -- nothing in the crate writes one,
//! and its `testkit` (which does) is a private `mod`, unreachable from
//! outside. So this demo writes the segment format directly against the
//! public `rvm_rvf::format` API. The layout, per rvm-rvf's own docs:
//!
//! ```text
//! [ 64-byte header ][ payload ][ signature footer, if SIGNED ][ zero pad to 64 ]
//! ```

use ed25519_dalek::{Signer, SigningKey};
use rvm_rvf::format::{
    build_signed_message, compute_footer_length, SEG_TYPE_MANIFEST, SEG_TYPE_META, SEG_TYPE_WASM,
    SIG_ALGO_ED25519,
};
use rvm_rvf::{
    content_hash, sha256, verify, walk, CheckKind, Outcome, SegmentHeader, VerifyOptions,
    CAPABILITY_DECLARATION_KEY, SEGMENT_ALIGNMENT, SEGMENT_HEADER_SIZE, SEGMENT_MAGIC,
    SEGMENT_VERSION,
};
use rvm_rvf::witness::{emit_report, WitnessContext};
use rvm_types::WitnessRecord;
use rvm_witness::WitnessLog;

/// XXH3-128, the checksum algorithm the RuVector writer defaults to.
const CHECKSUM_ALGO: u8 = 1;
const FLAG_SIGNED: u16 = 0x0004;
const LOG: usize = 64;

/// The "agent": a minimal valid WebAssembly module.
const HELLO_WASM: [u8; 8] = [0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00];

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

fn header_bytes(
    seg_type: u8,
    payload: &[u8],
    flags: u16,
    segment_id: u64,
    alignment_pad: u32,
) -> [u8; SEGMENT_HEADER_SIZE] {
    let mut b = [0u8; SEGMENT_HEADER_SIZE];
    b[0x00..0x04].copy_from_slice(&SEGMENT_MAGIC.to_le_bytes());
    b[0x04] = SEGMENT_VERSION;
    b[0x05] = seg_type;
    b[0x06..0x08].copy_from_slice(&flags.to_le_bytes());
    b[0x08..0x10].copy_from_slice(&segment_id.to_le_bytes());
    b[0x10..0x18].copy_from_slice(&(payload.len() as u64).to_le_bytes());
    // timestamp_ns (0x18) stays zero so the container is byte-reproducible.
    b[0x20] = CHECKSUM_ALGO;
    b[0x28..0x38].copy_from_slice(&content_hash(CHECKSUM_ALGO, payload));
    b[0x3C..0x40].copy_from_slice(&alignment_pad.to_le_bytes());
    b
}

fn pad_to_alignment(buf: &mut Vec<u8>) {
    let padded = buf.len().div_ceil(SEGMENT_ALIGNMENT) * SEGMENT_ALIGNMENT;
    buf.resize(padded, 0);
}

fn unsigned_segment(seg_type: u8, payload: &[u8], segment_id: u64) -> Vec<u8> {
    let unpadded = SEGMENT_HEADER_SIZE + payload.len();
    let pad = unpadded.div_ceil(SEGMENT_ALIGNMENT) * SEGMENT_ALIGNMENT - unpadded;

    let mut out = Vec::new();
    out.extend_from_slice(&header_bytes(seg_type, payload, 0, segment_id, pad as u32));
    out.extend_from_slice(payload);
    pad_to_alignment(&mut out);
    out
}

fn signed_segment(seg_type: u8, payload: &[u8], segment_id: u64, key: &SigningKey) -> Vec<u8> {
    let footer_len = compute_footer_length(64) as usize;
    let unpadded = SEGMENT_HEADER_SIZE + payload.len() + footer_len;
    let pad = unpadded.div_ceil(SEGMENT_ALIGNMENT) * SEGMENT_ALIGNMENT - unpadded;

    let head = header_bytes(seg_type, payload, FLAG_SIGNED, segment_id, pad as u32);
    let header = SegmentHeader::parse(&head).expect("we just built this header");
    // The signature covers a canonical message derived from the header and
    // payload, not the raw bytes -- so header fields are signed too.
    let signature = key.sign(&build_signed_message(&header, payload)).to_bytes();

    let mut out = Vec::new();
    out.extend_from_slice(&head);
    out.extend_from_slice(payload);
    out.extend_from_slice(&SIG_ALGO_ED25519.to_le_bytes());
    out.extend_from_slice(&64u16.to_le_bytes());
    out.extend_from_slice(&signature);
    out.extend_from_slice(&compute_footer_length(64).to_le_bytes());
    pad_to_alignment(&mut out);
    out
}

/// META (capability declaration) + MANIFEST (root) + signed WASM payload.
fn build_package(capabilities: &str, key: &SigningKey) -> Vec<u8> {
    let mut meta = Vec::new();
    meta.extend_from_slice(CAPABILITY_DECLARATION_KEY.as_bytes());
    meta.push(b'=');
    meta.extend_from_slice(capabilities.as_bytes());

    let mut out = unsigned_segment(SEG_TYPE_META, &meta, 1);
    out.extend(unsigned_segment(SEG_TYPE_MANIFEST, b"root", 2));
    out.extend(signed_segment(SEG_TYPE_WASM, &HELLO_WASM, 3, key));
    out
}

fn check_name(c: CheckKind) -> &'static str {
    match c {
        CheckKind::Identity => "Identity",
        CheckKind::RootManifestPresent => "RootManifestPresent",
        CheckKind::ContentHash => "ContentHash",
        CheckKind::ExecutableSigned => "ExecutableSigned",
        CheckKind::Signature => "Signature",
        CheckKind::SizePolicy => "SizePolicy",
        CheckKind::CapabilityMapping => "CapabilityMapping",
    }
}

fn print_report(data: &[u8], opts: &VerifyOptions) {
    match verify(data, opts) {
        Ok(report) => {
            println!(
                "  identity  {}",
                report.rvf_identity[..8]
                    .iter()
                    .map(|b| format!("{b:02x}"))
                    .collect::<String>()
            );
            println!(
                "  {} bytes, {} segments, ok = {}",
                report.byte_length,
                report.segment_count,
                if report.ok {
                    "\x1b[32mtrue\x1b[0m".to_string()
                } else {
                    "\x1b[31mfalse\x1b[0m".to_string()
                }
            );
            for r in &report.records {
                let mark = match r.outcome {
                    Outcome::Pass => "\x1b[32mPASS\x1b[0m",
                    Outcome::Fail => "\x1b[31mFAIL\x1b[0m",
                    Outcome::Skip => "\x1b[33mSKIP\x1b[0m",
                };
                let seg = r
                    .segment_id
                    .map_or_else(|| "-".to_string(), |id| format!("seg {id}"));
                println!(
                    "    {mark}  {:<20} {:<7} {:?}",
                    check_name(r.check),
                    seg,
                    r.detail
                );
            }
        }
        Err(e) => println!("  \x1b[31mcontainer rejected outright\x1b[0m: {e:?}"),
    }
}

/// Verify and report only the headline outcome.
fn outcome_line(label: &str, data: &[u8], opts: &VerifyOptions) {
    match verify(data, opts) {
        Ok(report) if report.ok => println!("  {label:<34} \x1b[32maccepted\x1b[0m"),
        Ok(report) => {
            let failed: Vec<_> = report
                .failures()
                .iter()
                .map(|r| format!("{}/{:?}", check_name(r.check), r.detail))
                .collect();
            println!("  {label:<34} \x1b[31mrefused\x1b[0m  {}", failed.join(", "));
        }
        Err(e) => println!("  {label:<34} \x1b[31mrefused\x1b[0m  parse: {e:?}"),
    }
}

fn main() {
    println!("\x1b[1mRVM Demo 7 — Signed Hello Package\x1b[0m");
    println!("Pack an agent, sign it, verify it, then break it.");

    // A deterministic key, so the container is byte-reproducible.
    let key = SigningKey::from_bytes(&sha256(&[11u8; 32]));
    let public = key.verifying_key().to_bytes();

    // ---------------------------------------------------------------
    rule("1. Pack the agent");
    // ---------------------------------------------------------------
    let package = build_package("network,clock", &key);
    println!("  container: {} bytes", package.len());
    for seg in walk(&package).expect("freshly built container parses") {
        println!(
            "    seg {} type {:#04x} {:<9} payload {:>3} B  signed={} executable={}",
            seg.header.segment_id,
            seg.header.seg_type,
            match seg.header.seg_type {
                SEG_TYPE_META => "META",
                SEG_TYPE_MANIFEST => "MANIFEST",
                SEG_TYPE_WASM => "WASM",
                _ => "?",
            },
            seg.header.payload_length,
            seg.is_signed(),
            seg.is_executable()
        );
    }

    // ---------------------------------------------------------------
    rule("2. Verify with the signing key trusted");
    // ---------------------------------------------------------------
    let trusting = VerifyOptions::with_trusted_keys(vec![public]);
    print_report(&package, &trusting);

    // ---------------------------------------------------------------
    rule("3. Verify with NO trusted key");
    // ---------------------------------------------------------------
    // A signature that cannot be checked is skipped, never assumed good.
    print_report(&package, &VerifyOptions::default());

    // ---------------------------------------------------------------
    rule("4. Pin the identity");
    // ---------------------------------------------------------------
    let identity = verify(&package, &trusting).expect("parses").rvf_identity;
    outcome_line(
        "correct expected identity",
        &package,
        &VerifyOptions::with_trusted_keys(vec![public]).expect_identity(identity),
    );
    let mut wrong = identity;
    wrong[0] ^= 0xFF;
    outcome_line(
        "wrong expected identity",
        &package,
        &VerifyOptions::with_trusted_keys(vec![public]).expect_identity(wrong),
    );

    // ---------------------------------------------------------------
    rule("5. Corrupt one byte at a time");
    // ---------------------------------------------------------------
    // Find where the WASM payload sits so we can hit it precisely.
    let segs = walk(&package).expect("parses");
    let wasm = segs
        .iter()
        .find(|s| s.header.seg_type == SEG_TYPE_WASM)
        .expect("the package has a wasm segment");
    let payload_at = wasm.offset + SEGMENT_HEADER_SIZE;

    let mut flipped_payload = package.clone();
    flipped_payload[payload_at + 4] ^= 0x01;
    outcome_line("flip a byte of agent bytecode", &flipped_payload, &trusting);

    let mut flipped_sig = package.clone();
    let sig_at = payload_at + HELLO_WASM.len() + 4;
    flipped_sig[sig_at] ^= 0x01;
    outcome_line("flip a byte of the signature", &flipped_sig, &trusting);

    let mut flipped_magic = package.clone();
    flipped_magic[0] ^= 0xFF;
    outcome_line("flip the container magic", &flipped_magic, &trusting);

    let mut flipped_caps = package.clone();
    let caps_at = SEGMENT_HEADER_SIZE + CAPABILITY_DECLARATION_KEY.len() + 1;
    flipped_caps[caps_at] = b'X';
    outcome_line("rewrite the capability string", &flipped_caps, &trusting);

    let other = SigningKey::from_bytes(&sha256(&[99u8; 32]));
    outcome_line(
        "signed by an untrusted key",
        &build_package("network,clock", &other),
        &trusting,
    );

    let truncated = &package[..package.len() - SEGMENT_ALIGNMENT];
    outcome_line("truncate the last segment", truncated, &trusting);

    // ---------------------------------------------------------------
    rule("6. Capability mapping");
    // ---------------------------------------------------------------
    // The container declares what it wants; verification maps that to
    // rvm-cap bindings, defaulting to deny.
    let report = verify(&package, &trusting).expect("parses");
    println!("  declared: \"network,clock\"");
    println!(
        "  granted : {:?}",
        report
            .capabilities
            .granted()
            .iter()
            .map(|b| b.class)
            .collect::<Vec<_>>()
    );
    println!("  denied  : {} other classes", report.capabilities.denied().len());

    // Now the same question of a package that FAILED verification.
    let refused = verify(&flipped_payload, &trusting).expect("parses");
    println!("\n  tampered package: ok = {}", refused.ok);
    println!(
        "  granted : {:?}",
        refused
            .capabilities
            .granted()
            .iter()
            .map(|b| b.class)
            .collect::<Vec<_>>()
    );
    println!(
        "  \x1b[33m^ note this carefully.\x1b[0m The rustdoc on `capabilities` says that when\n\
         \x20   the capability check fails, the mapping is deny-everything. That is\n\
         \x20   true, but it is narrower than it reads: only a CapabilityMapping\n\
         \x20   failure zeroes it. Here ContentHash and Signature both failed, ok is\n\
         \x20   false, and the mapping still grants Network and Clock.\n\
         \x20   A caller must gate on `report.ok` before touching `report.capabilities`."
    );

    // ---------------------------------------------------------------
    rule("7. Verification is witnessed");
    // ---------------------------------------------------------------
    let log: WitnessLog<LOG> = WitnessLog::new();
    let ctx = WitnessContext::new(0, 1_000);
    let good = verify(&package, &trusting).expect("parses");
    let bad = verify(&flipped_payload, &trusting).expect("parses");
    let n_good = emit_report(&good, &log, ctx);
    let n_bad = emit_report(&bad, &log, ctx);
    println!("  emitted {n_good} records for the good package, {n_bad} for the tampered one");

    let mut buf = [WitnessRecord::zeroed(); LOG];
    let n = log.snapshot(&mut buf);
    println!("\n  {:>3}  {:>6}  {:<10}", "seq", "kind", "tier");
    for r in buf.iter().take(n) {
        println!("  {:>3}  {:#06x}  P{}", r.sequence, r.action_kind, r.proof_tier);
    }

    println!(
        "\n\x1b[33mTakeaway:\x1b[0m every refusal in section 5 is a distinct check with its own\n\
         detail code, and the report is deterministic -- same bytes, same options,\n\
         same report. That is what makes an RVF verdict comparable across backends\n\
         rather than a local opinion.\n\
         \n\
         Two traps for callers, both visible above:\n\
         \n\
         \x20 * Section 3: with no trusted key the signature check is SKIP and the\n\
         \x20   report is still ok = true. `ok` means \"nothing failed\", not \"the\n\
         \x20   signature was verified\". To actually require a verified signature you\n\
         \x20   must supply a trusted key AND confirm the Signature record is Pass.\n\
         \x20 * Section 6: `capabilities` stays populated on a failed report unless\n\
         \x20   the capability check itself is what failed."
    );
}
