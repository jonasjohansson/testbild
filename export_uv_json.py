"""
Testbild UV JSON Exporter for Blender
======================================
Exports UV mapping data from a Blender scene for use with the Testbild test pattern generator.

Requirements:
  - Mesh objects with materials following the naming convention:
      SurfaceName_Individual   (per-surface UV, uses "UVMap" layer)
      SurfaceName_Cross        (cross/plus layout UV, uses "CrossMap" layer)
      SurfaceName_Panorama     (panorama/u-shape UV, uses "Panorama" layer)
  - Each mesh must have the corresponding UV layers: UVMap, CrossMap, Panorama

Usage:
  1. Open this script in Blender's Text Editor
  2. Adjust SETTINGS below if needed
  3. Run the script (Alt+P)
  4. The JSON file is saved to the path specified in OUTPUT_PATH

The exported JSON can be uploaded to the Testbild web app to generate
test patterns at the correct resolutions and UV layouts.
"""

import bpy
import mathutils
import json
import os
import math

# ── SETTINGS ──────────────────────────────────────────────────────────────────

# Pixels per meter — fallback when no explicit dimensions are given.
# Example: 8160px / 34m = 240 px/m
PX_PER_METER = 240

# Grid cell size in meters (1m × 1m cells)
CELL_SIZE = 1.0

# Per-surface pixel dimensions from the delivery spec.
# These override the auto-computed values (PX_PER_METER × mesh size).
# Set to None or remove a surface to auto-compute from the mesh.
SURFACE_SPECS = {
    "Wall_Left":  {"w": 8160, "h": 1920},   # Long Wall A — 34.00m × 8m
    "Wall_Right": {"w": 8160, "h": 1920},   # Long Wall B — 34.00m × 8m
    "Wall_Front": {"w": 2719, "h": 1920},   # Short Wall C — 11.32m × 8m
    "Wall_Rear":  {"w": 2719, "h": 1920},   # Short Wall D — 11.32m × 8m
    "Floor":      {"w": 8160, "h": 2719},   # Floor — ~34.00m × ~11.33m
}

# UV layer names
UV_INDIVIDUAL = "UVMap"
UV_CROSS = "CrossMap"
UV_PANORAMA = "Panorama"

# Material suffixes to detect
TEMPLATES = ["Individual", "Cross", "Panorama"]

# Surface colors (assigned in discovery order, cycled)
COLORS = ["#00ff00", "#ff0000", "#00ffff", "#ffff00", "#ff00ff"]

# Output path — set to None to print to console instead of saving
OUTPUT_PATH = None  # e.g. "/path/to/elverket-uv.json"

# Project name
PROJECT_NAME = "elverket"

# ── SCRIPT ────────────────────────────────────────────────────────────────────


def discover_surfaces():
    """Find all surfaces by scanning materials for the naming convention."""
    surfaces = {}
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            for suffix in TEMPLATES:
                if mat.name.endswith("_" + suffix):
                    surface_name = mat.name.rsplit("_", 1)[0]
                    if surface_name not in surfaces:
                        surfaces[surface_name] = {
                            "object": obj.name,
                            "materials": {},
                        }
                    surfaces[surface_name]["materials"][suffix] = mat.name
                    # Prefer the object that has the Individual material
                    if suffix == "Individual":
                        surfaces[surface_name]["object"] = obj.name
    return surfaces


def get_uv_bounds(obj, uv_layer_name):
    """Get the min/max UV bounds for a given UV layer on a mesh."""
    mesh = obj.data
    uv_layer = mesh.uv_layers.get(uv_layer_name)
    if not uv_layer:
        return None

    min_u, min_v = float("inf"), float("inf")
    max_u, max_v = float("-inf"), float("-inf")

    for loop in mesh.loops:
        uv = uv_layer.data[loop.index].uv
        min_u = min(min_u, uv[0])
        min_v = min(min_v, uv[1])
        max_u = max(max_u, uv[0])
        max_v = max(max_v, uv[1])

    return {
        "minU": round(min_u, 4) + 0.0,  # +0.0 ensures no negative zero
        "maxU": round(max_u, 4) + 0.0,
        "minV": round(min_v, 4) + 0.0,
        "maxV": round(max_v, 4) + 0.0,
    }


def get_physical_size(obj):
    """Get the physical dimensions of a mesh object in world space."""
    bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    xs = [v.x for v in bbox]
    ys = [v.y for v in bbox]
    zs = [v.z for v in bbox]
    return (
        round(max(xs) - min(xs), 3),
        round(max(ys) - min(ys), 3),
        round(max(zs) - min(zs), 3),
    )


def get_surface_dimensions(size_x, size_y, size_z):
    """Determine width and height in meters from the 3D bounding box.

    Walls have one zero-thickness axis; the floor has zero Z.
    Returns (width_m, height_m) where width is the longer horizontal axis.
    """
    dims = sorted([(size_x, "x"), (size_y, "y"), (size_z, "z")], key=lambda d: d[0])

    if dims[0][0] < 0.01:
        # Planar surface — use the two non-zero dimensions
        # For walls: width is the larger, height is the smaller (or Z)
        a, b = dims[1][0], dims[2][0]
        # If one of them is Z (vertical), that's the height
        non_zero = [(d, axis) for d, axis in dims if d > 0.01]
        has_z = any(axis == "z" for _, axis in non_zero)
        if has_z:
            z_val = next(d for d, axis in non_zero if axis == "z")
            horiz_val = next(d for d, axis in non_zero if axis != "z")
            return horiz_val, z_val
        else:
            return max(a, b), min(a, b)
    else:
        # Floor-like (no Z extent) or volumetric — use X and Y
        return max(size_x, size_y), min(size_x, size_y) if size_z < 0.01 else (size_x, size_y)


def detect_rotation(width_m, height_m, uv_bounds, ref_mpu, ref_mpv):
    """Detect if a surface is rotated in the cross UV layout.

    Uses physical dimensions and a reference meters-per-UV-unit to check
    whether the surface is rotated. This avoids the circular dependency
    of needing texture pixel dimensions before they are computed.

    Args:
        width_m: Physical width in meters
        height_m: Physical height in meters
        uv_bounds: UV bounding box dict
        ref_mpu: Reference meters per UV unit (horizontal), from a known non-rotated surface
        ref_mpv: Reference meters per UV unit (vertical), from a known non-rotated surface

    Returns 0, 90, or 270.
    """
    frac_w = uv_bounds["maxU"] - uv_bounds["minU"]
    frac_h = uv_bounds["maxV"] - uv_bounds["minV"]
    if frac_w < 0.001 or frac_h < 0.001:
        return 0

    # Check non-rotated: width_m / frac_w ≈ ref_mpu, height_m / frac_h ≈ ref_mpv
    err_normal = (abs(width_m / frac_w - ref_mpu) / ref_mpu +
                  abs(height_m / frac_h - ref_mpv) / ref_mpv)

    # Check rotated: height_m / frac_w ≈ ref_mpu, width_m / frac_h ≈ ref_mpv
    err_rotated = (abs(height_m / frac_w - ref_mpu) / ref_mpu +
                   abs(width_m / frac_h - ref_mpv) / ref_mpv)

    if err_normal <= err_rotated:
        return 0

    # Rotated — determine 90 vs 270 based on UV position
    center_u = (uv_bounds["minU"] + uv_bounds["maxU"]) / 2
    return 270 if center_u < 0.5 else 90


def detect_panorama_mirrors(surfaces_data):
    """Detect surfaces that share the same panorama UV region (mirrors)."""
    panorama_uvs = {}
    for name, data in surfaces_data.items():
        puv = data.get("_panorama_uv")
        if not puv:
            continue
        key = (puv["minU"], puv["maxU"], puv["minV"], puv["maxV"])
        if key in panorama_uvs:
            data["panoramaMirrorOf"] = panorama_uvs[key]
        else:
            panorama_uvs[key] = name


def main():
    surfaces = discover_surfaces()

    if not surfaces:
        print("ERROR: No surfaces found. Check material naming convention.")
        return

    print(f"Found {len(surfaces)} surfaces: {', '.join(surfaces.keys())}")

    # Collect data for each surface
    surfaces_data = {}
    color_idx = 0

    for surface_name, info in surfaces.items():
        obj = bpy.data.objects.get(info["object"])
        if not obj:
            print(f"WARNING: Object '{info['object']}' not found, skipping {surface_name}")
            continue

        # Physical dimensions
        size_x, size_y, size_z = get_physical_size(obj)
        width_m, height_m = get_surface_dimensions(size_x, size_y, size_z)

        # Pixel dimensions — use spec override if available, else compute from mesh
        spec = SURFACE_SPECS.get(surface_name)
        if spec:
            w = spec["w"]
            h = spec["h"]
        else:
            w = round(width_m * PX_PER_METER)
            h = round(height_m * PX_PER_METER)

        # Grid
        cols = round(width_m / CELL_SIZE)
        rows = round(height_m / CELL_SIZE)

        # UV bounds
        cross_uv = get_uv_bounds(obj, UV_CROSS)
        panorama_uv = get_uv_bounds(obj, UV_PANORAMA)

        surfaces_data[surface_name] = {
            "w": w,
            "h": h,
            "cols": cols,
            "rows": rows,
            "color": COLORS[color_idx % len(COLORS)],
            "_cross_uv": cross_uv,
            "_panorama_uv": panorama_uv,
            "_width_m": width_m,
            "_height_m": height_m,
        }
        color_idx += 1

    # ── Detect rotations ──
    # Use the Floor as a reference (it's always non-rotated in a cross layout)
    # to establish meters-per-UV-unit, then detect rotation for other surfaces.
    floor_data = surfaces_data.get("Floor")
    ref_mpu, ref_mpv = None, None

    if floor_data and floor_data["_cross_uv"]:
        cuv = floor_data["_cross_uv"]
        frac_w = cuv["maxU"] - cuv["minU"]
        frac_h = cuv["maxV"] - cuv["minV"]
        if frac_w > 0.01 and frac_h > 0.01:
            ref_mpu = floor_data["_width_m"] / frac_w
            ref_mpv = floor_data["_height_m"] / frac_h

    if not ref_mpu or not ref_mpv:
        # Fallback: use the surface with the largest cross UV span
        best_area = 0
        for name, data in surfaces_data.items():
            cuv = data["_cross_uv"]
            if not cuv:
                continue
            area = (cuv["maxU"] - cuv["minU"]) * (cuv["maxV"] - cuv["minV"])
            if area > best_area:
                best_area = area
                ref_mpu = data["_width_m"] / (cuv["maxU"] - cuv["minU"])
                ref_mpv = data["_height_m"] / (cuv["maxV"] - cuv["minV"])

    for name, data in surfaces_data.items():
        cuv = data["_cross_uv"]
        if cuv and ref_mpu and ref_mpv:
            data["_rotation"] = detect_rotation(
                data["_width_m"], data["_height_m"], cuv, ref_mpu, ref_mpv
            )
        else:
            data["_rotation"] = 0

    # ── Compute cross texture dimensions from spec pixel sizes ──
    # Use Floor (non-rotated) as reference: texture_size = surface_px / uv_fraction
    cross_w, cross_h = 4096, 4096
    if floor_data and floor_data["_cross_uv"]:
        cuv = floor_data["_cross_uv"]
        frac_w = cuv["maxU"] - cuv["minU"]
        frac_h = cuv["maxV"] - cuv["minV"]
        if frac_w > 0.01:
            cross_w = round(floor_data["w"] / frac_w)
        if frac_h > 0.01:
            cross_h = round(floor_data["h"] / frac_h)

    # ── Compute panorama texture dimensions ──
    panorama_w, panorama_h = 4096, 4096
    if floor_data and floor_data["_panorama_uv"]:
        puv = floor_data["_panorama_uv"]
        frac_w = puv["maxU"] - puv["minU"]
        frac_h = puv["maxV"] - puv["minV"]
        if frac_w > 0.01:
            panorama_w = round(floor_data["w"] / frac_w)
        if frac_h > 0.01:
            panorama_h = round(floor_data["h"] / frac_h)

    # Detect rotations and panorama mirrors
    detect_panorama_mirrors(surfaces_data)

    # Build output JSON
    output = {
        "name": PROJECT_NAME,
        "crossTextureWidth": cross_w,
        "crossTextureHeight": cross_h,
        "panoramaTextureWidth": panorama_w,
        "panoramaTextureHeight": panorama_h,
        "surfaces": {},
    }

    for name, data in surfaces_data.items():
        cross_uv = data["_cross_uv"]
        panorama_uv = data["_panorama_uv"]
        rotation = data.get("_rotation", 0)

        entry = {
            "w": data["w"],
            "h": data["h"],
            "cols": data["cols"],
            "rows": data["rows"],
            "color": data["color"],
        }

        if cross_uv:
            entry["crossUV"] = cross_uv
        if rotation:
            entry["rotation"] = rotation
        else:
            entry["rotation"] = 0

        if panorama_uv:
            entry["panoramaUV"] = panorama_uv
            entry["panoramaRotation"] = 0

            # Compute panorama cols (may differ from surface cols if only partial)
            puv_frac_w = panorama_uv["maxU"] - panorama_uv["minU"]
            panorama_region_w = puv_frac_w * panorama_w
            if data["w"] > 0:
                col_px = data["w"] / data["cols"]
                panorama_cols = round(panorama_region_w / col_px)
                if panorama_cols != data["cols"]:
                    entry["panoramaCols"] = panorama_cols

        if "panoramaMirrorOf" in data:
            entry["panoramaMirrorOf"] = data["panoramaMirrorOf"]

        output["surfaces"][name] = entry

    # Output
    json_str = json.dumps(output, indent=2)

    if OUTPUT_PATH:
        with open(OUTPUT_PATH, "w") as f:
            f.write(json_str + "\n")
        print(f"\nSaved to: {OUTPUT_PATH}")
    else:
        print("\n" + json_str)

    print(f"\nCross texture:    {cross_w} x {cross_h} px")
    print(f"Panorama texture: {panorama_w} x {panorama_h} px")
    print(f"Pixel density:    {PX_PER_METER} px/m")

    return output


if __name__ == "__main__":
    main()
