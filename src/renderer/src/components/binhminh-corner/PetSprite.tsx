import type { PetMood } from './corner-logic'
import type { PetSpecies } from './pet-species'

const INK = '#2a2230'

function Ears({ species }: { species: PetSpecies }): React.JSX.Element | null {
  const { body, light, accent } = species
  switch (species.ears) {
    case 'pointy':
      return (
        <g className="pet-ears">
          <path d="M19 21 L21 6 L30 14 Z" fill={body} />
          <path d="M45 21 L43 6 L34 14 Z" fill={body} />
          <path d="M21.6 17 L22.6 9.6 L27.4 14 Z" fill={light} />
          <path d="M42.4 17 L41.4 9.6 L36.6 14 Z" fill={light} />
        </g>
      )
    case 'tall-pointy':
      return (
        <g className="pet-ears">
          <path d="M18 22 L19 3 L30.5 13 Z" fill={body} />
          <path d="M46 22 L45 3 L33.5 13 Z" fill={body} />
          <path d="M18.7 9.5 L19 3 L23.4 7 Z" fill={accent} />
          <path d="M45.3 9.5 L45 3 L40.6 7 Z" fill={accent} />
          <path d="M21 17.5 L21.6 10.5 L27 14 Z" fill={light} />
          <path d="M43 17.5 L42.4 10.5 L37 14 Z" fill={light} />
        </g>
      )
    case 'long':
      return (
        <g className="pet-ears">
          <ellipse cx="26" cy="8" rx="3.8" ry="10.5" transform="rotate(-9 26 8)" fill={body} />
          <ellipse cx="38" cy="8" rx="3.8" ry="10.5" transform="rotate(9 38 8)" fill={body} />
          <ellipse cx="26" cy="8.5" rx="1.8" ry="7.4" transform="rotate(-9 26 8.5)" fill={accent} />
          <ellipse cx="38" cy="8.5" rx="1.8" ry="7.4" transform="rotate(9 38 8.5)" fill={accent} />
        </g>
      )
    case 'round':
      return (
        <g className="pet-ears">
          <circle cx="21" cy="16" r="5.2" fill={accent} />
          <circle cx="43" cy="16" r="5.2" fill={accent} />
        </g>
      )
    case 'small-round':
      return (
        <g className="pet-ears">
          <circle cx="21.5" cy="17" r="3.8" fill={accent} />
          <circle cx="42.5" cy="17" r="3.8" fill={accent} />
          <circle cx="21.5" cy="17" r="2" fill={light} />
          <circle cx="42.5" cy="17" r="2" fill={light} />
        </g>
      )
    default:
      return null
  }
}

/** Floppy ears hang over the sides of the head, so they draw after it. */
function FloppyEars({ species }: { species: PetSpecies }): React.JSX.Element | null {
  if (species.ears !== 'floppy') {
    return null
  }
  return (
    <g className="pet-ears pet-ears-floppy">
      <ellipse
        cx="18.8"
        cy="25"
        rx="4.4"
        ry="9"
        transform="rotate(18 18.8 25)"
        fill={species.accent}
      />
      <ellipse
        cx="45.2"
        cy="25"
        rx="4.4"
        ry="9"
        transform="rotate(-18 45.2 25)"
        fill={species.accent}
      />
    </g>
  )
}

function Tail({ species }: { species: PetSpecies }): React.JSX.Element {
  const { body, light } = species
  switch (species.tail) {
    case 'curl':
      return (
        <path
          className="pet-tail"
          d="M44 51 C54 51 57 41 52 35 C50 33 47.5 35 49.5 37.5 C52.5 41.5 50.5 47.5 44 47.5 Z"
          fill={body}
        />
      )
    case 'bushy':
      return (
        <g className="pet-tail">
          <path
            d="M42 53 C57 55 61 40 54.5 31.5 C51.5 28.5 48 31.5 50 35.5 C52.5 41 49.5 46.5 42 46.5 Z"
            fill={body}
          />
          <path
            d="M54.5 31.5 C51.5 28.5 48 31.5 50 35.5 C51.8 34.6 53.4 33.4 54.5 31.5 Z"
            fill={light}
          />
        </g>
      )
    case 'wag':
      return (
        <path
          className="pet-tail"
          d="M44 49 C50.5 47 54 41.5 52.6 37 C51.8 35 49.5 35.8 49.6 38 C49.8 41.4 47.4 44.4 43 45.4 Z"
          fill={body}
        />
      )
    case 'puff':
      return <circle className="pet-tail" cx="46.5" cy="52" r="4.2" fill={light} />
    default:
      return <ellipse className="pet-tail" cx="45" cy="52.5" rx="3.2" ry="2.6" fill={body} />
  }
}

function Markings({ species }: { species: PetSpecies }): React.JSX.Element | null {
  const { light, accent } = species
  switch (species.markings) {
    case 'fox-cheeks':
      return (
        <path
          d="M18.6 29 C22 37.5 28 39.5 32 39.5 C36 39.5 42 37.5 45.4 29 C41 32.2 37 31.2 32 35 C27 31.2 23 32.2 18.6 29 Z"
          fill={light}
        />
      )
    case 'muzzle':
      return <ellipse cx="32" cy="33.2" rx="6.2" ry="4.6" fill={light} />
    case 'panda-eyes':
      return (
        <g>
          <ellipse
            cx="26"
            cy="27.4"
            rx="3.7"
            ry="4.6"
            transform="rotate(-22 26 27.4)"
            fill={accent}
          />
          <ellipse
            cx="38"
            cy="27.4"
            rx="3.7"
            ry="4.6"
            transform="rotate(22 38 27.4)"
            fill={accent}
          />
        </g>
      )
    case 'cheek-pouches':
      return (
        <g>
          <ellipse cx="21.8" cy="32" rx="4.6" ry="3.6" fill={light} />
          <ellipse cx="42.2" cy="32" rx="4.6" ry="3.6" fill={light} />
        </g>
      )
    default:
      return null
  }
}

function Star({ x, y, size }: { x: number; y: number; size: number }): React.JSX.Element {
  const s = size
  return (
    <path
      d={`M${x} ${y - s} Q${x + s * 0.25} ${y - s * 0.25} ${x + s} ${y} Q${x + s * 0.25} ${y + s * 0.25} ${x} ${y + s} Q${x - s * 0.25} ${y + s * 0.25} ${x - s} ${y} Q${x - s * 0.25} ${y - s * 0.25} ${x} ${y - s} Z`}
      fill="#ffd54a"
    />
  )
}

/**
 * One sitting pet, drawn in a 64×64 box.
 *
 * Why every motion lives in CSS (binhminh-corner.css) on transform/opacity only: those run on the
 * compositor, so an animating pet does not trigger layout or paint of the sidebar.
 */
export function PetSprite({
  species,
  mood,
  speed,
  petted,
  paused,
  size = 72
}: {
  species: PetSpecies
  mood: PetMood
  speed: 1 | 2 | 3
  petted: boolean
  paused: boolean
  size?: number
}): React.JSX.Element {
  const pandaEyes = species.markings === 'panda-eyes'
  const closedStroke = pandaEyes ? '#ffffff' : INK
  return (
    <svg
      className="bm-pet"
      data-mood={mood}
      data-speed={speed}
      data-petted={petted || undefined}
      data-paused={paused || undefined}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`${species.label}: ${mood}`}
    >
      <ellipse className="pet-shadow" cx="32" cy="59.5" rx="15" ry="2.6" />
      <g className="pet-figure">
        <Tail species={species} />
        <g className="pet-body">
          <ellipse cx="32" cy="46.5" rx="14" ry="11.5" fill={species.body} />
          <ellipse cx="32" cy="49.5" rx="8.5" ry="7" fill={species.light} />
        </g>
        <ellipse
          className="pet-paw pet-paw-l"
          cx="26.5"
          cy="56.2"
          rx="3.7"
          ry="2.6"
          fill={pandaEyes ? species.accent : species.body}
        />
        <ellipse
          className="pet-paw pet-paw-r"
          cx="37.5"
          cy="56.2"
          rx="3.7"
          ry="2.6"
          fill={pandaEyes ? species.accent : species.body}
        />
        <g className="pet-head">
          <Ears species={species} />
          <ellipse cx="32" cy="27" rx="14" ry="12.5" fill={species.body} />
          <Markings species={species} />
          <FloppyEars species={species} />
          <g className="pet-blush" fill="#ff8fa3">
            <ellipse cx="23" cy="32.4" rx="2.4" ry="1.4" />
            <ellipse cx="41" cy="32.4" rx="2.4" ry="1.4" />
          </g>
          <g className="pet-eyes-open">
            {pandaEyes ? (
              <>
                <circle cx="26.5" cy="27.5" r="2.5" fill="#ffffff" />
                <circle cx="37.5" cy="27.5" r="2.5" fill="#ffffff" />
              </>
            ) : null}
            <circle cx="26.5" cy="27.5" r="2.1" fill={INK} />
            <circle cx="37.5" cy="27.5" r="2.1" fill={INK} />
            <circle cx="27.2" cy="26.7" r="0.75" fill="#ffffff" />
            <circle cx="38.2" cy="26.7" r="0.75" fill="#ffffff" />
          </g>
          <g
            className="pet-eyes-closed"
            stroke={closedStroke}
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M24.2 28 Q26.5 30 28.8 28" />
            <path d="M35.2 28 Q37.5 30 39.8 28" />
          </g>
          <g
            className="pet-eyes-happy"
            stroke={closedStroke}
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M24.2 28.8 Q26.5 25.8 28.8 28.8" />
            <path d="M35.2 28.8 Q37.5 25.8 39.8 28.8" />
          </g>
          <g className="pet-brows" stroke={INK} strokeWidth="1.1" strokeLinecap="round">
            <path d="M23.8 23.6 L28.6 22.2" />
            <path d="M40.2 23.6 L35.4 22.2" />
          </g>
          <path
            d="M30.5 31.1 Q32 30.5 33.5 31.1 Q32 33 30.5 31.1 Z"
            fill={species.markings === 'fox-cheeks' ? species.accent : '#3a2a2e'}
          />
          <path
            className="pet-mouth"
            d="M29.6 33.5 Q30.8 34.7 32 33.5 Q33.2 34.7 34.4 33.5"
            stroke={INK}
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse className="pet-mouth-open" cx="32" cy="34.4" rx="1.7" ry="1.4" fill="#7a2e3a" />
        </g>
      </g>
      <g className="pet-zzz">
        <text x="46" y="15" fontSize="6.5">
          z
        </text>
        <text x="50.5" y="9.5" fontSize="5">
          z
        </text>
      </g>
      <g className="pet-bubble">
        <rect x="45" y="1.5" width="12" height="11" rx="3.5" fill="#ffb020" />
        <path d="M47.5 12 L46 15.5 L50.5 12 Z" fill="#ffb020" />
        <text x="51" y="10.6" fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#1b1b1b">
          !
        </text>
      </g>
      <g className="pet-sparkles">
        <Star x={11} y={16} size={3.2} />
        <Star x={53.5} y={20} size={2.6} />
        <Star x={9} y={36} size={2.2} />
      </g>
      <path
        className="pet-sweat"
        d="M46.2 16.5 C47.9 19.3 48.4 21 47.1 22.3 C45.8 23.4 44.2 22.1 44.9 20.3 Z"
        fill="#7cc7ff"
      />
      <path
        className="pet-heart"
        d="M32 12.5 C29.5 10 25.8 11.6 27 14.6 C27.8 16.6 32 19 32 19 C32 19 36.2 16.6 37 14.6 C38.2 11.6 34.5 10 32 12.5 Z"
        fill="#ff5c7a"
      />
    </svg>
  )
}
