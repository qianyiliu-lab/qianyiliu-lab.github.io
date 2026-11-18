"""Render the homepage's north-up Barry Arm terrain layer from the public USGS DEM.

Input: https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/TIFF/historical/n62w149/USGS_1_n62w149_20171229.tif
Usage: python _tools/render-barry-relief.py path/to/input.tif images/barry-arm-relief.webp
Requires NumPy and Pillow. The 10 m display pixels interpolate the 1 arc-second
source; they are not 10 m observations. No hazard classification is depicted.
"""
import sys
import json
from math import cos, radians
from pathlib import Path

import numpy as np
from PIL import Image


def render(source, destination):
    w, h, step = 1920, 1080, 10
    lat, lon = 61.116, -148.208
    # Local equirectangular frame using the GRS80 ellipsoid at the centre.
    phi = radians(lat)
    e2 = 0.00669438002290
    v = 1 - e2 * (1 - cos(phi) ** 2)
    mx = radians(1) * 6378137 * cos(phi) / v**0.5
    my = radians(1) * 6378137 * (1 - e2) / v**1.5
    with Image.open(source) as dem:
        _, _, _, west, north, _ = dem.tag_v2[33922]
        dx, dy, _ = dem.tag_v2[33550]
        x, y = (lon-west)/dx, (north-lat)/dy
        rx, ry = w*step/(2*mx*dx), h*step/(2*my*dy)
        bounds = (x-rx, y-ry, x+rx, y+ry)
        if not (0 <= bounds[0] < bounds[2] <= dem.width and 0 <= bounds[1] < bounds[3] <= dem.height):
            raise ValueError('Source tile does not contain the requested extent')
        z = np.asarray(dem.transform((w,h), Image.Transform.EXTENT, bounds, Image.Resampling.BILINEAR))
    if not np.isfinite(z).all() or z.min() < -100 or z.max() < 300:
        raise ValueError('Missing or unexpected elevation data')
    gy, gx = np.gradient(z, step)
    light = (.5*gx + .5*gy + .7071) / np.sqrt(1 + gx*gx + gy*gy)
    ramp = np.array([[42,82,87],[78,112,110],[127,147,143],[175,186,180],[224,230,223]])
    land = np.stack([np.interp(z,[0,220,550,900,1450],c) for c in ramp.T],axis=-1)
    land *= (.56 + .59*np.clip(light,-.45,1))[...,None]
    interval = 100
    distance = np.abs((z+interval/2) % interval - interval/2)
    thickness = np.maximum(0.35, step*np.hypot(gx,gy)*0.8)
    contour = .55*np.clip(1-distance/thickness,0,1)*(z>2)
    land = land*(1-contour[...,None]) + np.array([205,229,222])*contour[...,None]
    land[z<=0.1] = [24,57,74]
    Image.fromarray(np.uint8(np.clip(land,0,255))).save(destination,quality=86,method=6)
    metadata = Path(__file__).resolve().parents[1] / '_data' / 'barry_arm_terrain.json'
    metadata.write_text(json.dumps({'west':lon-w*step/(2*mx), 'east':lon+w*step/(2*mx),
                                    'south':lat-h*step/(2*my), 'north':lat+h*step/(2*my)},indent=2)+'\n',encoding='ascii')
    print(f'{w}x{h}, source range {z.min():.1f} to {z.max():.1f} m, {interval} m contours')


if __name__ == '__main__':
    render(*sys.argv[1:])
