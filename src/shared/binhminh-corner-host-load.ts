export type CornerHostLoad = {
  /** Whole-machine CPU busy percent since the previous sample; null on the first sample. */
  cpuPercent: number | null
  cpuCoreCount: number
  memoryUsedBytes: number
  memoryTotalBytes: number
}

export type CornerPhotoImportResult = {
  ids: string[]
  /** Files that were not images Orca can show. */
  skipped: number
}

export type CornerPhoto = { data: Uint8Array; mimeType: string }
