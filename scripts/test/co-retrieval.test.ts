import { describe, expect, it, vi } from "vitest";
import { coRetrieveCompanions } from "../../packages/agent-loop/src/index.js";

const ref = `kb:${"a".repeat(64)}`;

describe("knowledge procedure companion retrieval", () => {
  it("reads each window once and emits each neighboring span once", async () => {
    const source = "support.md";
    const seeds = [2, 4].map(line => ({
      articleRef: ref, source, title: "Support", heading: "", startLine: line, endLine: line, excerpt: "Admitted"
    }));
    const read = vi.fn(() => Promise.resolve({
      trust: "reference_only", articleRef: ref, source, title: "Support",
      content: "# Support\none\n\nTwo\n\n## Next step\nDo the next step.",
      startLine: 1, endLine: 7, totalLines: 10
    }));
    expect(await coRetrieveCompanions(seeds, read)).toEqual([
      expect.objectContaining({ source, startLine: 6, endLine: 7 })
    ]);
    expect(read).toHaveBeenCalledExactlyOnceWith({ articleRef: ref, startLine: 1, maxLines: 120 });
  });
  it("retrieves the reinstall section beside an admitted version field", async () => {
    const matches = await coRetrieveCompanions([{
      articleRef: ref, source: "panel/config/startup.md", title: "啟動設定", heading: "MINECRAFT 版本",
      startLine: 4, endLine: 5, excerpt: "#### MINECRAFT 版本\n\n    - 可以更改您伺服器的 Minecraft 版本"
    }], () => Promise.resolve({ trust: "reference_only", articleRef: ref, source: "panel/config/startup.md", title: "啟動設定",
      content: "# 啟動設定\n\n#### MINECRAFT 版本\n\n    - 可以更改您伺服器的 Minecraft 版本\n\n#### JAR\n\n    - 可以更改 JAR\n\n#### BUILD TYPE(Forge)\n\n    - 選擇版本\n\n設定完成後在面板點擊「設定」，並選擇「重新安裝伺服器」",
      startLine: 1, endLine: 16, totalLines: 16 }));
    expect(matches.some(match => match.excerpt.includes("重新安裝伺服器"))).toBe(true);
  });

  it("retrieves the DNS procedure beside an admitted incident section", async () => {
    const matches = await coRetrieveCompanions([{
      articleRef: ref, source: "debug/connection.md", title: "連線問題排查", heading: "4. 仍無法連線或延遲很高時回報",
      startLine: 9, endLine: 10, excerpt: "incident"
    }], () => Promise.resolve({ trust: "reference_only", articleRef: ref, source: "debug/connection.md", title: "連線問題排查",
      content: "# 連線問題排查\n\n### 設定 Google DNS 並清除快取\n\n將 DNS 設定為 8.8.8.8。\n\nipconfig /flushdns\n\n### 4. 仍無法連線或延遲很高時回報\n\n請回報問題。",
      startLine: 1, endLine: 10, totalLines: 10 }));
    expect(matches.some(match => match.excerpt.includes("ipconfig /flushdns"))).toBe(true);
  });
});
