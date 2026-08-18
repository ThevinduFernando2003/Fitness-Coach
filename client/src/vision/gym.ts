import { angle, LM, type Point, vis } from "./angles";

export class RepMachine {
  private down = false;
  update(inDown: boolean, inUp: boolean): boolean {
    if (!this.down && inDown) {
      this.down = true;
      return false;
    }
    if (this.down && inUp) {
      this.down = false;
      return true;
    }
    return false;
  }
  reset() {
    this.down = false;
  }
}

const machines = new Map<string, RepMachine>();

function machine(key: string): RepMachine {
  if (!machines.has(key)) machines.set(key, new RepMachine());
  return machines.get(key)!;
}

export function resetRepMachines() {
  machines.clear();
}

export type GymResult = { rep: boolean; cue: string; formOk: boolean };

export function scoreGym(key: string, lm: Point[]): GymResult {
  const g = (i: number) => lm[i];
  const ls = g(LM.lShoulder);
  const rs = g(LM.rShoulder);
  const le = g(LM.lElbow);
  const re = g(LM.rElbow);
  const lw = g(LM.lWrist);
  const rw = g(LM.rWrist);
  const lh = g(LM.lHip);
  const rh = g(LM.rHip);
  const lk = g(LM.lKnee);
  const rk = g(LM.rKnee);
  const la = g(LM.lAnkle);
  const ra = g(LM.rAnkle);
  const m = machine(key);

  if (key === "squat" && vis(lh) && vis(lk) && vis(la)) {
    const knee = (angle(lh, lk, la) + angle(rh, rk, ra)) / 2;
    const formOk = knee < 110 || knee > 155;
    const cue = knee > 110 && knee < 155 ? "Go deeper, then stand tall." : "";
    return { rep: m.update(knee < 100, knee > 155), cue, formOk };
  }
  if (key === "push_up" && vis(ls) && vis(le) && vis(lw)) {
    const elbow = (angle(ls, le, lw) + angle(rs, re, rw)) / 2;
    const cue = elbow > 100 && elbow < 150 ? "Lower until elbows bend, then lock out." : "";
    return { rep: m.update(elbow < 90, elbow > 150), cue, formOk: elbow < 90 || elbow > 150 };
  }
  if (key === "lunge" && vis(lk) && vis(rk)) {
    const front = Math.min(angle(lh, lk, la), angle(rh, rk, ra));
    const back = Math.max(angle(lh, lk, la), angle(rh, rk, ra));
    return { rep: m.update(front < 110 && back > 140, front > 150), cue: "Bend the front knee, then return.", formOk: true };
  }
  if (key === "jumping_jack" && vis(lw) && vis(rw) && vis(la) && vis(ra)) {
    const open = Math.abs(lw.x - rw.x) > 0.35 && Math.abs(la.x - ra.x) > 0.18;
    const closed = Math.abs(lw.x - rw.x) < 0.2;
    return { rep: m.update(open, closed), cue: "Open and close arms and legs together.", formOk: true };
  }
  if (key === "crunch" && vis(ls) && vis(lh) && vis(lk)) {
    const torso = (angle(ls, lh, lk) + angle(rs, rh, rk)) / 2;
    return { rep: m.update(torso < 130, torso > 155), cue: "Ribs toward hips, then lower with control.", formOk: true };
  }
  return { rep: false, cue: "", formOk: true };
}
