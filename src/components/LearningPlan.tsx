"use client";

import { useState, useEffect } from "react";
import { PHASES, RESOURCES, STORAGE_KEY } from "@/lib/constants";

export default function LearningPlan() {
  const [activePhase, setActivePhase] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"plan" | "resources">("plan");
  const [storageStatus, setStorageStatus] = useState<
    "loading" | "idle" | "saving" | "saved" | "error"
  >("loading");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function loadProgress() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setChecked(JSON.parse(stored));
        }
        setStorageStatus("idle");
      } catch (e) {
        console.error("Failed to load progress:", e);
        setStorageStatus("idle");
      }
      setLoaded(true);
    }
    loadProgress();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let timeoutId: NodeJS.Timeout;
    async function save() {
      setStorageStatus("saving");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
        setStorageStatus("saved");
        timeoutId = setTimeout(() => setStorageStatus("idle"), 2200);
      } catch (e) {
        console.error("Failed to save progress:", e);
        setStorageStatus("error");
      }
    }
    save();
    return () => clearTimeout(timeoutId);
  }, [checked, loaded]);

  const toggle = (id: string) =>
    setChecked((c) => ({ ...c, [id]: !c[id] }));

  const allTasks = PHASES.flatMap((p) =>
    p.weeks_data.flatMap((w) => w.tasks)
  );
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => checked[t.id]).length;
  const pct = Math.round((completedTasks / totalTasks) * 100);

  const phase = PHASES[activePhase];
  const statusColors = {
    loading: "#4A6A8A",
    idle: "#2A4A6A",
    saving: "#F5A623",
    saved: "#4CAF50",
    error: "#E84B3A",
  };
  const statusLabels = {
    loading: "Loading…",
    idle: "Auto-saved",
    saving: "Saving…",
    saved: "Saved ✓",
    error: "Save failed",
  };

  if (!loaded) {
    return (
      <div
        style={{
          fontFamily: "monospace",
          background: "#0A0E14",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⛓</div>
          <div style={{ fontSize: 12, color: "#4A6A8A" }}>
            Loading your saved progress…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
        background: "#0A0E14",
        minHeight: "100vh",
        color: "#C8D6E5",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0A0E14}
        ::-webkit-scrollbar-thumb{background:#2A3A4A;border-radius:2px}
        .tr{transition:background 0.12s}
        .tr:hover{background:rgba(255,255,255,0.025)!important}
        .pb{transition:all 0.18s;cursor:pointer;border:none}
        .pb:hover{opacity:0.88}
        .rc{transition:all 0.14s}
        .rc:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.18)!important}
        .nt{transition:all 0.12s;cursor:pointer}
        .nt:hover{opacity:0.75}
        .cb{transition:transform 0.12s}
        .cb:hover{transform:scale(1.12)}
        a{color:inherit;text-decoration:none}
        a:hover{text-decoration:underline}
      `}</style>

      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg,#0D1A26,#0A1520)",
          borderBottom: "1px solid #1C2E3E",
          padding: "22px 30px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            paddingBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.2em",
                color: "#3A5A7A",
                marginBottom: 5,
                textTransform: "uppercase",
              }}
            >
              MONDWEEP CHAKRAVORTY · GROWTH RELATIONS MANAGER
            </div>
            <h1
              style={{
                fontFamily: "'Libre Baskerville',Georgia,serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#E8F4FF",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              DeFi Suitability Learning Plan
            </h1>
            <div style={{ fontSize: 9, color: "#3A5A7A", marginTop: 4 }}>
              8-week programme · 4 phases · {totalTasks} tasks · progress saved
              permanently
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 8,
                color: "#3A5A7A",
                letterSpacing: "0.1em",
                marginBottom: 3,
              }}
            >
              OVERALL PROGRESS
            </div>
            <div style={{ fontSize: 34, fontWeight: 600, color: "#00C2CB", lineHeight: 1 }}>
              {pct}
              <span style={{ fontSize: 14 }}>%</span>
            </div>
            <div style={{ fontSize: 9, color: "#3A5A7A", marginTop: 2 }}>
              {completedTasks} of {totalTasks} complete
            </div>
            <div
              style={{
                width: 130,
                height: 3,
                background: "#1C2E3E",
                borderRadius: 2,
                marginTop: 7,
                marginLeft: "auto",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#00C2CB,#7C5CBF)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 22,
            borderBottom: "1px solid #1C2E3E",
          }}
        >
          {(["plan", "resources"] as const).map((tab) => (
            <div
              key={tab}
              className="nt"
              onClick={() => setView(tab)}
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                paddingBottom: 9,
                fontWeight: 500,
                color: view === tab ? "#00C2CB" : "#3A5A7A",
                borderBottom:
                  view === tab
                    ? "2px solid #00C2CB"
                    : "2px solid transparent",
              }}
            >
              {tab === "plan" ? "Learning Plan" : "Resource Library"}
            </div>
          ))}
        </div>
      </div>

      {view === "plan" ? (
        <div style={{ display: "flex", minHeight: "calc(100vh - 130px)" }}>
          {/* SIDEBAR */}
          <div
            style={{
              width: 188,
              flexShrink: 0,
              background: "#080C11",
              borderRight: "1px solid #1C2E3E",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1 }}>
              {PHASES.map((p, i) => {
                const pTasks = p.weeks_data.flatMap((w) => w.tasks);
                const pDone = pTasks.filter((t) => checked[t.id]).length;
                const pp = Math.round((pDone / pTasks.length) * 100);
                const isActive = activePhase === i;
                return (
                  <button
                    key={p.id}
                    className="pb"
                    onClick={() => setActivePhase(i)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "11px 16px",
                      background: isActive ? p.bg : "transparent",
                      borderLeft: isActive
                        ? `3px solid ${p.color}`
                        : "3px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 7,
                        color: isActive ? p.color : "#1E3A5A",
                        letterSpacing: "0.15em",
                        marginBottom: 2,
                        textTransform: "uppercase",
                      }}
                    >
                      {p.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isActive ? "#E8F4FF" : "#3A5A7A",
                        fontWeight: 500,
                        marginBottom: 1,
                      }}
                    >
                      {p.title}
                    </div>
                    <div style={{ fontSize: 8, color: "#1E3A5A", marginBottom: 6 }}>
                      {p.weeks}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: "#1C2E3E",
                          borderRadius: 1,
                        }}
                      >
                        <div
                          style={{
                            width: `${pp}%`,
                            height: "100%",
                            background: pp === 100 ? "#4CAF50" : p.color,
                            borderRadius: 1,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 8,
                          color: pp === 100 ? "#4CAF50" : p.color,
                          minWidth: 26,
                        }}
                      >
                        {pp}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #1C2E3E",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: statusColors[storageStatus],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    color: statusColors[storageStatus],
                    letterSpacing: "0.05em",
                  }}
                >
                  {statusLabels[storageStatus]}
                </span>
              </div>
              <div style={{ fontSize: 7, color: "#1E3A5A", marginTop: 3 }}>
                Progress saved across sessions
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div style={{ flex: 1, padding: "22px 26px", overflowY: "auto" }}>
            {/* Phase banner */}
            <div
              style={{
                background: phase.bg,
                border: `1px solid ${phase.color}22`,
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  marginBottom: 9,
                }}
              >
                <span style={{ fontSize: 24 }}>{phase.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 7,
                      color: phase.color,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    {phase.label} · {phase.weeks}
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Libre Baskerville',serif",
                      fontSize: 17,
                      color: "#E8F4FF",
                    }}
                  >
                    {phase.title}
                  </h2>
                </div>
              </div>
              <p
                style={{
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: "#8AA8C4",
                  marginBottom: 9,
                }}
              >
                {phase.goal}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 7,
                    color: "#3A5A7A",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  JD Requirement:
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: phase.color,
                    fontStyle: "italic",
                  }}
                >
                  {phase.jdMap}
                </div>
              </div>
            </div>

            {/* Week blocks */}
            {phase.weeks_data.map((wk, wi) => {
              const wDone = wk.tasks.filter((t) => checked[t.id]).length;
              const allDone = wDone === wk.tasks.length;
              return (
                <div key={wi} style={{ marginBottom: 22 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        background: allDone ? "#4CAF50" : phase.color,
                        color: "#000",
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        padding: "3px 9px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                      }}
                    >
                      Week {wk.week}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#C8D6E5",
                        fontWeight: 500,
                      }}
                    >
                      {wk.title}
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: 8,
                        color: allDone ? "#4CAF50" : "#3A5A7A",
                      }}
                    >
                      {allDone
                        ? "✓ Complete"
                        : `${wDone} / ${wk.tasks.length}`}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #1C2E3E",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    {wk.tasks.map((task, ti) => {
                      const done = !!checked[task.id];
                      return (
                        <div
                          key={task.id}
                          className="tr"
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 11,
                            padding: "12px 15px",
                            borderBottom:
                              ti < wk.tasks.length - 1
                                ? "1px solid #111820"
                                : "none",
                            background: done
                              ? "rgba(0,194,203,0.035)"
                              : "transparent",
                          }}
                        >
                          <button
                            className="cb"
                            onClick={() => toggle(task.id)}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 3,
                              flexShrink: 0,
                              marginTop: 2,
                              background: done
                                ? phase.color
                                : "transparent",
                              border: `1.5px solid ${
                                done ? phase.color : "#2A4A6A"
                              }`,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {done && (
                              <span
                                style={{
                                  fontSize: 8,
                                  color: "#000",
                                  fontWeight: 900,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 11,
                                lineHeight: 1.65,
                                color: done ? "#2A4A6A" : "#C8D6E5",
                                textDecoration: done
                                  ? "line-through"
                                  : "none",
                                textDecorationColor: "#2A4A6A",
                              }}
                            >
                              {task.text}
                            </div>
                            {task.resource && (
                              <a
                                href={task.resource}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "inline-block",
                                  marginTop: 4,
                                  fontSize: 8,
                                  color: done
                                    ? "#1E3A5A"
                                    : phase.color,
                                }}
                              >
                                → {task.resource.replace("https://", "").split("/")[0]}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* RESOURCES VIEW */
        <div style={{ padding: "22px 30px" }}>
          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                fontFamily: "'Libre Baskerville',serif",
                fontSize: 19,
                color: "#E8F4FF",
                marginBottom: 4,
              }}
            >
              Resource Library
            </h2>
            <p style={{ fontSize: 10, color: "#3A5A7A" }}>
              All tools, platforms, and reading material — click any card to open
            </p>
          </div>
          {RESOURCES.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 26 }}>
              <div
                style={{
                  fontSize: 7,
                  color: "#00C2CB",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 9,
                  borderBottom: "1px solid #1C2E3E",
                  paddingBottom: 6,
                }}
              >
                {cat.category}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(230px,1fr))",
                  gap: 9,
                }}
              >
                {cat.items.map((item, ii) => (
                  <a
                    key={ii}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div
                      className="rc"
                      style={{
                        background: "#0D1520",
                        border: "1px solid #1C2E3E",
                        borderRadius: 6,
                        padding: "12px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#E8F4FF",
                          fontWeight: 500,
                          marginBottom: 3,
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#3A5A7A",
                          lineHeight: 1.5,
                        }}
                      >
                        {item.desc}
                      </div>
                      <div
                        style={{
                          fontSize: 7,
                          color: "#1E3A5A",
                          marginTop: 6,
                        }}
                      >
                        {item.url.replace("https://", "")}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div
        style={{
          borderTop: "1px solid #1C2E3E",
          padding: "9px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#080C11",
        }}
      >
        <div style={{ fontSize: 7, color: "#1E3A5A", letterSpacing: "0.1em" }}>
          {completedTasks} TASKS COMPLETE · {totalTasks - completedTasks} REMAINING · TARGET: Growth Relations Manager
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: statusColors[storageStatus],
            }}
          />
          <span
            style={{
              fontSize: 7,
              color: statusColors[storageStatus],
              letterSpacing: "0.08em",
            }}
          >
            {statusLabels[storageStatus].toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
