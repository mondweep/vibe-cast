//! Demo 6 — Two Agents That Get Closer.
//!
//! Two WASM agents start in separate partitions. As they talk more, the
//! coherence engine is supposed to notice and recommend merging their
//! domains; as their traffic turns outward, it should recommend splitting.
//! This drives that loop and prints the graph at every epoch.
//!
//! The headline result: it does not. Talking more raises cut pressure, so the
//! engine recommends *splitting* the pair. Across a 4,032-point sweep of the
//! weight space (section 7), `recommend()` returns `MergeRecommended` zero
//! times, while the underlying merge signal is set and then discarded in
//! 1,244 of them. The merge half of the coherence loop is unreachable here.
//!
//! Two further things about the implementation are worth stating plainly:
//!
//! * `rvm-wasm` validates modules and manages a 7-state agent lifecycle.
//!   It does not execute WebAssembly -- there is no interpreter or JIT in
//!   the crate. "Running" is a state label, not running code.
//!
//! * The split signal is *cut pressure* -- the ratio of a partition's
//!   outward edge weight to its total edge weight. There is no trust input
//!   anywhere in `rvm-coherence`. Partitions separate because their traffic
//!   points elsewhere, not because a trust score dropped.

use rvm_coherence::pressure::evaluate_merge;
use rvm_coherence::{CoherenceDecision, DefaultCoherenceEngine};
use rvm_types::{CoherenceScore, CutPressure, PartitionId, WitnessRecord};
use rvm_wasm::agent::{AgentConfig, AgentManager, AgentState};
use rvm_wasm::validate_module;
use rvm_witness::WitnessLog;

const LOG: usize = 64;
const MAX_AGENTS: usize = 8;

/// Smallest legal WebAssembly module: magic + version, no sections.
const EMPTY_WASM: [u8; 8] = [0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00];

/// A module with a type section, so validation reports something.
const TYPED_WASM: [u8; 12] = [
    0x00, 0x61, 0x73, 0x6D, // \0asm
    0x01, 0x00, 0x00, 0x00, // version 1
    0x01, 0x02, 0x01, 0x00, // section 1 (type), size 2, count 1, ...
];

fn rule(title: &str) {
    println!("\n\x1b[1m{title}\x1b[0m");
    println!("{}", "-".repeat(title.len()));
}

fn decision_str(d: CoherenceDecision) -> String {
    match d {
        CoherenceDecision::NoAction => "NoAction".into(),
        CoherenceDecision::SplitRecommended { partition, pressure } => format!(
            "\x1b[35mSplitRecommended\x1b[0m p{} (pressure {} bp)",
            partition.as_u32(),
            pressure.as_fixed()
        ),
        CoherenceDecision::MergeRecommended { a, b, mutual_coherence } => format!(
            "\x1b[32mMergeRecommended\x1b[0m p{}+p{} (mutual {} bp)",
            a.as_u32(),
            b.as_u32(),
            mutual_coherence.as_basis_points()
        ),
    }
}

/// Print the coherence graph: every active edge and per-node pressure.
fn dump_graph(engine: &DefaultCoherenceEngine, ids: &[PartitionId]) {
    let g = engine.graph();
    print!("      edges: ");
    let mut any = false;
    for (_e, from, to, w) in g.active_edges() {
        let f = g.partition_at(from).map_or(0, PartitionId::as_u32);
        let t = g.partition_at(to).map_or(0, PartitionId::as_u32);
        print!("p{f}->p{t}={w}  ");
        any = true;
    }
    if !any {
        print!("(none)");
    }
    println!();
    print!("      nodes: ");
    for id in ids {
        print!(
            "p{}[score {} bp, pressure {} bp]  ",
            id.as_u32(),
            engine.score(*id).as_basis_points(),
            engine.pressure(*id).as_fixed()
        );
    }
    println!();
}

fn main() {
    println!("\x1b[1mRVM Demo 6 — Two Agents That Get Closer\x1b[0m");
    println!("Communication reshapes the partition graph.");

    let log: WitnessLog<LOG> = WitnessLog::new();

    // ---------------------------------------------------------------
    rule("1. Validate the agent modules");
    // ---------------------------------------------------------------
    for (name, bytes) in [("empty", &EMPTY_WASM[..]), ("typed", &TYPED_WASM[..])] {
        match validate_module(bytes) {
            Ok(r) => println!(
                "  {name:<6} {} bytes -> valid, {} section(s)",
                bytes.len(),
                r.section_count
            ),
            Err(e) => println!("  {name:<6} {} bytes -> rejected ({e:?})", bytes.len()),
        }
    }
    // Corruption is caught: flip the magic.
    let mut bad = EMPTY_WASM;
    bad[1] = b'X';
    match validate_module(&bad) {
        Ok(_) => println!("  corrupt magic          -> accepted, which would be a bug"),
        Err(e) => println!("  corrupt magic          -> \x1b[31mrejected\x1b[0m ({e:?})"),
    }

    // ---------------------------------------------------------------
    rule("2. Spawn one agent into each partition");
    // ---------------------------------------------------------------
    let alpha = PartitionId::new(1);
    let beta = PartitionId::new(2);
    let mut agents: AgentManager<MAX_AGENTS> = AgentManager::new();

    let cfg_a = AgentConfig {
        badge: 0xA1,
        partition_id: alpha,
        max_memory_pages: 16,
    };
    let cfg_b = AgentConfig {
        badge: 0xB2,
        partition_id: beta,
        max_memory_pages: 16,
    };

    let a_id = agents.spawn(&cfg_a, &log).expect("spawn alpha agent");
    let b_id = agents.spawn(&cfg_b, &log).expect("spawn beta agent");
    agents.activate(a_id).expect("activate alpha");
    agents.activate(b_id).expect("activate beta");

    for (label, id, part) in [("alpha", a_id, alpha), ("beta", b_id, beta)] {
        let state = agents.get(id).map(|a| a.state);
        println!(
            "  {label:<6} agent {:#06x} in partition p{}  state={:?}",
            id.as_u32(),
            part.as_u32(),
            state.unwrap_or(AgentState::Terminated)
        );
    }

    // ---------------------------------------------------------------
    rule("3. Wire both partitions into the coherence engine");
    // ---------------------------------------------------------------
    let mut engine = DefaultCoherenceEngine::with_defaults(100);
    engine.add_partition(alpha).expect("track alpha");
    engine.add_partition(beta).expect("track beta");
    println!("  tracking {} partitions", engine.partition_count());
    println!("  mincut backend    : {}", engine.mincut_backend_name());
    println!("  coherence backend : {}", engine.coherence_backend_name());
    println!(
        "  thresholds        : split > {} bp, merge >= {} bp",
        rvm_coherence::SPLIT_THRESHOLD_BP,
        rvm_coherence::MERGE_COHERENCE_THRESHOLD_BP
    );

    let ids = [alpha, beta];

    // ---------------------------------------------------------------
    rule("4. Quiet: a trickle of cross-partition chatter");
    // ---------------------------------------------------------------
    // Each agent also does local work, which shows up as a self-loop and
    // holds cut pressure down.
    for epoch in 0..3 {
        engine.record_communication(alpha, alpha, 40).expect("alpha local work");
        engine.record_communication(beta, beta, 40).expect("beta local work");
        engine.record_communication(alpha, beta, 2).expect("alpha -> beta");
        engine.record_communication(beta, alpha, 2).expect("beta -> alpha");

        let decision = engine.tick(20);
        println!("  epoch {epoch}: {}", decision_str(decision));
        dump_graph(&engine, &ids);
    }


    // ---------------------------------------------------------------
    rule("5. Loud: the two agents start talking constantly");
    // ---------------------------------------------------------------
    // The headline claim is "when two agents start talking more, RVM moves
    // them closer". Watch what the engine actually recommends.
    for epoch in 3..8 {
        engine.record_communication(alpha, alpha, 10).expect("alpha local work");
        engine.record_communication(beta, beta, 10).expect("beta local work");
        engine.record_communication(alpha, beta, 150).expect("alpha -> beta");
        engine.record_communication(beta, alpha, 150).expect("beta -> alpha");

        let decision = engine.tick(20);
        println!("  epoch {epoch}: {}", decision_str(decision));
        dump_graph(&engine, &ids);
    }

    println!(
        "\n  \x1b[33mThat is a split, not a merge.\x1b[0m Cross-partition traffic is *external*\n\
         \x20 weight, and cut pressure is external/total -- so the harder two partitions\n\
         \x20 talk, the more the engine wants to pull them apart."
    );

    // ---------------------------------------------------------------
    rule("6. The merge signal fires -- and is then discarded");
    // ---------------------------------------------------------------
    // evaluate_merge is a public function. Ask it directly about the same
    // pair the engine just recommended splitting.
    let signal = evaluate_merge(alpha, beta, engine.graph());
    println!(
        "  evaluate_merge(p1, p2) -> mutual {} bp, should_merge = {}",
        signal.mutual_coherence.as_basis_points(),
        signal.should_merge
    );
    println!("  engine.recommend()     -> {}", decision_str(engine.recommend()));
    println!(
        "\n  Both are true at once. `recommend()` scans for a split candidate first\n\
         \x20 and returns on the first hit, so the merge branch below it is never\n\
         \x20 reached while any partition is over pressure."
    );

    // ---------------------------------------------------------------
    rule("7. Is a merge reachable at all? Search the space");
    // ---------------------------------------------------------------
    // Sweep internal (self-loop) and mutual weights for a two-partition
    // graph and count how often recommend() actually returns a merge.
    let vals: [u64; 8] = [0, 10, 25, 50, 100, 400, 1600, 3200];
    let (mut total, mut merges, mut shadowed) = (0usize, 0usize, 0usize);
    let mut closest: Option<(u64, u64, u64, u64, u32, u32, u16)> = None;

    for &ia in &vals {
        for &ib in &vals {
            for &mab in &vals {
                for &mba in &vals {
                    if mab == 0 && mba == 0 {
                        continue;
                    }
                    total += 1;

                    let mut e = DefaultCoherenceEngine::with_defaults(100);
                    e.add_partition(alpha).expect("track a");
                    e.add_partition(beta).expect("track b");
                    for (from, to, w) in [
                        (alpha, alpha, ia),
                        (beta, beta, ib),
                        (alpha, beta, mab),
                        (beta, alpha, mba),
                    ] {
                        if w > 0 {
                            e.record_communication(from, to, w).expect("record");
                        }
                    }

                    let decision = e.tick(20);
                    let sig = evaluate_merge(alpha, beta, e.graph());
                    let (pa, pb) = (e.pressure(alpha).as_fixed(), e.pressure(beta).as_fixed());

                    if matches!(decision, CoherenceDecision::MergeRecommended { .. }) {
                        merges += 1;
                    } else if sig.should_merge {
                        shadowed += 1;
                        let bp = sig.mutual_coherence.as_basis_points();
                        if closest.map_or(true, |(.., cpa, _, _)| pa < cpa) {
                            closest = Some((ia, ib, mab, mba, pa, pb, bp));
                        }
                    }
                }
            }
        }
    }

    println!("  searched {total} weight combinations");
    println!("    MergeRecommended actually returned : \x1b[1m{merges}\x1b[0m");
    println!("    merge signal set, split returned instead : {shadowed}");
    if let Some((ia, ib, mab, mba, pa, pb, bp)) = closest {
        println!(
            "    lowest-pressure shadowed case: self({ia},{ib}) cross({mab},{mba})\n\
             \x20     -> pressure p1={pa} p2={pb}, mutual={bp} bp, split threshold 8000"
        );
    }

    // ---------------------------------------------------------------
    rule("8. Why merge is unreachable here");
    // ---------------------------------------------------------------
    println!(
        "  Across the sweep, mutual coherence and cut pressure track each other:\n\
         \x20 mutual_bp is roughly pressure_bp - 5000. Mutual coherence divides the\n\
         \x20 pair's shared weight by the sum of both totals, so it can only get\n\
         \x20 large when nearly all of both partitions' traffic is with each other --\n\
         \x20 which is exactly the condition that maximises external/total.\n\
         \n\
         \x20 So `should_merge` (>= 4000 bp) implies pressure around 9000 bp, which is\n\
         \x20 over the 8000 bp split threshold, and `recommend()` returns the split.\n\
         \x20 The merge arm is live code that this control flow cannot reach.\n\
         \n\
         \x20 pressure.rs already carries a comment about the merge threshold being\n\
         \x20 lowered from 7000 to 4000 because \"a threshold of 7000 (70%) was\n\
         \x20 unreachable, preventing merge signals from ever firing\". That fixed\n\
         \x20 evaluate_merge; the shadowing in recommend() is the half still open.\n\
         \n\
         \x20 \x1b[33mBottom line:\x1b[0m the split half of the coherence loop demonstrably works.\n\
         \x20 The merge half -- the half the project leads with -- does not fire at\n\
         \x20 this revision. Fixing it means ranking split and merge candidates\n\
         \x20 against each other rather than returning on the first split found."
    );

    let mut buf = [WitnessRecord::zeroed(); LOG];
    let n = log.snapshot(&mut buf);
    println!(
        "\n  witness records from the agent lifecycle: {n} (TaskSpawn x2)\n  \
         \x1b[33mnote:\x1b[0m the coherence engine emits no witnesses -- graph mutation is not\n\
         \x20       a witnessed privileged action at this revision."
    );

    let _ = (CutPressure::ZERO, CoherenceScore::MAX);
}
