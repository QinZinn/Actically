/** Collect bounded API pages without exceeding the frozen 100-item limit. */
export async function allPages<T>(page: (query: { limit: number; offset: number }) => Promise<T[]>): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; offset <= 10000; offset += 100) {
    const batch = await page({ limit: 100, offset });
    items.push(...batch);
    if (batch.length < 100) return items;
  }
  throw new Error("Danh sách vượt giới hạn tải. Hãy chọn một bộ học nhỏ hơn.");
}
