/** 多处同时需要禁止 body 滚动（抽屉 + 模态）时用引用计数，避免先后解锁错乱。 */
let lockCount = 0
let savedOverflow = ""

export function acquireBodyScrollLock(): void {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
  }
  lockCount += 1
}

export function releaseBodyScrollLock(): void {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow
  }
}
