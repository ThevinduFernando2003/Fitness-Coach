import { angle, LM, type Point, vis } from "./angles";

export type YogaResult = { match: boolean; score: number; cue: string; label: string };

function clampScore(hits: number, total: number, cue: string, label: string): YogaResult {
  const score = Math.round((hits / total) * 100);
  return { match: score >= 60, score, cue: score >= 60 ? "Hold." : cue, label };
}

export function scoreYoga(key: string, lm: Point[]): YogaResult {
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
  if (![ls, rs, lh, rh, lk, rk].every((p) => vis(p))) {
    return { match: false, score: 0, cue: "Step back so we can see your full body.", label: "unknown" };
  }

  const lKnee = angle(lh, lk, la);
  const rKnee = angle(rh, rk, ra);
  const lHip = angle(ls, lh, lk);
  const rHip = angle(rs, rh, rk);
  const lElbow = vis(le, 0.3) && vis(lw, 0.3) ? angle(ls, le, lw) : 170;
  const rElbow = vis(re, 0.3) && vis(rw, 0.3) ? angle(rs, re, rw) : 170;

  switch (key) {
    case "mountain":
      return clampScore(
        [lKnee > 160, rKnee > 160, Math.abs(ls.y - rs.y) < 0.08].filter(Boolean).length,
        3,
        "Stand tall, legs straight, shoulders level.",
        "mountain",
      );
    case "chair":
      return clampScore(
        [lKnee < 140 && lKnee > 70, rKnee < 140 && rKnee > 70, lHip < 140].filter(Boolean).length,
        3,
        "Sit back, knees bent, chest lifted.",
        "chair",
      );
    case "tree": {
      const oneBent = (lKnee < 140 && rKnee > 155) || (rKnee < 140 && lKnee > 155);
      return clampScore([oneBent, vis(lw) || vis(rw)].filter(Boolean).length, 2, "Stand on one leg; other foot to calf or thigh.", "tree");
    }
    case "warrior_ii": {
      const frontBent = (lKnee < 130 && rKnee > 150) || (rKnee < 130 && lKnee > 150);
      const arms = vis(lw) && vis(rw) ? Math.abs(lw.y - rw.y) < 0.12 : false;
      return clampScore([frontBent, arms].filter(Boolean).length, 2, "Bend the front knee; arms in a T.", "warrior_ii");
    }
    case "downward_dog": {
      const hipsHigh = (lh.y + rh.y) / 2 < (ls.y + rs.y) / 2;
      const legs = lKnee > 140 && rKnee > 140;
      return clampScore([hipsHigh, legs].filter(Boolean).length, 2, "Lift the hips, straighten the legs.", "downward_dog");
    }
    case "cobra": {
      const chestUp = (ls.y + rs.y) / 2 < (lh.y + rh.y) / 2;
      const elbows = lElbow > 130 && rElbow > 130;
      return clampScore([chestUp, elbows].filter(Boolean).length, 2, "Lift the chest, hips stay down.", "cobra");
    }
    case "triangle": {
      const wide = Math.abs(la.x - ra.x) > 0.25;
      const straight = lKnee > 150 && rKnee > 150;
      return clampScore([wide, straight].filter(Boolean).length, 2, "Long stance, both legs straight, torso open.", "triangle");
    }
    case "child": {
      const hipsBack = (lh.y + rh.y) / 2 > (lk.y + rk.y) / 2 - 0.05;
      return clampScore([hipsBack, vis(lw) || vis(rw)].filter(Boolean).length, 2, "Hips toward heels, arms reach or rest.", "child");
    }
    case "plank": {
      const line = Math.abs((ls.y + rs.y) / 2 - (lh.y + rh.y) / 2) < 0.12;
      const legs = lKnee > 150 && rKnee > 150;
      return clampScore([line, legs].filter(Boolean).length, 2, "Keep a straight line from shoulders to heels.", "plank");
    }
    default:
      return { match: false, score: 0, cue: "", label: "unknown" };
  }
}
