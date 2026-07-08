# import pandas as pd
# import numpy as np

# df = pd.read_csv("data/processed/nyc_venues.csv")

# coverage = (df.notna().sum() / len(df) * 100).round(1)
# print(coverage.to_string())

# import matplotlib.pyplot as plt

# K = 3  
# venue = np.array([-73.9840, 40.7520])
# venue_name = "Target venue"

# stations = {
#     "Times Sq":       (-73.9840, 40.7550),   # inner N
#     "Bryant Park":    (-73.9814, 40.7532),   # inner E
#     "Herald Sq":      (-73.9863, 40.7500),   # inner SW
#     "Grand Central":  (-73.9762, 40.7520),   # outer E
#     "5th Ave / 59":   (-73.9792, 40.7576),   # outer NE
#     "Columbus Circ":  (-73.9894, 40.7574),   # outer NW
#     "Penn Station":   (-73.9918, 40.7514),   # outer W
#     "Union Sq":       (-73.9846, 40.7448),   # outer S
# }
# names = list(stations.keys())
# coords = np.array(list(stations.values()))    
# dists = np.sqrt(((coords - venue) ** 2).sum(axis=1))
# nearest = np.argsort(dists)[:K]                   
# fig, ax = plt.subplots(figsize=(9, 7.5))


# for rank, i in enumerate(nearest, start=1):
#     ax.plot([venue[0], coords[i, 0]], [venue[1], coords[i, 1]],
#             color="#2EA86F", linewidth=2, linestyle="--", zorder=1)
   
#     bx = venue[0] + 0.30 * (coords[i, 0] - venue[0])
#     by = venue[1] + 0.30 * (coords[i, 1] - venue[1])

# # all stations (blue)
# ax.scatter(coords[:, 0], coords[:, 1], s=150, color="#2B6CB0",
#            edgecolor="white", linewidth=1, zorder=3, label="Stations (known ridership)")


# # the venue (red)
# ax.scatter(venue[0], venue[1], s=260, marker=".", color="#C0392B",
#            edgecolor="white", linewidth=1, zorder=4, label="Target venue (unknown)")

# # station labels placed radially OUTWARD from the venue, so they point away
# # from the centre and never collide with the lines or each other
# for i, name in enumerate(names):
#     dx, dy = coords[i] - venue
#     ha = "left" if dx >= 0 else "right"
#     va = "bottom" if dy >= 0 else "top"
#     ox = 9 if dx >= 0 else -9
#     oy = 7 if dy >= 0 else -7
#     ax.annotate(name, (coords[i, 0], coords[i, 1]),
#                 textcoords="offset points", xytext=(ox, oy),
#                 ha=ha, va=va, fontsize=9, color="#1E2A38")

# ax.annotate(venue_name, (venue[0], venue[1]),
#             textcoords="offset points", xytext=(12, -16),
#             ha="left", va="top", fontsize=10, color="#C0392B", fontweight="bold")

# ax.set_title(f"KNN Approach to Busyness Levels",
#              fontsize=13, fontweight="bold", pad=14)
# ax.set_xlabel("longitude")
# ax.set_ylabel("latitude")
# ax.set_aspect("equal", adjustable="box")
# # tight limits with a small even margin so the plot isn't mostly empty space
# pad = 0.0022
# allx = np.append(coords[:, 0], venue[0]); ally = np.append(coords[:, 1], venue[1])
# ax.set_xlim(allx.min() - pad, allx.max() + pad)
# ax.set_ylim(ally.min() - pad, ally.max() + pad)
# ax.grid(True, linewidth=0.4, alpha=0.35)
# fig.tight_layout()
# plt.show()
