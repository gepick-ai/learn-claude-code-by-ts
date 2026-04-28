import { createPortal } from "react-dom"
import { type RefObject } from "react"
import { Icon } from "../icon"

export interface FileSearchBarProps {
  pos: () => { top: number; right: number }
  query: () => string
  index: () => number
  count: () => number
  setInput: RefObject<HTMLInputElement | null>
  onInput: (value: string) => void
  onKeyDown: (event: KeyboardEvent) => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function FileSearchBar(props: FileSearchBarProps) {
  return createPortal(
    <div
      data-component="file-search"
      style={{
        top: `${props.pos().top}px`,
        right: `${props.pos().right}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Icon name="magnifying-glass" size="small" data-slot="file-search-icon" />
      <input
        ref={props.setInput}
        placeholder="Find"
        value={props.query()}
        data-slot="file-search-input"
        onChange={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={(e) => props.onKeyDown(e.nativeEvent as KeyboardEvent)}
      />
      <div data-slot="file-search-count">{props.count() ? `${props.index() + 1}/${props.count()}` : "0/0"}</div>
      <div data-slot="file-search-nav">
        <button type="button" data-slot="file-search-nav-btn" disabled={props.count() === 0} aria-label="Previous match" onClick={props.onPrev}>
          <Icon name="chevron-down" size="small" data-slot="file-search-up" />
        </button>
        <button type="button" data-slot="file-search-nav-btn" disabled={props.count() === 0} aria-label="Next match" onClick={props.onNext}>
          <Icon name="chevron-down" size="small" />
        </button>
      </div>
      <button type="button" data-slot="file-search-close" aria-label="Close search" onClick={props.onClose}>
        <Icon name="close-small" size="small" />
      </button>
    </div>,
    document.body,
  )
}
