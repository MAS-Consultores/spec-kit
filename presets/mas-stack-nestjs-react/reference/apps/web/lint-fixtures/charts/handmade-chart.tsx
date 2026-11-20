export function Chart(points: number[]): React.ReactElement {
  const d = points.map((y, index) => `L${String(index)} ${String(y)}`).join(" ");
  return (
    <svg>
      <path d={d} />
    </svg>
  );
}

export function paint(canvas: { getContext(kind: "2d"): unknown }): void {
  canvas.getContext("2d");
}
