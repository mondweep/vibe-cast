//! Demo 3 — Three Ways to Prove Hello.
//!
//! One trivial mutation ("write hello into a region") pushed through RVM's
//! three proof tiers, to see what each checks, what it costs, and what it
//! catches that the tier below does not.
//!
//! P1: does this handle resolve, is it current, does it carry the rights?
//! P2: is the whole request structurally legal (owner, bounds, lease, replay)?
//! P3: does the delegation chain walk cleanly back to a root?
//!
//! P2 turns out not to be reachable from outside rvm-cap at this revision --
//! see section 3. We reach the tier-2 *gate* path via rvm-security instead.

use rvm_cap::{CapabilityManager, ProofError};
use rvm_security::gate::{GateRequest, SecurityGate};
use rvm_types::{ActionKind, CapRights, CapType, PartitionId, WitnessHash};
use rvm_witness::WitnessLog;
use std::time::Instant;

const TABLE: usize = 64;
const LOG: usize = 32;
const ITERS: u32 = 200_000;

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

fn outcome(r: Result<(), ProofError>) -> String {
    match r {
        Ok(()) => "\x1b[32mPASS\x1b[0m".into(),
        Err(e) => format!("\x1b[31mFAIL\x1b[0m ({e})"),
    }
}

fn main() {
    println!("\x1b[1mRVM Demo 3 — Three Ways to Prove Hello\x1b[0m");
    println!("Same mutation, three depths of proof.");

    let hypervisor = PartitionId::HYPERVISOR;
    let owner = PartitionId::new(4);
    let full = CapRights::READ | CapRights::WRITE | CapRights::GRANT;

    // Build a fresh root -> mid -> leaf chain. Each case below gets its own
    // manager so one case's mutations cannot colour the next.
    let fresh = || {
        let mut m = CapabilityManager::<TABLE>::with_defaults();
        let (ri, rg) = m
            .create_root_capability_checked(CapType::Region, full, 1, owner, hypervisor)
            .expect("mint root");
        let (mi, mg) = m.grant(ri, rg, full, 2, owner).expect("hop 1");
        let (li, lg) = m
            .grant(mi, mg, CapRights::READ | CapRights::WRITE, 3, owner)
            .expect("hop 2");
        (m, (mi, mg), (li, lg))
    };

    let (mut mgr, _, (leaf_i, leaf_g)) = fresh();
    println!(
        "\nDelegation chain:  root(depth 0) -> mid(depth 1) -> leaf(depth 2)\n\
         The mutation is attempted with the leaf capability."
    );

    // ---------------------------------------------------------------
    rule("1. P1 and P3 on the happy path");
    // ---------------------------------------------------------------
    println!("  P1  handle + epoch + rights            {}", outcome(mgr.verify_p1(leaf_i, leaf_g, CapRights::WRITE)));
    println!("  P3  full derivation chain to root      {}", outcome(mgr.verify_p3(leaf_i, leaf_g, 8)));

    // ---------------------------------------------------------------
    rule("2. Which tier catches what");
    // ---------------------------------------------------------------

    // (a) Missing rights -- caught at P1, the cheapest check.
    println!("\n  \x1b[4mCase A: token lacks EXECUTE\x1b[0m");
    println!("    P1  {}", outcome(mgr.verify_p1(leaf_i, leaf_g, CapRights::EXECUTE)));
    println!("    P3  {}", outcome(mgr.verify_p3(leaf_i, leaf_g, 8)));
    println!("        ^ rights are a P1 concern. P3 does not look at rights at all,\n\
         \x20         so it passes -- the tiers are additive, not ordered by strictness.");

    // (b) Revoked ancestor. The intuitive guess is that P1 keeps passing on
    //     the leaf and only P3 notices -- that guess is wrong here.
    println!("\n  \x1b[4mCase B: an ancestor mid-chain is revoked\x1b[0m");
    let (mut mgr_b, (mid_i, mid_g), (lb_i, lb_g)) = fresh();
    let revoked = mgr_b.revoke(mid_i, mid_g).expect("revoke the middle hop");
    println!("    revoke(mid) invalidated {} capabilities", revoked.revoked_count);
    println!("    P1  {}", outcome(mgr_b.verify_p1(lb_i, lb_g, CapRights::WRITE)));
    println!("    P3  {}", outcome(mgr_b.verify_p3(lb_i, lb_g, 8)));
    println!(
        "        ^ \x1b[33mboth fail, and that is deliberate.\x1b[0m revoke_capability walks\n\
         \x20         the derivation subtree and force-invalidates every descendant's\n\
         \x20         table slot, so the cheap P1 check already rejects the leaf. The\n\
         \x20         source comment is explicit that this is the point: \"Without this,\n\
         \x20         a revoked child capability's table slot remains is_valid: true and\n\
         \x20         would pass P1 verification.\" So revocation is NOT a P3-only case."
    );

    // (c) The check that genuinely belongs to P3 alone: the depth bound.
    println!("\n  \x1b[4mCase C: chain is longer than policy allows\x1b[0m");
    let (mgr_c, _, (lc_i, lc_g)) = fresh();
    println!("    P1                    {}", outcome(mgr_c.verify_p1(lc_i, lc_g, CapRights::WRITE)));
    println!("    P3 with max_depth=8   {}", outcome(mgr_c.verify_p3(lc_i, lc_g, 8)));
    println!("    P3 with max_depth=1   {}", outcome(mgr_c.verify_p3(lc_i, lc_g, 1)));
    println!(
        "        ^ \x1b[33mhere P1 passes and P3 fails.\x1b[0m Delegation-depth policy is\n\
         \x20         structural: it is a property of the chain, invisible to a token\n\
         \x20         that looks perfectly valid on its own. Walking to the root is the\n\
         \x20         only way to enforce it."
    );

    // ---------------------------------------------------------------
    rule("3. P2 is unreachable from outside rvm-cap");
    // ---------------------------------------------------------------
    println!(
        "  Both `CapabilityManager::verify_p2` and `ProofVerifier::verify_p2` are\n\
         \x20 public and take `ctx: &PolicyContext` -- but rvm-cap's lib.rs declares\n\
         \x20 `mod verify;` privately and re-exports only `ProofVerifier`, never\n\
         \x20 `PolicyContext`. The type cannot be named by any external caller, so\n\
         \x20 the function cannot be called. Writing the obvious thing:\n\
         \n\
         \x20     use rvm_cap::verify::PolicyContext;\n\
         \n\
         \x20 fails to compile with:\n\
         \n\
         \x20     error[E0603]: module `verify` is private\n\
         \n\
         \x20 Nothing else in the workspace re-exports it either (checked all 17\n\
         \x20 crates). Upstream fix is one line in rvm-cap/src/lib.rs:\n\
         \n\
         \x20     pub use verify::{{ProofVerifier, PolicyContext}};\n\
         \n\
         \x20 Until then P2's own checks -- owner match, region bounds, lease expiry,\n\
         \x20 nonce replay -- are reachable only from inside the crate's unit tests."
    );

    // ---------------------------------------------------------------
    rule("4. The tier-2 path that IS reachable: the security gate");
    // ---------------------------------------------------------------
    // rvm-security's gate reports a proof tier: P1 with no commitment, P2
    // when a non-zero proof commitment accompanies the request.
    let log: WitnessLog<LOG> = WitnessLog::new();
    let gate = SecurityGate::<LOG>::new(&log);
    let token = mgr.table().lookup(leaf_i, leaf_g).expect("leaf slot").token;

    let base = GateRequest {
        token,
        required_type: CapType::Region,
        required_rights: CapRights::WRITE,
        proof_commitment: None,
        require_p3: false,
        p3_chain_valid: false,
        p3_witness_data: None,
        action: ActionKind::RegionTransfer,
        target_object_id: 0x1000,
        timestamp_ns: 1_000,
    };

    match gate.check_and_execute(&base) {
        Ok(r) => println!("  no commitment            -> allowed at tier \x1b[1mP{}\x1b[0m", r.proof_tier),
        Err(e) => println!("  no commitment            -> denied ({e:?})"),
    }

    let with_commitment = GateRequest {
        proof_commitment: Some(WitnessHash::from_bytes([7u8; 32])),
        timestamp_ns: 2_000,
        ..base
    };
    match gate.check_and_execute(&with_commitment) {
        Ok(r) => println!("  non-zero commitment      -> allowed at tier \x1b[1mP{}\x1b[0m", r.proof_tier),
        Err(e) => println!("  non-zero commitment      -> denied ({e:?})"),
    }

    let zero_commitment = GateRequest {
        proof_commitment: Some(WitnessHash::ZERO),
        timestamp_ns: 3_000,
        ..base
    };
    match gate.check_and_execute(&zero_commitment) {
        Ok(r) => println!("  all-zero commitment      -> allowed at tier P{}", r.proof_tier),
        Err(e) => println!("  all-zero commitment      -> \x1b[31mdenied\x1b[0m ({e:?})  <-- a zero hash is not a proof"),
    }

    let p3_no_data = GateRequest {
        require_p3: true,
        timestamp_ns: 4_000,
        ..base
    };
    match gate.check_and_execute(&p3_no_data) {
        Ok(r) => println!("  require_p3, no chain     -> allowed at tier P{}", r.proof_tier),
        Err(e) => println!("  require_p3, no chain     -> \x1b[31mdenied\x1b[0m ({e:?})"),
    }

    println!(
        "\n  Note the last one: the gate does not trust the caller's `p3_chain_valid`\n\
         \x20 flag. It is set to false here and would be ignored either way -- the gate\n\
         \x20 re-derives the answer from `p3_witness_data`, and absent data means no."
    );

    // ---------------------------------------------------------------
    rule("5. What the tiers cost");
    // ---------------------------------------------------------------
    let mut m2 = CapabilityManager::<TABLE>::with_defaults();
    let (r_i, r_g) = m2
        .create_root_capability_checked(CapType::Region, full, 1, owner, hypervisor)
        .expect("mint");
    let (mi, mg) = m2.grant(r_i, r_g, full, 2, owner).expect("hop 1");
    let (li, lg) = m2
        .grant(mi, mg, CapRights::READ | CapRights::WRITE, 3, owner)
        .expect("hop 2");

    // black_box on both the inputs and the result, otherwise LLVM proves the
    // whole loop dead and reports 0.0 ns/op.
    use std::hint::black_box;

    let t = Instant::now();
    for _ in 0..ITERS {
        black_box(m2.verify_p1(black_box(li), black_box(lg), CapRights::WRITE)).ok();
    }
    let d1 = t.elapsed();

    let t = Instant::now();
    for _ in 0..ITERS {
        black_box(m2.verify_p3(black_box(li), black_box(lg), 8)).ok();
    }
    let d3 = t.elapsed();

    let gate_log: WitnessLog<64> = WitnessLog::new();
    let g2 = SecurityGate::<64>::new(&gate_log);
    let tok2 = m2.table().lookup(li, lg).expect("slot").token;
    let req = GateRequest { token: tok2, ..with_commitment };
    let t = Instant::now();
    for _ in 0..ITERS {
        black_box(g2.check_and_execute(black_box(&req))).ok();
    }
    let dg = t.elapsed();

    let ns = |d: std::time::Duration| d.as_nanos() as f64 / f64::from(ITERS);
    println!("  {:<22} {:>10}  {:>12}   {}", "path", "ns/op", "ADR target", "checks");
    println!("  {:<22} {:>10.1}  {:>12}   {}", "verify_p1", ns(d1), "< 1 us", "handle, epoch, rights");
    println!("  {:<22} {:>10.1}  {:>12}   {}", "verify_p3", ns(d3), "deep", "+ chain walk to root");
    println!("  {:<22} {:>10.1}  {:>12}   {}", "gate (P2 + witness)", ns(dg), "-", "+ commitment + witness emit");

    println!(
        "\n\x1b[33mTakeaway:\x1b[0m P1 and P3 both land far inside their ADR targets, and P3 is\n\
         not dramatically dearer -- its cost grows with delegation depth, not table\n\
         size, and this chain is two hops. The gate row is the expensive one, and\n\
         nearly all of that is the witness emission measured in demo 1, not the\n\
         proof check. The reason to pick a tier is Case C, not the clock."
    );
}
