import { expect, it } from "vite-plus/test";
import { createHistory } from "../src/demolition-history.js";

function piece(id, x = 0) {
  return {
    id,
    model: 0,
    region: { x: 0, y: 0, width: 120, height: 80 },
    body: { position: { x, y: 20, z: 30 }, quaternion: { x: 0.1, y: 0.2, z: 0.3, w: 0.9 } },
    opacity: 0.7,
    scale: 0.8,
  };
}
it("replays recorded XYZ, rotation, scale and opacity rather than simulating a different return path", () => {
  const history = createHistory();
  const original = piece(1);
  history.record(0, new Map([[1, original]]));
  original.body.position.x = 100;
  original.body.quaternion.y = 0.5;
  original.opacity = 0.2;
  history.record(1, new Map([[1, original]]), 0.5);
  expect(history.at(1).pieces.get(1).body.position.x).toBe(100);
  expect(history.at(1).opacity).toBe(0.5);
  const rewound = history.at(0).pieces.get(1);
  expect(rewound.body.position).toEqual({ x: 0, y: 20, z: 30 });
  expect(rewound.body.quaternion.y).toBeCloseTo(0.2, 6);
  expect(rewound.opacity).toBeCloseTo(0.7, 6);
  expect(rewound.scale).toBeCloseTo(0.8, 6);
});
it("reverses fracture topology, resurrecting parents after their children and dust", () => {
  const history = createHistory();
  history.record(0, new Map([[1, piece(1)]]));
  history.record(
    1,
    new Map([
      [2, piece(2)],
      [3, piece(3)],
    ]),
  );
  history.record(2, new Map());
  expect([...history.at(2).pieces.keys()]).toEqual([]);
  expect([...history.at(1).pieces.keys()]).toEqual([2, 3]);
  expect([...history.at(0).pieces.keys()]).toEqual([1]);
  expect(history.at(0).pieces.get(1).region).toEqual({ x: 0, y: 0, width: 120, height: 80 });
});
it("bounds history while preserving both the origin and latest frame", () => {
  const history = createHistory();
  const body = piece(1);
  for (let index = 0; index < 1000; index++) {
    body.body.position.x = index;
    history.record(index / 30, new Map([[1, body]]));
  }
  expect(history.length).toBe(750);
  expect(history.duration).toBe(999 / 30);
  expect(history.at(0).pieces.get(1).body.position.x).toBe(0);
  expect(history.at(history.duration).pieces.get(1).body.position.x).toBe(999);
  history.dispose();
  history.dispose();
  expect(history.length).toBe(0);
  expect(history.duration).toBe(0);
  expect(history.at(0).pieces.size).toBe(0);
});
