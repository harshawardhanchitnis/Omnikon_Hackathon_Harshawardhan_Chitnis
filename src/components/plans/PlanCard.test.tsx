import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { demoPlans } from "@/data/demo-fixtures";
import { PlanCard } from "./PlanCard";

describe("PlanCard", () => {
  it("shows the plan context and routes to its editor", () => {
    const plan = demoPlans[0]!;
    render(
      <MemoryRouter>
        <PlanCard plan={plan} onClone={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: plan.title })).toBeInTheDocument();
    expect(screen.getByText("Grade 6 · Science")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open plan/i })).toHaveAttribute(
      "href",
      `/plans/${plan.id}/edit`
    );
  });
});
