import os from 'node:os'
import { app } from 'electron'
import { collectHostMemory } from '../memory/host-memory'
import type { CornerHostLoad } from '../../shared/binhminh-corner-host-load'

type CpuTimes = { idle: number; total: number }

let previous: CpuTimes | null = null

function readCpuTimes(): CpuTimes {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.idle + t.irq
  }
  return { idle, total }
}

/** Why getAppMetrics: Electron already tracks its own processes, so this costs no process scan. */
function readOrcaAppBytes(): number {
  try {
    return app.getAppMetrics().reduce((sum, metric) => sum + metric.memory.workingSetSize * 1024, 0)
  } catch {
    return 0
  }
}

/**
 * Whole-machine CPU and RAM for the corner gauge.
 *
 * Why not the memory snapshot: on Windows that runs a PowerShell process sweep, far too heavy to
 * poll for a gauge. This reads kernel counters only: os.cpus() deltas between calls plus the same
 * host memory figures the status bar uses. The first call has no delta, so CPU is null.
 */
export async function sampleCornerHostLoad(): Promise<CornerHostLoad> {
  const now = readCpuTimes()
  let cpuPercent: number | null = null
  if (previous) {
    const total = now.total - previous.total
    const idle = now.idle - previous.idle
    if (total > 0) {
      cpuPercent = Math.min(100, Math.max(0, (1 - idle / total) * 100))
    }
  }
  previous = now
  const memory = await collectHostMemory()
  return {
    cpuPercent,
    cpuCoreCount: memory.cpuCoreCount,
    memoryUsedBytes: memory.usedMemory,
    memoryTotalBytes: memory.totalMemory,
    orcaAppBytes: readOrcaAppBytes()
  }
}

export function resetCornerHostLoadForTests(): void {
  previous = null
}
