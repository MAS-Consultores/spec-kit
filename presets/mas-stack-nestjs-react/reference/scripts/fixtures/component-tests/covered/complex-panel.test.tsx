import { render, screen } from "@testing-library/react";
import { ComplexPanel } from "./complex-panel";

it("covers the high branch", () => {
  render(<ComplexPanel />);
});
