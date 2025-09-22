#!/usr/bin/env python3

# Read the file
with open('tasks-prd-automated-playwright-tests.md', 'r') as f:
    content = f.read()

# Split into sections
lines = content.split('\n')

# Find where tasks start
task_start = -1
for i, line in enumerate(lines):
    if line.startswith('## Tasks'):
        task_start = i
        break

# Extract preamble (everything before tasks)
preamble = '\n'.join(lines[:110])

# Extract each task section
task_4_auth = []  # Lines 326-398 in original
task_5_cli = []   # Lines 251-324 in original  
task_6_smoke = []  # Lines 111-172 in original
task_7_matrix = []  # Lines 174-249 in original

# Extracting Task 4 (authenticated CLI) - currently at lines 326-398
task_4_start = 325
task_4_end = 398
for i in range(task_4_start, min(task_4_end + 1, len(lines))):
    if i < len(lines):
        task_4_auth.append(lines[i])

# Extracting Task 5 (CLI commands) - currently at lines 251-324  
task_5_start = 250
task_5_end = 324
for i in range(task_5_start, min(task_5_end + 1, len(lines))):
    if i < len(lines):
        task_5_cli.append(lines[i])

# Extracting Task 6 (Enhanced smoke) - currently at lines 111-172
task_6_start = 110
task_6_end = 172
for i in range(task_6_start, min(task_6_end + 1, len(lines))):
    if i < len(lines):
        task_6_smoke.append(lines[i])

# Extracting Task 7 (Matrix) - currently at lines 174-249
task_7_start = 173
task_7_end = 249
for i in range(task_7_start, min(task_7_end + 1, len(lines))):
    if i < len(lines):
        task_7_matrix.append(lines[i])

# Extract the rest (tasks 8-13)
rest_start = 399
rest = []
for i in range(rest_start, len(lines)):
    if i < len(lines):
        rest.append(lines[i])

# Now reassemble in the correct order
output = []
output.extend(preamble.split('\n'))
output.append('')

# Add tasks in new order: 4, 5, 6, 7, 8-13
output.extend(task_4_auth)
output.append('')
output.extend(task_5_cli)
output.append('')
output.extend(task_6_smoke)
output.append('')
output.extend(task_7_matrix)
output.append('')
output.extend(rest)

# Write the reorganized content
with open('tasks-prd-automated-playwright-tests-reordered.md', 'w') as f:
    f.write('\n'.join(output))

print("File reorganized successfully!")