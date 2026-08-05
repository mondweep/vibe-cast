//! Demo 2 — Hello, Denied.
//!
//! In RVM nothing is ambient: reaching a resource means presenting an
//! unforgeable capability token carrying the right bits. This walks the
//! seven rights, monotonic attenuation, and the one-shot GRANT_ONCE right,
//! then shows that every allow *and* every denial lands in the witness log.

use rvm_cap::{CapError, CapabilityManager};
use rvm_security::gate::{GateRequest, SecurityError, SecurityGate};
use rvm_types::{ActionKind, CapRights, CapType, CapToken, PartitionId, WitnessRecord};
use rvm_witness::WitnessLog;

const CAP: usize = 32;

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

fn rights_str(r: CapRights) -> String {
    let all = [
        (CapRights::READ, "READ"),
        (CapRights::WRITE, "WRITE"),
        (CapRights::GRANT, "GRANT"),
        (CapRights::REVOKE, "REVOKE"),
        (CapRights::EXECUTE, "EXECUTE"),
        (CapRights::PROVE, "PROVE"),
        (CapRights::GRANT_ONCE, "GRANT_ONCE"),
    ];
    let held: Vec<_> = all
        .iter()
        .filter(|(bit, _)| r.contains(*bit))
        .map(|(_, name)| *name)
        .collect();
    if held.is_empty() {
        "(none)".into()
    } else {
        held.join("|")
    }
}

/// Attempt an operation through the security gate.
fn attempt(
    gate: &SecurityGate<'_, CAP>,
    label: &str,
    token: CapToken,
    required_rights: CapRights,
    action: ActionKind,
    ts: u64,
) {
    let request = GateRequest {
        token,
        required_type: CapType::Region,
        required_rights,
        proof_commitment: None,
        require_p3: false,
        p3_chain_valid: false,
        p3_witness_data: None,
        action,
        target_object_id: 0x1000,
        timestamp_ns: ts,
    };

    match gate.check_and_execute(&request) {
        Ok(resp) => println!(
            "  {label:<34} \x1b[32mALLOWED\x1b[0m  (tier P{}, witness seq {})",
            resp.proof_tier, resp.witness_sequence
        ),
        Err(SecurityError::InsufficientRights) => println!(
            "  {label:<34} \x1b[31mDENIED\x1b[0m   InsufficientRights: token holds {}",
            rights_str(token.rights())
        ),
        Err(SecurityError::CapabilityTypeMismatch) => {
            println!("  {label:<34} \x1b[31mDENIED\x1b[0m   CapabilityTypeMismatch")
        }
        Err(e) => println!("  {label:<34} \x1b[31mDENIED\x1b[0m   {e:?}"),
    }
}

fn main() {
    println!("\x1b[1mRVM Demo 2 — Hello, Denied\x1b[0m");
    println!("Capability tokens are the only way to touch a resource.");

    let log: WitnessLog<CAP> = WitnessLog::new();
    let gate = SecurityGate::<CAP>::new(&log);
    let mut mgr = CapabilityManager::<64>::with_defaults();

    let hypervisor = PartitionId::HYPERVISOR;
    let agent = PartitionId::new(2);

    // ---------------------------------------------------------------
    rule("1. The hypervisor mints a root capability");
    // ---------------------------------------------------------------
    let full = CapRights::READ | CapRights::WRITE | CapRights::GRANT;
    let (root_idx, root_gen) = mgr
        .create_root_capability_checked(CapType::Region, full, 0xBAD_1111, hypervisor, hypervisor)
        .expect("hypervisor may mint root capabilities");
    println!("  root cap  index={root_idx} gen={root_gen}  rights={}", rights_str(full));

    // A non-hypervisor caller cannot mint authority from nothing.
    match mgr.create_root_capability_checked(CapType::Region, full, 0, agent, agent) {
        Ok(_) => println!("  agent minted a root capability -- unexpected!"),
        Err(e) => println!("  agent tries the same          -> \x1b[31mdenied\x1b[0m ({e:?})"),
    }

    // ---------------------------------------------------------------
    rule("2. Delegate READ-only to the agent, then try to write");
    // ---------------------------------------------------------------
    let (ro_idx, ro_gen) = mgr
        .grant(root_idx, root_gen, CapRights::READ, 0x2222, agent)
        .expect("READ is a subset of the root's rights");
    let ro_token = mgr
        .table()
        .lookup(ro_idx, ro_gen)
        .expect("freshly granted slot")
        .token;
    println!("  granted   index={ro_idx} gen={ro_gen}  rights={}\n", rights_str(ro_token.rights()));

    attempt(&gate, "agent reads the region", ro_token, CapRights::READ, ActionKind::RegionShare, 1_000);
    attempt(&gate, "agent writes the region", ro_token, CapRights::WRITE, ActionKind::RegionTransfer, 2_000);

    // ---------------------------------------------------------------
    rule("3. Monotonic attenuation: you cannot grant what you lack");
    // ---------------------------------------------------------------
    // The agent holds READ only. Asking for WRITE on a derived capability
    // is refused by validate_grant, not merely unenforced downstream.
    match mgr.grant(ro_idx, ro_gen, CapRights::READ | CapRights::WRITE, 0, agent) {
        Ok(_) => println!("  agent self-granted WRITE -- unexpected!"),
        Err(CapError::RightsEscalation) => {
            println!("  agent grants itself READ|WRITE -> \x1b[31mdenied\x1b[0m (RightsEscalation)")
        }
        Err(CapError::GrantNotPermitted) => println!(
            "  agent grants itself READ|WRITE -> \x1b[31mdenied\x1b[0m (GrantNotPermitted:\n\
             {:>34}  its READ-only token has neither GRANT nor GRANT_ONCE)",
            ""
        ),
        Err(e) => println!("  agent grants itself READ|WRITE -> denied ({e:?})"),
    }

    // ---------------------------------------------------------------
    rule("4. GRANT_ONCE: authority that evaporates after one use");
    // ---------------------------------------------------------------
    let once_rights = CapRights::READ | CapRights::GRANT_ONCE;
    let (once_idx, once_gen) = mgr
        .create_root_capability_checked(CapType::Region, once_rights, 0x3333, agent, hypervisor)
        .expect("mint a one-shot delegable capability");
    println!("  minted    rights={}", rights_str(once_rights));

    let delegate = PartitionId::new(3);
    match mgr.grant(once_idx, once_gen, CapRights::READ, 0x4444, delegate) {
        Ok((i, g)) => println!("  1st delegation to partition 3 -> \x1b[32mok\x1b[0m (index={i} gen={g})"),
        Err(e) => println!("  1st delegation -> unexpected failure {e:?}"),
    }

    let after = mgr
        .table()
        .lookup(once_idx, once_gen)
        .expect("source slot still live")
        .token
        .rights();
    println!("  source rights are now {}   <-- GRANT_ONCE consumed", rights_str(after));

    match mgr.grant(once_idx, once_gen, CapRights::READ, 0x5555, delegate) {
        Ok(_) => println!("  2nd delegation -> \x1b[31msucceeded, which it should not have\x1b[0m"),
        Err(e) => println!("  2nd delegation to partition 3 -> \x1b[31mdenied\x1b[0m ({e:?})"),
    }

    // ---------------------------------------------------------------
    rule("5. The audit trail: denials are witnessed too");
    // ---------------------------------------------------------------
    let mut buf = [WitnessRecord::zeroed(); CAP];
    let n = log.snapshot(&mut buf);
    println!("{:>3}  {:<16} {:>5}  {:>10}", "seq", "action", "tier", "cap_hash");
    for r in &buf[..n] {
        let name = if r.action_kind == ActionKind::ProofRejected as u8 {
            "\x1b[31mProofRejected\x1b[0m  "
        } else if r.action_kind == ActionKind::RegionShare as u8 {
            "RegionShare    "
        } else {
            "RegionTransfer "
        };
        println!(
            "{:>3}  {name} {:>5}  {:>#10x}",
            r.sequence,
            if r.proof_tier == 0 { "-".into() } else { format!("P{}", r.proof_tier) },
            r.capability_hash
        );
    }
    println!(
        "\n\x1b[33mNote:\x1b[0m the denied write is in the log as ProofRejected with the same\n\
         cap_hash as the successful read -- so an auditor can see exactly which\n\
         token was presented for a refused operation, not just that something failed."
    );
}
