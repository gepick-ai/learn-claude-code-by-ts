import { clsx } from "clsx"
import { type ComponentProps, useMemo } from "react"
import sprite from "./icon/sprite.svg"
import { iconNames, type IconName } from "./icon/types"

export type ProviderIconProps = ComponentProps<"svg"> & {
  id: string
}

export function ProviderIcon(props: ProviderIconProps) {
  const { id, className, ...rest } = props
  const resolved = useMemo<IconName | "synthetic">(() => (iconNames.includes(id as IconName) ? (id as IconName) : "synthetic"), [id])
  return (
    <svg data-component="provider-icon" {...rest} className={clsx(className)}>
      <use href={`${sprite}#${resolved}`} />
    </svg>
  )
}
