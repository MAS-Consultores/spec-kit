import confetti from "canvas-confetti";

export function celebrate(): void {
  void confetti({ particleCount: 40 });
}
