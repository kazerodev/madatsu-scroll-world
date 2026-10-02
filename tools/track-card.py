import cv2
import json
import sys
import numpy as np

clip = sys.argv[1]
quad = np.float32(json.loads(sys.argv[2])).reshape(-1, 1, 2)
out_json = sys.argv[3]

cap = cv2.VideoCapture(clip)
ok, frame = cap.read()
prev = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
quads = [quad.reshape(-1, 2).tolist()]


def inner_mask(shape, q, shrink=0.12):
    c = q.reshape(-1, 2).mean(axis=0)
    small = (q.reshape(-1, 2) - c) * (1 - shrink) + c
    m = np.zeros(shape, np.uint8)
    cv2.fillConvexPoly(m, small.astype(np.int32), 255)
    return m


while True:
    ok, frame = cap.read()
    if not ok:
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    pts = cv2.goodFeaturesToTrack(prev, 400, 0.005, 6, mask=inner_mask(prev.shape, quad))
    if pts is not None and len(pts) >= 12:
        nxt, st, err = cv2.calcOpticalFlowPyrLK(prev, gray, pts, None, winSize=(31, 31), maxLevel=4)
        good_a = pts[st == 1]
        good_b = nxt[st == 1]
        if len(good_a) >= 12:
            H, inl = cv2.findHomography(good_a, good_b, cv2.RANSAC, 2.0)
            if H is not None:
                quad = cv2.perspectiveTransform(quad, H)
    quads.append(quad.reshape(-1, 2).tolist())
    prev = gray

json.dump(quads, open(out_json, "w"))
print(clip, len(quads), "frames, last quad", [[round(x) for x in p] for p in quads[-1]])
