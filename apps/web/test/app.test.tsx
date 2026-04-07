import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.js";

describe("web shell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the workbench heading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503
      })
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Paperclip Analyst Workbench" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Bootstrap fallback in use.");
  });
});
