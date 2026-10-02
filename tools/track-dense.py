import cv2
import json
import sys
import numpy as np

clip = sys.argv[1]
quad = np.float32(json.loads(sys.argv[2]))
out_json = sys.argv[3]

frames = []
cap = cv2.VideoCapture(clip)
while True:
    ok, frame = cap.read()
    if not ok:
        break
    frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))

dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST)
dis.setFinestScale(1)
dis.setPatchSize(16)
dis.setGradientDescentIterations(25)
dis.setVariationalRefinementIterations(5)


def step(a, b, q):
    flow = dis.calc(a, b, None)
    c = q.mean(axis=0)
    inner = (q - c) * 0.85 + c
    m = np.zeros(a.shape, np.uint8)
    cv2.fillConvexPoly(m, inner.astype(np.int32), 255)
    ys, xs = np.nonzero(m)
    pick = np.random.default_rng(0).choice(len(xs), min(4000, len(xs)), replace=False)
    xs, ys = xs[pick], ys[pick]
    src = np.float32(np.stack([xs, ys], 1))
    dst = src + flow[ys, xs]
    H, _ = cv2.findHomography(src, dst, cv2.RANSAC, 1.5, maxIters=3000)
    return cv2.perspectiveTransform(q.reshape(-1, 1, 2), H).reshape(-1, 2)


quads = [quad.tolist()]
for i in range(1, len(frames)):
    quad = np.float32(step(frames[i - 1], frames[i], quad))
    quads.append(quad.tolist())
json.dump(quads, open(out_json, "w"))
