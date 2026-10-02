import cv2
import json
import sys
import numpy as np
from scipy.ndimage import median_filter

clip = sys.argv[1]
quads = np.float32(json.load(open(sys.argv[2])))
out_json = sys.argv[3]

steps = np.arange(-0.03, 0.081, 0.005)
unit = np.float32([[0, 0], [1, 0], [1, 1], [0, 1]])


def grow(q, a, b):
    H = cv2.getPerspectiveTransform(unit, np.float32(q))
    r = np.float32([[-a, -b], [1 + a, -b], [1 + a, 1 + b], [-a, 1 + b]]).reshape(-1, 1, 2)
    return cv2.perspectiveTransform(r, H).reshape(-1, 2)
cap = cv2.VideoCapture(clip)
best = []
i = 0


def edge_points(q, n=60):
    pts = []
    for a in range(4):
        p0 = q[a]
        p1 = q[(a + 1) % 4]
        t = np.linspace(0.12, 0.88, n)[:, None]
        pts.append(p0 + (p1 - p0) * t)
    return np.vstack(pts)


while True:
    ok, frame = cap.read()
    if not ok or i >= len(quads):
        break
    gray = cv2.GaussianBlur(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (0, 0), 1.2).astype(np.float32)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1)
    mag = cv2.magnitude(gx, gy)
    q = quads[i]
    top = (0, 0, -1e9)
    for sx in steps:
        for sy in steps:
            cand = grow(q, sx, sy)
            pts = edge_points(cand)
            xs = np.clip(pts[:, 0].astype(int), 0, mag.shape[1] - 1)
            ys = np.clip(pts[:, 1].astype(int), 0, mag.shape[0] - 1)
            score = mag[ys, xs].mean()
            if score > top[2]:
                top = (sx, sy, score)
    best.append(top[:2])
    i += 1

best = np.array(best)
sx = median_filter(best[:, 0], size=9, mode="nearest")
sy = median_filter(best[:, 1], size=9, mode="nearest")
kernel = np.ones(5) / 5
sx = np.convolve(np.pad(sx, 2, mode="edge"), kernel, mode="valid")
sy = np.convolve(np.pad(sy, 2, mode="edge"), kernel, mode="valid")

out = [grow(q, sx[i], sy[i]).tolist() for i, q in enumerate(quads[:len(sx)])]

json.dump(out, open(out_json, "w"))
print(out_json, "grow x", round(sx.min(), 3), "-", round(sx.max(), 3), "scale y", round(sy.min(), 3), "-", round(sy.max(), 3))
