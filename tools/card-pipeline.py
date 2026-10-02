import json
import os
import sys
import subprocess
import numpy as np
from scipy.ndimage import gaussian_filter1d

T = "../tools"

seams = [
    [[836, 446], [1027, 411], [1127, 615], [921, 661]],
    [[652, 233], [1148, 168], [1376, 729], [778, 859]],
    [[893, 532], [1157, 458], [1474, 662], [1178, 771]],
    [[704, 458], [1078, 369], [1410, 685], [960, 836]],
    [[910, 796], [1054, 781], [1248, 822], [1070, 848]],
    [[765, 591], [1039, 544], [1422, 661], [1047, 743]],
    [[870, 364], [1116, 352], [1072, 769], [812, 757]],
    [[842, 289], [1201, 271], [1143, 847], [773, 836]],
]
extra = {
    "t2": {60: [[772, 666], [1043, 612], [1355, 752], [1034, 830]], 90: [[851, 774], [1049, 743], [1281, 806], [1051, 844]]},
    "s3": {30: [[853, 759], [1052, 731], [1274, 788], [1055, 824]], 60: [[818, 708], [1050, 675], [1304, 747], [1053, 793]], 90: [[777, 654], [1046, 612], [1386, 700], [1046, 763]]},
    "t3": {45: [[750, 281], [1139, 260], [1322, 762], [849, 817]], 60: [[769, 229], [1141, 229], [1160, 730], [743, 730]], 75: [[818, 290], [1124, 289], [1095, 743], [767, 734]], 90: [[866, 350], [1122, 341], [1084, 764], [796, 752]]},
}
clips = ["s1", "t1", "s2", "t2", "s3", "t3", "s4"]


def track(video, start, out):
    subprocess.run(["python3", f"{T}/track-dense.py", video, json.dumps(start), out], check=True, stdout=subprocess.DEVNULL)
    return np.array(json.load(open(out)))


def cut(src, a, b, out, reverse=False):
    vf = f"trim=start_frame={a}:end_frame={b + 1},setpts=PTS-STARTPTS"
    if reverse:
        vf += ",reverse"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", vf, "-c:v", "libx264", "-crf", "10", out], check=True)


only = sys.argv[1:]
for i, clip in enumerate(clips):
    if only and clip not in only:
        continue
    keys = {0: seams[i], 120: seams[i + 1]}
    keys.update(extra.get(clip, {}))
    frames = sorted(keys)
    result = np.zeros((121, 4, 2), np.float32)
    for a, b in zip(frames[:-1], frames[1:]):
        cut(f"final/{clip}.mp4", a, b, "comp/seg.mp4")
        cut(f"final/{clip}.mp4", a, b, "comp/seg_rev.mp4", reverse=True)
        forward = track("comp/seg.mp4", keys[a], "comp/seg_f.json")
        backward = track("comp/seg_rev.mp4", keys[b], "comp/seg_b.json")[::-1]
        n = b - a + 1
        t = np.linspace(0, 1, n)[:, None, None]
        w = t * t * (3 - 2 * t)
        gap = np.abs(forward[:n] - backward[:n]).max()
        if gap > 100:
            lin = np.linspace(0, 1, n)[:, None, None]
            result[a:b + 1] = np.float32(keys[a]) * (1 - lin) + np.float32(keys[b]) * lin
        else:
            result[a:b + 1] = forward[:n] * (1 - w) + backward[:n] * w
        print(clip, a, "->", b, "forward/backward gap", round(float(gap), 1), "px")
    for f in frames:
        result[f] = keys[f]
    smooth = gaussian_filter1d(result, 1.5, axis=0, mode="nearest")
    for f in (0, 120):
        smooth[f] = keys[f]
    json.dump(smooth.tolist(), open(f"comp/final_{clip}.json", "w"))
