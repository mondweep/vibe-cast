# PC Hardware Discovery & Linux Install Prep

**Date:** 2026-05-10
**Owner:** mondweep
**Purpose:** Snapshot of the current Windows 11 PC, drive layout, and Linux compatibility analysis — basis for an upcoming dual-boot Linux install into existing unallocated space.

---

## 1. CPU & Architecture

| Property | Value |
|---|---|
| `PROCESSOR_ARCHITECTURE` | `AMD64` (x64) |
| `Win32_Processor.Architecture` | `9` (= x64) |
| CPU model | AMD Ryzen 7 5700X, 8-Core (Zen 3) |

**Implication:** This is a standard 64-bit x86 system, **not ARM64**. Use the **x64** installer for any software, including Linux ISOs.

**Verification commands used:**
```powershell
$env:PROCESSOR_ARCHITECTURE
(Get-CimInstance Win32_Processor).Architecture
(Get-CimInstance Win32_Processor).Name
```

---

## 2. Storage & Partition Layout

**Single physical disk:** Crucial P310 NVMe SSD, ~1.82 TB usable (2 TB advertised), GPT partition style.

### Current partitions on Disk 0

| # | Type | Drive | Size | Offset | Purpose |
|---|---|---|---|---|---|
| 1 | System | — | 0.20 GB | 0 GB | EFI System Partition (boot loader) |
| 2 | Reserved | — | 0.02 GB | 0.20 GB | Microsoft Reserved (MSR) |
| 3 | Basic | **C:** | 983.21 GB | 0.21 GB | Windows 11 Pro install |
| 4 | Recovery | — | 0.69 GB | 1862.33 GB | Windows Recovery Environment |

### Unallocated space — Linux landing zone

There is a **~879 GB gap** between the end of C: (offset ~983 GB) and the Recovery partition (offset 1862 GB). This is the space previously freed up for Linux. **No Linux partition has been created yet.**

When the Linux installer runs, it should detect this as free space and offer "Install alongside Windows".

### Verification commands used

```powershell
Get-Disk | Format-Table Number, FriendlyName, Size, PartitionStyle -AutoSize
Get-Partition | Format-Table DiskNumber, PartitionNumber, DriveLetter, Type,
    @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}},
    @{N='Offset(GB)';E={[math]::Round($_.Offset/1GB,2)}} -AutoSize
Get-Volume | Format-Table DriveLetter, FileSystemLabel, FileSystem,
    @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}},
    @{N='Free(GB)';E={[math]::Round($_.SizeRemaining/1GB,2)}}, DriveType -AutoSize
```

Visual check: `diskmgmt.msc`

---

## 3. Hardware Inventory

| Component | Detected |
|---|---|
| System | ASUS (System Product Name) |
| Motherboard | ASUS TUF Gaming A520M-PLUS WIFI, Rev X.0x |
| RAM | 32 GB (34,269,458,432 bytes) |
| **GPU** | **NVIDIA GeForce RTX 5050** (4 GB VRAM, driver 32.0.15.9579) |
| **Wi-Fi** | **Realtek 8821CE** Wireless 802.11ac PCI-E NIC |
| Ethernet | Realtek PCIe GbE Family Controller |
| Audio | Realtek HD Audio + NVIDIA HDMI Audio + USB Audio |
| BIOS | American Megatrends, version **3636**, dated 2026-04-01 |
| Boot mode | UEFI (system disk is GPT) |
| Secure Boot | Status check requires elevated PowerShell — **verify in BIOS** |

### Verification commands used

```powershell
Get-CimInstance Win32_ComputerSystem
Get-CimInstance Win32_BaseBoard
Get-CimInstance Win32_VideoController
Get-NetAdapter
Get-CimInstance Win32_SoundDevice
Get-CimInstance Win32_BIOS
Confirm-SecureBootUEFI    # needs admin
```

---

## 4. Linux Compatibility Analysis

Most components are well-supported on modern Linux (Ryzen Zen 3 CPU, A520 chipset, NVMe SSD, Realtek Ethernet, 32 GB RAM, UEFI/GPT). **Two components are the only real risk areas.**

### Risk 1 — NVIDIA RTX 5050 (Blackwell)

- The RTX 50-series is **very new** and only works on Linux with the **NVIDIA proprietary driver 570 or newer**.
- The open-source `nouveau` driver does **not** properly support RTX 50-series yet.
- Distros released before early 2025 ship older NVIDIA drivers — expect black screen or VESA fallback.
- Need a distro with kernel 6.8+ and NVIDIA driver 570+ available.

**Safe distro choices:**
- Ubuntu 25.04, or Ubuntu 24.04.2+ with HWE kernel (570 driver via `ubuntu-drivers`)
- Fedora 41 / 42 (recent NVIDIA via RPM Fusion)
- **Pop!_OS 22.04 NVIDIA edition** — System76 ships NVIDIA drivers preinstalled (recommended for NVIDIA-on-Linux beginners)

**Avoid:** Debian Stable, older LTS releases, nouveau-only distros.

### Risk 2 — Realtek 8821CE Wi-Fi

- Historically painful on Linux. Modern kernels (6.x) handle it via the `rtw88` driver, but it can be flaky.
- May not work during installation — **plug in Ethernet for the install** as a safety net.
- Worst case fallback: out-of-tree `rtl8821ce` DKMS driver.

### Verification: Live USB test

The reliable way to confirm everything works **before installing**:

1. Download the chosen distro ISO.
2. Flash to a USB stick with **Rufus** (Windows) or **balenaEtcher**.
3. Reboot, press F8 during ASUS boot screen, select USB.
4. Choose **"Try Ubuntu/Fedora"** (do **not** install yet).
5. From the Live session, verify:
   - Display at native resolution → GPU OK
   - Wi-Fi sees networks → Realtek driver loaded
   - YouTube audio plays → audio OK
   - Bluetooth pairing → BT firmware OK
   - Suspend/resume → ACPI OK

If everything works in Live, it'll work after install. If not, try a different distro before committing.

### Compatibility lookup resources

- `linux-hardware.org/?view=search` — community probe database; search for `RTX 5050`, `8821CE`, motherboard model
- `ubuntu.com/certified` — Ubuntu's officially tested hardware list
- `wiki.archlinux.org` — best per-component technical reference, even if not using Arch
- Phoronix — first to cover new NVIDIA GPU Linux support

---

## 5. Recommended Next Steps

1. **In BIOS (Del at boot):** check Secure Boot state. If you'd rather avoid MOK enrollment for the NVIDIA driver, disable Secure Boot. Note BIOS version 3636 (2026-04-01) for reference.
2. **Pick a distro** — recommended: **Pop!_OS NVIDIA edition** or **Ubuntu 25.04**.
3. **Flash a Live USB** with Rufus.
4. **Boot the Live USB and run the verification checklist above** — display, Wi-Fi, audio, suspend.
5. If Live session is healthy, run the installer and select **"Install alongside Windows"** (or manual partitioning into the ~879 GB unallocated region).
6. Have **Ethernet connected** during install in case Wi-Fi driver isn't loaded by the installer.
7. Post-install: confirm GRUB shows both Windows and Linux on next boot.

---

## Session log

This document was generated from a Claude Code session on 2026-05-10 that:

- Confirmed the CPU is x64 (AMD Ryzen 7 5700X)
- Mapped the existing GPT partition layout and identified ~879 GB unallocated space already prepared for Linux
- Inventoried all Linux-relevant hardware
- Flagged NVIDIA RTX 5050 driver requirement (570+) and Realtek 8821CE Wi-Fi historical issues
- Recommended Pop!_OS NVIDIA edition or Ubuntu 25.04 as starting points

**To resume:** check out this branch from `mondweep/vibe-cast`, re-read this file, and proceed with the Live USB test step.
