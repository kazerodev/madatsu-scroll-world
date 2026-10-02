import cv2
import json
import subprocess
import sys
import numpy as np

clip = sys.argv[1]
quads = json.load(open(sys.argv[2]))
card_path = sys.argv[3]
out_path = sys.argv[4]
fade = json.loads(sys.argv[5]) if len(sys.argv) > 5 else None

card = cv2.imread(card_path, cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
ch, cw = card.shape[:2]
src = np.float32([[0, 0], [cw, 0], [cw, ch], [0, ch]])
card_lum = cv2.cvtColor((card[:, :, :3] * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).mean() / 255.0

cap = cv2.VideoCapture(clip)
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

enc = subprocess.Popen([
    "ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
    "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
    "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", out_path
], stdin=subprocess.PIPE)

i = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    q = np.float32(quads[min(i, len(quads) - 1)])
    strength = 1.0
    if fade:
        strength = float(np.interp(i, fade[0], fade[1]))
    if strength > 0:
        M = cv2.getPerspectiveTransform(src, q)
        warped = cv2.warpPerspective(card, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        alpha = cv2.GaussianBlur(warped[:, :, 3], (0, 0), 1.0)
        rgb = cv2.GaussianBlur(warped[:, :, :3], (0, 0), 0.6)

        f = frame.astype(np.float32) / 255.0
        lum = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        region = alpha > 0.5
        if region.sum() > 50:
            mean_lum = lum[region].mean()
            soft = cv2.GaussianBlur(lum, (0, 0), 40)
            shade = np.clip(soft / max(mean_lum, 1e-3), 0.55, 1.35)
            spec = np.clip(lum - cv2.GaussianBlur(lum, (0, 0), 12) - 0.04, 0, 1) * 1.6
            tint = f[region].mean(axis=0) / max(f[region].mean(), 1e-3)
            tint = 0.75 + 0.25 * tint
            gain = np.clip(mean_lum / max(card_lum, 1e-3), 0.55, 1.1)
            comp = rgb * tint[None, None, :] * gain * shade[:, :, None] + spec[:, :, None]
            a = (alpha * strength)[:, :, None]
            f = f * (1 - a) + np.clip(comp, 0, 1) * a
        frame = (np.clip(f, 0, 1) * 255).astype(np.uint8)
    enc.stdin.write(frame.tobytes())
    i += 1

enc.stdin.close()
enc.wait()
print(out_path, i, "frames")
