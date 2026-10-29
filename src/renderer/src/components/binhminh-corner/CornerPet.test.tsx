// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveBinhMinhCornerSettings } from '../../../../shared/binhminh-corner-settings'

const playPetVoice = vi.fn()
const revealDashboardAgent = vi.fn()
vi.mock('./pet-voice', () => ({ playPetSound: (...args: unknown[]) => playPetVoice(...args) }))
vi.mock('../dashboard/reveal-dashboard-agent', () => ({
  revealDashboardAgent: (...args: unknown[]) => revealDashboardAgent(...args)
}))

const { CornerPet } = await import('./CornerPet')

const target = { repoId: 'r', worktreeId: 'w', tabId: 't', leafId: 'l' }

function renderPet(overrides: {
  waiting?: number
  working?: number
  target?: typeof target | null
}) {
  // Why flat: the test DOM has no WebGL; the 3D pet has its own fallback to this view.
  const settings = resolveBinhMinhCornerSettings({
    pet: { species: 'dog', name: 'Lu', render: 'flat' }
  })
  return render(
    <CornerPet
      settings={{ ...settings, lateNightFromHour: null }}
      working={overrides.working ?? 0}
      waiting={overrides.waiting ?? 0}
      finished={0}
      lowestQuotaLeft={80}
      quotaLabel={null}
      attentionTarget={overrides.target ?? null}
    />
  )
}

afterEach(() => {
  cleanup()
  playPetVoice.mockReset()
  revealDashboardAgent.mockReset()
})

describe('CornerPet', () => {
  it('barks and shows a heart when petted', () => {
    const { container } = renderPet({})
    fireEvent.click(screen.getByRole('button', { name: 'Vuốt ve Lu' }))
    expect(playPetVoice).toHaveBeenCalledWith(expect.objectContaining({ id: 'dog' }), 0.6)
    expect(container.querySelector('svg.bm-pet')?.hasAttribute('data-petted')).toBe(true)
  })

  it('jumps to the waiting agent instead of being petted', () => {
    renderPet({ waiting: 2, target })
    expect(screen.getByText('Có 2 agent đang chờ bạn')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mở agent đang chờ' }))
    expect(revealDashboardAgent).toHaveBeenCalledWith(target)
    expect(playPetVoice).not.toHaveBeenCalled()
  })

  it('runs faster with more agents working', () => {
    const { container } = renderPet({ working: 4 })
    const svg = container.querySelector('svg.bm-pet')
    expect(svg?.getAttribute('data-mood')).toBe('work')
    expect(svg?.getAttribute('data-speed')).toBe('3')
    expect(screen.getByText('4 đang làm')).toBeTruthy()
  })
})
