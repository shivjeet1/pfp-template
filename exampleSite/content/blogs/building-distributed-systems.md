---
author: "Cid Kagenou"
title: "Consensus"
slug: "building-distributed-systems"
date: 2026-08-20
tags: ["Wisdom of the Shadows", "Consensus"]
description: "How a world without magic solved disagreement."
summary: "My cells cannot all see each other. This is how another world solved it. No magic required."
weight: 10
type: post
image: "/images/avatar.png"
showTableOfContents: true
draft: false
---

Building systems that span multiple physical nodes introduces a fundamental reality of computing: networks are unreliable, disks fail, and processes crash unpredictably.

To design resilient applications, software architects must build upon solid mathematical foundations rather than wishful thinking.

## 1. The CAP Theorem & PACELC

Every distributed system engineer is familiar with Eric Brewer's **CAP Theorem**:
- **Consistency (Linearizability):** Every read receives the most recent write or an error.
- **Availability:** Every non-failing node returns a non-error response without guarantee of latest data.
- **Partition Tolerance:** The system continues to operate despite arbitrary network dropouts.

Because network partitions ($P$) are physical inevitabilities, the real choice is between $CP$ (consistency over availability) and $AP$ (availability over consistency).

Daniel Abadi extended this with the **PACELC** model:
> *If there is a **P**artition, trade off **A**vailability vs **C**onsistency; **E**lse, trade off **L**atency vs **C**onsistency.*

---

## 2. Consensus via Raft

While Paxos has historically served as the theoretical gold standard, **Raft** was designed explicitly for understandability:
1. **Leader Election:** Heartbeat timers ensure that a cluster swiftly elects a new leader if the current one drops.
2. **Log Replication:** The leader receives client proposals, appends them to its log, and broadcasts them via `AppendEntries` RPCs.
3. **Safety:** An entry is only committed once replicated across a strict majority quorum ($\lfloor N/2 \rfloor + 1$).

---

## 3. Storage Engine Considerations: LSM-Trees vs. B-Trees

For high-throughput write workloads, traditional B-Trees suffer from random disk I/O. **Log-Structured Merge-Trees (LSM-Trees)** solve this:
- **MemTable:** Writes are appended to an in-memory sorted data structure (skip list or red-black tree).
- **WAL (Write-Ahead Log):** Ensures durability across crash restarts.
- **SSTables (Sorted String Tables):** Immutable disk files created by flushing the MemTable. Background compaction merges overlapping SSTables and prunes tombstones.

---

## Conclusion

Understanding these fundamental primitives enables engineers to select the appropriate trade-offs between throughput, latency, and correctness.
