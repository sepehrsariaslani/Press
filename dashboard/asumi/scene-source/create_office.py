"""Original Asumi clay character. Rebuild with Blender --background --python this_file.

Six poses share a single five-second glTF animation, sampled by page scroll.
No third-party models, textures, fonts, or purple materials are used.
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "story" / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0


def material(name, color, roughness=0.68, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    return mat


skin = material("Peach clay skin", (0.78, 0.40, 0.25))
blush = material("Terracotta detail", (0.55, 0.20, 0.12))
hair = material("Warm chestnut hair", (0.12, 0.046, 0.025), 0.8)
dark = material("Charcoal", (0.042, 0.052, 0.050), 0.8)
sage = material("Sage cotton", (0.27, 0.40, 0.30), 0.88)
seam = material("Sage seams", (0.20, 0.31, 0.23), 0.9)
cream = material("Oat upholstery", (0.77, 0.68, 0.52), 0.93)
white = material("Ivory rubber", (0.88, 0.85, 0.75), 0.7)
wood = material("Honey oak", (0.40, 0.24, 0.12))
brass = material("Warm brass", (0.54, 0.36, 0.12), 0.4, 0.45)
green = material("Olive leaf", (0.18, 0.30, 0.12), 0.8)
clay = material("Terracotta pot", (0.46, 0.23, 0.12), 0.92)


def finish(obj, name, mat, parent=None):
    obj.name = name
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def pivot(name, at, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = at
    obj.parent = parent
    return obj


def sphere(name, at, size, mat, parent=None, segments=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=18, location=at)
    obj = finish(bpy.context.object, name, mat, parent)
    obj.scale = size
    return obj


def box(name, at, size, mat, radius=0.05, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = finish(bpy.context.object, name, mat, parent)
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Rounded edges", "BEVEL")
    bevel.width, bevel.segments = radius, 5
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def rod(name, start, end, radius, mat, parent=None, end_radius=None):
    direction = Vector(end) - Vector(start)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=radius,
        radius2=end_radius or radius, depth=direction.length,
        location=(Vector(start) + Vector(end)) / 2)
    obj = finish(bpy.context.object, name, mat, parent)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bevel = obj.modifiers.new("Soft edges", "BEVEL")
    bevel.width, bevel.segments = min(radius * 0.4, 0.025), 3
    return obj


def stroke(name, points, radius, mat, parent=None):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions, curve.bevel_depth, curve.bevel_resolution = "3D", radius, 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for vertex, coordinate in zip(spline.bezier_points, points):
        vertex.co = coordinate
        vertex.handle_left_type = vertex.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


# A soft lounge chair, without a desk obscuring the character's silhouette.
chair = pivot("Chair", (-0.62, 0.10, 0))
chair.rotation_euler.z = 0.20
box("Seat cushion", (0, 0, 0.66), (0.86, 0.78, 0.20), cream, 0.10, chair)
box("Rounded chair back", (0, 0.30, 1.01), (0.85, 0.22, 0.78), cream, 0.105, chair)
for side in (-1, 1):
    box("Padded armrest", (side * 0.40, 0.015, 0.90), (0.17, 0.72, 0.34), cream, 0.084, chair)
    for y in (-0.24, 0.25):
        rod("Tapered chair leg", (side * 0.43, y * 1.5, 0.06),
            (side * 0.30, y, 0.65), 0.026, wood, chair, 0.043)

hips = pivot("Character", (-0.62, 0.06, 0.79))
hips.rotation_euler.z = 0.20
sphere("Seated hips", (0, 0, 0), (0.28, 0.25, 0.16), dark, hips)
for side in (-1, 1):
    x = side * 0.16
    rod("Trouser thigh", (x, 0.0, 0), (x, -0.43, -0.07), 0.13, dark, hips, 0.14)
    sphere("Soft knee", (x, -0.43, -0.07), (0.13, 0.13, 0.13), dark, hips)
    rod("Trouser shin", (x, -0.43, -0.10), (x, -0.52, -0.58), 0.095, dark, hips, 0.12)
    rod("Ankle", (x, -0.52, -0.56), (x, -0.54, -0.66), 0.074, skin, hips)
    box("White sneaker sole", (x, -0.64, -0.715), (0.25, 0.43, 0.065), white, 0.03, hips)
    sphere("Sneaker upper", (x, -0.63, -0.67), (0.12, 0.205, 0.09), dark, hips)
    sphere("Ivory toe cap", (x, -0.775, -0.685), (0.119, 0.09, 0.059), white, hips)
    for i in range(3):
        stroke("Sneaker laces", [(x - 0.063, -0.60 - i * 0.036, -0.60),
            (x, -0.616 - i * 0.036, -0.583),
            (x + 0.063, -0.60 - i * 0.036, -0.60)], 0.007, white, hips)

torso = pivot("Torso", (0, 0, 0.03), hips)
sphere("Soft tee body", (0, 0, 0.28), (0.28, 0.19, 0.32), sage, torso, 36)
sphere("Tee shoulders", (0, 0, 0.47), (0.325, 0.18, 0.17), sage, torso)
rod("Neck", (0, 0, 0.54), (0, 0, 0.71), 0.092, skin, torso)
sphere("Tee neckline", (0, -0.01, 0.574), (0.14, 0.115, 0.025), seam, torso)
head = pivot("Head", (0, -0.012, 0.80), torso)
sphere("Rounded face", (0, 0, 0.02), (0.25, 0.226, 0.285), skin, head, 40)
sphere("Soft chin", (0, -0.045, -0.13), (0.186, 0.172, 0.115), skin, head)
for side in (-1, 1):
    sphere("Ear", (side * 0.247, 0.006, 0.02), (0.049, 0.049, 0.074), skin, head)
    sphere("Ear hollow", (side * 0.269, -0.025, 0.022), (0.018, 0.022, 0.036), blush, head)
    sphere("Friendly black eye", (side * 0.091, -0.211, 0.062), (0.021, 0.015, 0.037), dark, head)
    sphere("Eye highlight", (side * 0.091 - 0.006, -0.223, 0.077), (0.006, 0.004, 0.008), white, head, 16)
    stroke("Expressive brow", [(side * 0.09 - 0.039, -0.201, 0.131),
        (side * 0.09, -0.216, 0.145), (side * 0.09 + 0.036, -0.20, 0.135)], 0.014, hair, head)
sphere("Button nose", (0, -0.236, 0.009), (0.047, 0.050, 0.045), skin, head)
stroke("Subtle smile", [(-0.052, -0.21, -0.083), (0, -0.228, -0.096),
    (0.052, -0.21, -0.083)], 0.007, blush, head)

# Individual swept volumes retain a clay-like silhouette like the supplied reference.
sphere("Back hair", (0, 0.077, 0.065), (0.263, 0.197, 0.27), hair, head)
sphere("Hair crown", (0, 0.007, 0.22), (0.261, 0.214, 0.14), hair, head)
for i, (x, y, z, sx, sy, sz) in enumerate([
    (-0.17, -0.09, 0.20, .12, .13, .11),
    (-0.07, -0.13, 0.27, .19, .12, .085),
    (0.06, -0.12, 0.325, .20, .115, .082),
    (0.14, -0.05, 0.35, .12, .12, .10),
    (-0.225, -0.065, 0.08, .052, .092, .12),
]):
    lock = sphere("Swept lock " + str(i), (x, y, z), (sx, sy, sz), hair, head)
    lock.rotation_euler.y = -0.26
    lock.rotation_euler.z = -0.20

arms = []
for side in (-1, 1):
    shoulder = pivot("Shoulder_" + str(side), (side * 0.29, 0, 0.47), torso)
    sphere("Short sleeve", (0, 0, -0.075), (0.105, 0.111, 0.16), sage, shoulder)
    rod("Bare upper arm", (0, 0, -0.14), (0, 0, -0.31), 0.07, skin, shoulder, 0.083)
    elbow = pivot("Elbow_" + str(side), (0, 0, -0.31), shoulder)
    sphere("Rounded elbow", (0, 0, 0), (0.071, 0.071, 0.072), skin, elbow)
    rod("Forearm", (0, 0, 0), (0, 0, -0.29), 0.049, skin, elbow, 0.07)
    wrist = pivot("Wrist_" + str(side), (0, 0, -.29), elbow)
    sphere("Palm", (0, -0.006, -0.043), (0.061, 0.036, 0.060), skin, wrist)
    fingers = []
    for finger in range(4):
        joint = pivot("Finger joint", (-.035 + finger * .023, -.008, -.075), wrist)
        sphere("Finger", (0, 0, -.025), (.012, .022, .040 - abs(finger - 1) * .006), skin, joint, 16)
        fingers.append(joint)
    sphere("Thumb", (side * -0.060, -0.020, -0.033), (.021, .025, .048), skin, wrist, 16)
    arms.append((shoulder, elbow, wrist, fingers))

for frame, tension, gesture in [(1, 1, 0), (25, .60, 0), (49, .08, .70),
                                (73, 0, 1), (97, 0, 0), (121, 0, 0)]:
    torso.rotation_euler.x = .17 * tension - .035 * (1 - tension)
    torso.keyframe_insert(data_path="rotation_euler", frame=frame)
    head.rotation_euler.x = .40 * tension - .06 * (1 - tension)
    head.rotation_euler.z = .08 * tension + .18 * gesture
    head.keyframe_insert(data_path="rotation_euler", frame=frame)
    for index, (shoulder, elbow, wrist, fingers) in enumerate(arms):
        shoulder.rotation_euler.x = -.25 - .10 * tension
        shoulder.rotation_euler.y = (-.1 if index else .1) * (1 - tension)
        elbow.rotation_euler.x = -2.68 * tension - 1.38 * (1 - tension)
        elbow.rotation_euler.y = 0
        wrist.rotation_euler.z = math.pi * (1 - tension)
        if index == 1:
            shoulder.rotation_euler.y -= 1.15 * gesture
            elbow.rotation_euler.x = elbow.rotation_euler.x * (1 - gesture) - .10 * gesture
            elbow.rotation_euler.y = -.50 * gesture
            for number, finger in enumerate(fingers):
                finger.rotation_euler.x = 1.6 * gesture if number > 0 else 0
                finger.keyframe_insert(data_path="rotation_euler", frame=frame)
        shoulder.keyframe_insert(data_path="rotation_euler", frame=frame)
        elbow.keyframe_insert(data_path="rotation_euler", frame=frame)
        wrist.keyframe_insert(data_path="rotation_euler", frame=frame)

def sculpt_union(names, name, voxel):
    """Fuse intersecting clay volumes so the face and tee have no primitive seams."""
    bpy.ops.object.select_all(action="DESELECT")
    objects = [obj for obj in bpy.data.objects if any(obj.name == n or obj.name.startswith(n + ".") for n in names)]
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    remesh = obj.modifiers.new("Sculpted union", "REMESH")
    remesh.mode, remesh.voxel_size, remesh.use_smooth_shade = "VOXEL", voxel, True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new("Clay polish", "SMOOTH")
    smooth.factor, smooth.iterations = 1.0, 5
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate = obj.modifiers.new("Web mesh", "DECIMATE")
    decimate.ratio = .38
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    obj.select_set(False)


sculpt_union(["Rounded face", "Soft chin", "Button nose"], "Sculpted face", .007)
sculpt_union(["Soft tee body", "Tee shoulders"], "Sculpted tee", .009)
sculpt_union(["Seated hips", "Trouser thigh", "Soft knee", "Trouser shin"], "Sculpted trousers", .009)

# Restrained real-world details. The right side is deliberately free for document panels.
rod("Side table top", (0.74, .36, .67), (0.74, .36, .74), .34, wood)
for i in range(3):
    a = i * math.tau / 3
    rod("Side table leg", (.74 + math.sin(a) * .26, .36 + math.cos(a) * .26, .04),
        (.74 + math.sin(a) * .17, .36 + math.cos(a) * .17, .69), .024, wood)
rod("Warm cup", (.87, .29, .74), (.87, .29, .91), .069, white)
stroke("Cup handle", [(.93, .29, .88), (1.005, .29, .875),
    (1.005, .29, .785), (.93, .29, .78)], .015, white)
rod("Coffee", (.87, .29, .906), (.87, .29, .908), .057, hair)
rod("Clay planter", (-1.39, .57, .02), (-1.39, .57, .30), .145, clay, end_radius=.19)
for i in range(7):
    a, h = i * 2.399, .53 + (i % 3) * .13
    tip = (-1.39 + math.sin(a) * .22, .57 + math.cos(a) * .17, h)
    stroke("Plant stem", [(-1.39, .57, .26), (-1.39, .57, h * .8), tip], .009, green)
    leaf = sphere("Leaf", tip, (.055, .14, .021), green)
    leaf.rotation_euler = (.3, .5, -a)

scene = bpy.context.scene
scene.frame_start, scene.frame_end, scene.render.fps = 1, 121, 24
scene.frame_set(121)
scene.render.engine = "CYCLES"
scene.cycles.samples, scene.cycles.use_denoising = 48, True
scene.world = bpy.data.worlds.new("Daylight")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.72, .76, .70, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .6
for name, at, energy, color, size in [
    ("Large morning window", (-3, -4, 6), 500, (1, .88, .69), 4),
    ("Soft fill", (4, -1, 3), 230, (.88, .94, 1), 4),
    ("Golden rim", (0, 3, 4), 330, (1, .91, .72), 3),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = at
    light.rotation_euler = (Vector((-.35, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.camera_add(location=(3.5, -6.5, 3.0))
scene.camera = bpy.context.object
scene.camera.rotation_euler = (Vector((-.23, 0, 1.07)) - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
scene.camera.data.type, scene.camera.data.ortho_scale = "ORTHO", 3.55
scene.render.resolution_x, scene.render.resolution_y = 1100, 1000
scene.render.resolution_percentage, scene.render.film_transparent = 100, True
scene.view_settings.view_transform = "AgX"
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "scene-source" / "asumi-office.blend"), compress=True)
bpy.ops.export_scene.gltf(filepath=str(ASSETS / "asumi-office.glb"), export_format="GLB",
    export_animations=True, export_animation_mode="SCENE", export_frame_range=True,
    export_force_sampling=True, export_cameras=False, export_lights=False, export_apply=True)
scene.render.filepath = str(ASSETS / "office-poster.png")
bpy.ops.render.render(write_still=True)
print("ASUMI_ASSET_READY", (ASSETS / "asumi-office.glb").stat().st_size)
