import os
import re

CACHE_HEADER = '"Cache-Control": "no-store, no-cache, must-revalidate, private"'

# Files to process
directories_api = ["app/api"]
ignore_paths = ['app/api/auth', 'app/api/cron', 'app/api/business', 'app/api/superadmin']

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    idx = 0
    new_content = ""
    
    while True:
        target = "NextResponse.json("
        pos = content.find(target, idx)
        if pos == -1:
            new_content += content[idx:]
            break
            
        # Append everything up to the found string and the string itself
        new_content += content[idx:pos + len(target)]
        
        # Now track parentheses
        curr = pos + len(target)
        depth = 1
        arg_text = ""
        in_string = False
        string_char = ''
        
        # Find the closing parenthesis of NextResponse.json(...)
        # Wait, there could be TWO arguments. We want to find the whole inner content OR just balance to the end.
        start_inner = curr
        while curr < len(content) and depth > 0:
            char = content[curr]
            
            # string handling (very basic, ignores advanced escapes but usually enough)
            if not in_string and char in ("'", '"', '`'):
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                # check if escaped
                if content[curr-1] != '\\':
                    in_string = False
                    
            if not in_string:
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
            curr += 1
            
        if depth == 0:
            # We found the closing parenthesis.
            inner_content = content[start_inner:curr-1].strip()
            
            # Check if headers are already present
            if "Cache-Control" not in inner_content:
                # Is there a second argument? Let's check from the end for a comma outside braces
                # Alternatively, we can just replace it intelligently using regex on the inner_content
                # If inner_content ends with '}', it MIGHT be the options object. But it could also be the payload object.
                # Actually, an easier way: 
                # NextResponse.json takes: (body: any, init?: ResponseInit)
                # Let's split by comma at depth 0.
                
                parts = []
                p_depth = 0
                p_in_str = False
                p_str_char = ''
                last_split = 0
                
                for i, c in enumerate(inner_content):
                    if not p_in_str and c in ("'", '"', '`'):
                        p_in_str = True
                        p_str_char = c
                    elif p_in_str and c == p_str_char and inner_content[i-1] != '\\':
                        p_in_str = False
                        
                    if not p_in_str:
                        if c in ('(', '{', '['):
                            p_depth += 1
                        elif c in (')', '}', ']'):
                            p_depth -= 1
                        elif c == ',' and p_depth == 0:
                            parts.append(inner_content[last_split:i])
                            last_split = i + 1
                parts.append(inner_content[last_split:])
                
                if len(parts) == 1:
                    # Only body provided
                    inner_content = f'{parts[0]}, {{ headers: {{ {CACHE_HEADER} }} }}'
                else:
                    # Second argument exists
                    first_arg = ",".join(parts[:-1])
                    second_arg = parts[-1].strip()
                    
                    if second_arg.startswith('{') and second_arg.endswith('}'):
                        # It's an object config, let's inject headers
                        if "headers:" in second_arg:
                            # has headers, insert Cache-Control into it
                            # Too complex to safely regex nested headers obj. We just do body replace if we can
                            pass
                        else:
                            # insert headers
                            inner_second = second_arg[1:-1]
                            new_second_arg = f'{{ {inner_second}, headers: {{ {CACHE_HEADER} }} }}'
                            inner_content = f'{first_arg}, {new_second_arg}'
                    else:
                        # Second argument is a variable, appending headers is unsafe here unless we destruct it
                        # Let's just leave it alone for now, or use Object.assign
                        pass
                        
            new_content += inner_content + ")"
            idx = curr
        else:
            # Failed to parse, just copy and move on
            new_content += content[curr:]
            break

    if new_content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Modified: {filepath}")

for root_dir in directories_api:
    if not os.path.exists(root_dir):
        continue
    for dirpath, dirnames, filenames in os.walk(root_dir):
        skip = False
        for ign in ignore_paths:
            if ign in dirpath.replace('\\', '/'):
                skip = True
        if skip:
            continue
        for file in filenames:
            if file == "route.ts":
                process_file(os.path.join(dirpath, file))

print("Header injection complete.")
