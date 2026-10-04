import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { compile } from "tailwindcss";
import { BookOpenText } from "lucide-react";
import { expect, it } from "vitest";
import RootLayout from "@/app/layout";
import SidebarNavItem from "@/components/layout/SidebarNavItem";
import ProgressLegend from "@/features/progress/ProgressLegend";
import MessageBubble from "@/features/session/MessageBubble";
import { messages } from "@/lib/client/fixtures";

it("compiles real global CSS without shrinking core Tailwind dimensions", async () => {
  const path = resolve("src/app/globals.css");
  const compiler = await compile(await readFile(path, "utf8"), {
    base: dirname(path), from: path,
    loadStylesheet: async (id, base) => {
      const imported = id === "tailwindcss" ? resolve("node_modules/tailwindcss/index.css") :
        id === "tw-animate-css" ? resolve("node_modules/tw-animate-css/dist/tw-animate.css") : resolve(base, id);
      return { path: imported, base: dirname(imported), content: await readFile(imported, "utf8") };
    },
  });
  const dimensions = [["w-5", "width", 5], ["w-16", "width", 16], ["w-56", "width", 56],
    ["h-14", "height", 14], ["h-10", "height", 10], ["p-4", "padding", 4], ["gap-6", "gap", 6]] as const;
  const css = compiler.build(dimensions.map(([name]) => name));
  for (const [name, property, units] of dimensions) {
    const rule = css.match(new RegExp("\\." + name + "\\s*\\{([^}]+)\\}"))?.[1];
    expect(rule, name).toMatch(new RegExp(property + ":\\s*calc\\(0\\.25rem\\s*\\*\\s*" + units + "\\)"));
  }
});

it("renders the collapsed rail and progress legend under the actual root provider", () => {
  const children = React.createElement(React.Fragment, null,
    React.createElement(SidebarNavItem, { href: "/", icon: BookOpenText, label: "Học với AI", selected: true, collapsed: true }),
    React.createElement(ProgressLegend));
  const html = renderToString(React.createElement(RootLayout, null, children));
  expect(html).toContain('aria-label="Học với AI"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("Cần củng cố");
});

it("renders completed Solve steps once instead of duplicating their serialized transcript", () => {
  const sample = messages.find(message => message.solve)!;
  expect(sample).toBeDefined();
  const message = { ...sample, content: "DUPLICATE_SOLVE_TRANSCRIPT", status: "completed" as const };
  const html = renderToString(React.createElement(MessageBubble, { message }));
  expect(html).not.toContain("DUPLICATE_SOLVE_TRANSCRIPT");
  expect(html).toContain("Các bước giải");
  expect((html.match(/Nguyên tắc \/ Công thức/g) ?? [])).toHaveLength(sample.solve!.steps.length);
});
