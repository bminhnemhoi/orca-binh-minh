import { beforeEach, describe, expect, it, vi } from 'vitest'

const cpus = vi.fn()
vi.mock('electron', () => ({
  app: {
    getAppMetrics: () => [
      { memory: { workingSetSize: 1024 } },
      { memory: { workingSetSize: 2048 } }
    ]
  }
}))
vi.mock('node:os', () => ({ default: { cpus: () => cpus() } }))
vi.mock('../memory/host-memory', () => ({
  collectHostMemory: async () => ({
    totalMemory: 16,
    usedMemory: 12,
    cpuCoreCount: 8
  })
}))

const { sampleCornerHostLoad, resetCornerHostLoadForTests } = await import('./host-load')

function core(user: number, idle: number) {
  return { times: { user, nice: 0, sys: 0, idle, irq: 0 } }
}

describe('sampleCornerHostLoad', () => {
  beforeEach(() => {
    resetCornerHostLoadForTests()
  })

  it('has no CPU reading on the first sample, then reports busy share since the last one', async () => {
    cpus.mockReturnValueOnce([core(100, 900), core(100, 900)])
    expect(await sampleCornerHostLoad()).toEqual({
      cpuPercent: null,
      cpuCoreCount: 8,
      memoryUsedBytes: 12,
      memoryTotalBytes: 16,
      orcaAppBytes: 3 * 1024 * 1024
    })
    // +300 busy and +100 idle across both cores since the first sample: 75% busy.
    cpus.mockReturnValueOnce([core(250, 950), core(250, 950)])
    expect((await sampleCornerHostLoad()).cpuPercent).toBe(75)
  })

  it('reports null rather than dividing by zero when no time passed', async () => {
    cpus.mockReturnValue([core(1, 1)])
    await sampleCornerHostLoad()
    expect((await sampleCornerHostLoad()).cpuPercent).toBeNull()
  })
})
