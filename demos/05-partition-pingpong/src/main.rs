//! Demo 5 — Partition Ping-Pong.
//!
//! Two partitions bounce "hello" / "world" across a comm edge while the
//! two-signal scheduler decides who runs next. Every send is witnessed, so
//! the conversation leaves a complete audit trail.
//!
//! One thing worth knowing up front: `IpcMessage` carries no bytes. It has
//! `payload_len` and `msg_type`, but no buffer -- RVM moves message
//! *headers* through the queue and expects the actual payload to live in a
//! shared memory region the receiver already has a capability for. So what
//! actually crosses the edge here is a header carrying the turn index and
//! the word's length; the words themselves are the demo's own, and are
//! recorded in the witness payload. That is the real shape of the API, not
//! a simplification on our part.

use rvm_partition::{IpcManager, IpcMessage, PartitionManager, PartitionType};
use rvm_sched::{Scheduler, SchedulerMode};
use rvm_types::{ActionKind, CutPressure, WitnessRecord};
use rvm_witness::{default_signer, verify_chain, WitnessLog, WitnessSigner};

const LOG: usize = 64;
const MAX_CPUS: usize = 2;
const MAX_PARTS: usize = 8;
const EDGES: usize = 4;
const QUEUE: usize = 8;

/// The conversation, alternating between the two partitions.
const SCRIPT: [&str; 6] = ["hello", "world", "how", "are", "you", "?"];

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

fn main() {
    println!("\x1b[1mRVM Demo 5 — Partition Ping-Pong\x1b[0m");
    println!("Two partitions, one comm edge, a scheduler, and a witness log.");

    let log: WitnessLog<LOG> = WitnessLog::new();
    let signer = default_signer();

    // ---------------------------------------------------------------
    rule("1. Create two partitions");
    // ---------------------------------------------------------------
    let mut parts = PartitionManager::new();
    let ping = parts
        .create(PartitionType::Agent, 1, 0)
        .expect("create ping partition");
    let pong = parts
        .create(PartitionType::Agent, 1, 0)
        .expect("create pong partition");
    println!("  ping = PartitionId({})", ping.as_u32());
    println!("  pong = PartitionId({})", pong.as_u32());
    println!("  active partitions: {}", parts.count());

    // ---------------------------------------------------------------
    rule("2. Open comm edges");
    // ---------------------------------------------------------------
    // Channels are directional: the sender must be the channel's source,
    // so a two-way conversation needs an edge each way.
    let mut ipc: IpcManager<EDGES, QUEUE> = IpcManager::new();
    let fwd = ipc.create_channel(ping, pong).expect("ping -> pong");
    let rev = ipc.create_channel(pong, ping).expect("pong -> ping");
    println!("  edge {} : ping -> pong", fwd.as_u64());
    println!("  edge {} : pong -> ping", rev.as_u64());

    // A partition cannot send on an edge it does not source.
    let forged = IpcMessage {
        sender: pong,
        receiver: ping,
        edge_id: fwd,
        payload_len: 0,
        msg_type: 0,
        sequence: 0,
        capability_hash: 0,
    };
    match ipc.send(fwd, forged, pong) {
        Ok(()) => println!("  pong sending on ping's edge -> unexpectedly allowed"),
        Err(e) => println!("  pong sending on ping's edge -> \x1b[31mrefused\x1b[0m ({e:?})"),
    }

    // ---------------------------------------------------------------
    rule("3. Register both partitions with the scheduler");
    // ---------------------------------------------------------------
    let mut sched: Scheduler<MAX_CPUS, MAX_PARTS> = Scheduler::new();
    sched.set_mode(SchedulerMode::Flow);
    println!("  scheduler mode: Flow (coherence-aware placement)");

    // ---------------------------------------------------------------
    rule("4. The conversation");
    // ---------------------------------------------------------------
    println!(
        "  {:>4}  {:<24} {:<18} {:<12} {}",
        "turn", "scheduler picks", "message", "edge weight", "witness"
    );

    let mut speaker = ping;
    for (turn, word) in SCRIPT.iter().enumerate() {
        let listener = if speaker == ping { pong } else { ping };
        let edge = if speaker == ping { fwd } else { rev };

        // Both partitions are runnable each turn. The speaker is given
        // higher deadline urgency, so the scheduler should pick it.
        sched.enqueue(0, ping, if speaker == ping { 900 } else { 100 }, CutPressure::ZERO);
        sched.enqueue(0, pong, if speaker == pong { 900 } else { 100 }, CutPressure::ZERO);

        let picked = sched
            .switch_next(0)
            .map(|(_old, new)| new)
            .expect("run queue is non-empty");

        // Drain whatever else was queued this turn so the next turn starts clean.
        while sched.switch_next(0).is_some() {}

        let msg = IpcMessage {
            sender: speaker,
            receiver: listener,
            edge_id: edge,
            payload_len: word.len() as u16,
            msg_type: turn as u16,
            sequence: turn as u64,
            capability_hash: 0xC0DE_0000 | speaker.as_u32(),
        };
        ipc.send(edge, msg, speaker).expect("speaker owns this edge");

        let received = ipc
            .receive(edge)
            .expect("edge exists")
            .expect("a message was queued");

        // Witness the send.
        let mut r = WitnessRecord::zeroed();
        r.action_kind = ActionKind::RegionShare as u8;
        r.proof_tier = 1;
        r.actor_partition_id = speaker.as_u32();
        r.target_object_id = u64::from(listener.as_u32());
        r.timestamp_ns = (turn as u64 + 1) * 1_000;
        r.capability_hash = msg.capability_hash;
        let n = word.len().min(8);
        r.payload[..n].copy_from_slice(&word.as_bytes()[..n]);
        let seq = log.signed_append(r, &signer);

        let weight = ipc.comm_weight(edge).expect("edge exists");
        let flow = format!(
            "p{} -> p{}: {:?}",
            received.sender.as_u32(),
            received.receiver.as_u32(),
            word
        );
        let pick = format!(
            "PartitionId({}){}",
            picked.as_u32(),
            if picked == speaker { " (speaker)" } else { " (!)" }
        );
        println!("  {:>4}  {pick:<24} {flow:<18} {weight:<12} seq {seq}", turn);

        speaker = listener;
    }

    // ---------------------------------------------------------------
    rule("5. Epoch summary and audit trail");
    // ---------------------------------------------------------------
    let epoch = sched.tick_epoch();
    println!("  context switches this epoch: {}", epoch.switch_count);

    let mut buf = [WitnessRecord::zeroed(); LOG];
    let n = log.snapshot(&mut buf);
    let records = &buf[..n];

    println!("\n  {:>3}  {:>6} {:>8}  {:<10}", "seq", "actor", "target", "said");
    for r in records {
        let text: String = r
            .payload
            .iter()
            .take_while(|&&b| b != 0)
            .map(|&b| b as char)
            .collect();
        println!(
            "  {:>3}  {:>6} {:>8}  {:<10}",
            r.sequence, r.actor_partition_id, r.target_object_id, format!("{text:?}")
        );
    }

    match verify_chain(records) {
        Ok(c) => println!("\n  chain verification: OK, {c} records"),
        Err(e) => println!("\n  chain verification: FAILED ({e})"),
    }
    let sigs = records.iter().filter(|r| signer.verify(r)).count();
    println!("  signatures        : {sigs}/{} valid", records.len());

    println!(
        "\n\x1b[33mNote:\x1b[0m the edge weight climbs by one per send. That counter is\n\
         exactly the signal the coherence engine consumes to decide two partitions\n\
         are talking enough to belong together -- which is demo 6."
    );
}
