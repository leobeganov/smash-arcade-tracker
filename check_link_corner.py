from PIL import Image

path = '/Users/leobeganov/.gemini/antigravity/brain/a4da7c99-d781-4cdd-b1e3-870b67ad2d1b/link_isolated_v2_black_1780981911374.png'
img = Image.open(path)
print("Link size:", img.size)
print("Top-left pixel:", img.getpixel((0, 0)))
print("Top-right pixel:", img.getpixel((img.size[0]-1, 0)))
