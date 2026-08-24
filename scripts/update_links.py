import json
import re

with open("config/project.ts", "r") as f:
    content = f.read()

# Extract the JSON part of virtualTour
start_idx = content.find('"virtualTour":')
if start_idx == -1:
    print("Could not find virtualTour")
    exit(1)

# Find the object start
obj_start = content.find('{', start_idx)

# Find the end of the project object by counting braces
brace_count = 0
obj_end = -1
for i in range(obj_start, len(content)):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            obj_end = i
            break

if obj_end == -1:
    print("Could not find end of virtualTour object")
    exit(1)

virtual_tour_str = content[obj_start:obj_end+1]

try:
    virtual_tour = json.loads(virtual_tour_str)
except Exception as e:
    # If JSON parsing fails (might be because of trailing commas or JS syntax), we can try to fix it or do regex.
    # project.ts looks like valid JSON for that part though.
    print("JSON parsing failed", e)
    pass

# We will just use regex to replace the links arrays to be safe from minor JSON vs JS object differences.
def replace_links(node_id, new_links_str):
    global content
    
    # Find the node block
    node_pattern = r'"{0}":\s*{{[^}}]*?"links":\s*\[(.*?)\]'.format(node_id)
    
    def repl(match):
        full_match = match.group(0)
        old_links = match.group(1)
        return full_match.replace('[' + old_links + ']', '[' + new_links_str + ']')

    content = re.sub(node_pattern, repl, content, flags=re.DOTALL)


foyer_links = """
          { "nodeId": "exterior_p1", "label": "Exit to Front", "yaw": -1.65, "pitch": -24.77 },
          { "nodeId": "living_area_01", "label": "Enter Living Area", "yaw": -98.48, "pitch": -32.39 }
        """
replace_links("foyer", foyer_links)

living_area_01_links = """
          { "nodeId": "foyer", "label": "Back to Foyer", "yaw": 87.31, "pitch": -31.22 },
          { "nodeId": "living_area_02", "label": "Walk Further In", "yaw": 146.47, "pitch": -22.56 },
          { "nodeId": "dining_area", "label": "Go to Dining Area", "yaw": -160.98, "pitch": -11.49 }
        """
replace_links("living_area_01", living_area_01_links)

living_area_02_links = """
          { "nodeId": "living_area_01", "label": "Back to Entrance", "yaw": -115.05, "pitch": -38.64 },
          { "nodeId": "bedroom_01_1", "label": "Bedroom 1", "yaw": 38.16, "pitch": -37.54 },
          { "nodeId": "bedroom_02_1", "label": "Bedroom 2", "yaw": 67.13, "pitch": -19.38 }
        """
replace_links("living_area_02", living_area_02_links)

dining_area_links = """
          { "nodeId": "living_area_01", "label": "Back to Living Area", "yaw": 68.02, "pitch": -20.05 },
          { "nodeId": "kitchen_01", "label": "Enter Kitchen", "yaw": -145.53, "pitch": -23.03 }
        """
replace_links("dining_area", dining_area_links)

kitchen_01_links = """
          { "nodeId": "dining_area", "label": "Back to Dining", "yaw": 126.5, "pitch": -8.74 },
          { "nodeId": "kitchen_02", "label": "Further into Kitchen", "yaw": 173.56, "pitch": -10.5 }
        """
replace_links("kitchen_01", kitchen_01_links)

kitchen_02_links = """
          { "nodeId": "kitchen_01", "label": "Back towards Dining", "yaw": 165.1, "pitch": -10.98 }
        """
replace_links("kitchen_02", kitchen_02_links)

bedroom_01_1_links = """
          { "nodeId": "living_area_02", "label": "Exit Bedroom", "yaw": 95.96, "pitch": -36.68 },
          { "nodeId": "bedroom_01_2", "label": "Center of Room", "yaw": 67.13, "pitch": -19.38 }
        """
replace_links("bedroom_01_1", bedroom_01_1_links)

with open("config/project.ts", "w") as f:
    f.write(content)

print("Updated config/project.ts successfully.")
