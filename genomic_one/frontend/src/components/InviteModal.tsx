"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";

const INVITE_STORAGE_KEY = "genomic-one-invites";

const ROLES = [
  "Research Scientist",
  "Clinical Pharmacologist",
  "Genetic Counselor",
  "Endocrinologist",
  "Platform Admin",
];

const DEFAULT_INVITES = [
  { email: "dr.okafor@princeton.edu", role: "Genetic Counselor", status: "pending" as const },
  { email: "p.sharma@aiims.in", role: "Endocrinologist", status: "pending" as const },
];

interface Invite {
  email: string;
  role: string;
  status: "pending" | "sent";
}

function getInvites(): Invite[] {
  try {
    const raw = localStorage.getItem(INVITE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_INVITES;
}

function saveInvites(invites: Invite[]) {
  try {
    localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(invites));
  } catch {
    // ignore
  }
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInvites(getInvites());
      setSuccessMsg("");
      setEmail("");
      setRole("");
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!email || !role) return;
    const updated = [...invites, { email, role, status: "sent" as const }];
    setInvites(updated);
    saveInvites(updated);
    setSuccessMsg(`Invitation sent to ${email}`);
    setEmail("");
    setRole("");

    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      classNames={{
        base: "bg-[var(--bg-surface)] border border-[var(--bg-border)]",
        header: "border-b border-[var(--bg-border)]",
        footer: "border-t border-[var(--bg-border)]",
        closeButton: "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Invite Colleague
            </h2>
            <p className="text-xs font-normal mt-0.5" style={{ color: "var(--text-muted)" }}>
              Add team members to the advisory board
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="py-5 space-y-4">
          {successMsg && (
            <div
              className="text-xs px-3 py-2 rounded"
              style={{
                background: "rgba(0,229,160,0.1)",
                border: "1px solid rgba(0,229,160,0.2)",
                color: "var(--safla-green)",
              }}
            >
              {successMsg}
            </div>
          )}

          <div className="flex gap-3">
            <Input
              label="Email address"
              type="email"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              className="flex-1"
              classNames={{
                inputWrapper: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
                label: "text-[var(--text-muted)]",
                input: "text-[var(--text-primary)]",
              }}
            />
            <Select
              label="Role"
              variant="bordered"
              className="w-[200px]"
              selectedKeys={role ? [role] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected) setRole(String(selected));
              }}
              classNames={{
                trigger: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
                label: "text-[var(--text-muted)]",
                value: "text-[var(--text-primary)]",
              }}
            >
              {ROLES.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-wider block mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Pending Invites
              </span>
              <div className="space-y-2">
                {invites.map((inv, i) => (
                  <div
                    key={`${inv.email}-${i}`}
                    className="flex items-center justify-between px-3 py-2 rounded"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                    }}
                  >
                    <div>
                      <span
                        className="text-sm block"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {inv.email}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {inv.role}
                      </span>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={inv.status === "sent" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {inv.status === "sent" ? "Sent" : "Pending"}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={onClose}
            className="font-mono text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Close
          </Button>
          <Button
            onPress={handleSend}
            isDisabled={!email || !role}
            className="font-mono text-xs font-semibold"
            style={{
              background: "var(--accent-teal)",
              color: "#090E1A",
            }}
          >
            Send Invite
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
