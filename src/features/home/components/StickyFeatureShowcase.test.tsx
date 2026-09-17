import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StickyFeatureShowcase from "./StickyFeatureShowcase";
import { features } from "../content";

afterEach(cleanup);

test("keeps existing capabilities and adds missing workflows once in the Home bento", () => {
  const { container } = render(<StickyFeatureShowcase />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  for (const feature of features) {
    const title = feature.title.replace(/<[^>]*>/g, "");
    expect(screen.getAllByRole("heading", { name: title })).toHaveLength(1);
  }
  expect(screen.getByText("08")).toBeInTheDocument();
  expect(container.querySelectorAll("img")).toHaveLength(4);
  expect(container.querySelector("img:not([src])")).toBeNull();
});
