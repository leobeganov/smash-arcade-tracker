import os
from PIL import Image

def flood_fill_transparency(img_path, threshold_fn):
    img = Image.open(img_path).convert('RGBA')
    w, h = img.size
    pixels = img.load()
    
    visited = set()
    queue = []
    
    # Add four corners
    corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
    for pt in corners:
        if threshold_fn(pixels[pt]):
            queue.append(pt)
            visited.add(pt)
            
    # Also add entire outer border to ensure we get all edges
    for x in range(w):
        for y in [0, h-1]:
            pt = (x, y)
            if pt not in visited and threshold_fn(pixels[pt]):
                queue.append(pt)
                visited.add(pt)
    for y in range(h):
        for x in [0, w-1]:
            pt = (x, y)
            if pt not in visited and threshold_fn(pixels[pt]):
                queue.append(pt)
                visited.add(pt)
                
    # BFS flood fill
    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1
        
        # Set transparent
        r, g, b, a = pixels[cx, cy]
        pixels[cx, cy] = (r, g, b, 0)
        
        # Check 4 neighbors
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                n_pt = (nx, ny)
                if n_pt not in visited:
                    if threshold_fn(pixels[n_pt]):
                        queue.append(n_pt)
                        visited.add(n_pt)
                        
    return img

# Paths
mario_src = '/Users/leobeganov/.gemini/antigravity/brain/a4da7c99-d781-4cdd-b1e3-870b67ad2d1b/mario_isolated_v2_1780981853918.png'
link_src = '/Users/leobeganov/.gemini/antigravity/brain/a4da7c99-d781-4cdd-b1e3-870b67ad2d1b/link_isolated_v2_black_1780981911374.png'

assets_dir = '/Users/leobeganov/.gemini/antigravity/scratch/smash-arcade-tracker/assets'

# 1. Process Mario
print("Processing Mario...")
mario_fn = lambda rgba: rgba[0] <= 20 and rgba[1] <= 20 and rgba[2] <= 20
mario_trans = flood_fill_transparency(mario_src, mario_fn)
mario_bbox = mario_trans.getbbox()
if mario_bbox:
    mario_cropped = mario_trans.crop(mario_bbox)
    mario_cropped.save(os.path.join(assets_dir, 'mario.png'))
    print(f"Mario processed and cropped to {mario_cropped.size}")
else:
    print("Error: No bounding box found for Mario")

# 2. Process Link
print("Processing Link...")
link_fn = lambda rgba: rgba[0] >= 235 and rgba[1] >= 235 and rgba[2] >= 235
link_trans = flood_fill_transparency(link_src, link_fn)
link_bbox = link_trans.getbbox()
if link_bbox:
    link_cropped = link_trans.crop(link_bbox)
    link_cropped.save(os.path.join(assets_dir, 'link.png'))
    print(f"Link processed and cropped to {link_cropped.size}")
else:
    print("Error: No bounding box found for Link")
