"""Align the 19 July 2024 Sentinel-2B true-colour image to the terrain raster."""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT

ROOT = Path(__file__).resolve().parents[1]
SCENE = "S2B_6VVN_20240719_0_L2A"
SOURCE = f"https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/6/V/VN/2024/7/{SCENE}/TCI.tif"


def main(source):
    bounds = json.loads((ROOT / "_data/barry_arm_terrain.json").read_text())
    with Image.open(ROOT / "images/barry-arm-relief.webp") as relief:
        width, height = relief.size
    grid = from_bounds(*(bounds[k] for k in ("west", "south", "east", "north")), width, height)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"), rasterio.open(source) as dataset:
        with WarpedVRT(dataset, crs="EPSG:4269", transform=grid, width=width, height=height,
                       resampling=Resampling.bilinear) as raster:
            rgb = np.moveaxis(raster.read([1, 2, 3]), 0, 2)
            # The TCI uses zero for nodata, but individual channels can also
            # be zero in mountain shadows. Look for blank areas in the RGB.
            covered = np.any(rgb != 0, axis=2)
            if any(tile.mean() < .98 for strip in np.array_split(covered, 6)
                   for tile in np.array_split(strip, 8, axis=1)):
                raise ValueError("A portion of the requested extent has no imagery")
    out = Image.fromarray(rgb)
    out.save(ROOT / "images/barry-arm-satellite.webp", quality=86, method=6)
    out.resize((960, 540), Image.Resampling.LANCZOS).save(
        ROOT / "images/barry-arm-satellite-960.webp", quality=84, method=6)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else SOURCE)
