import re

# Read the file
with open('KikiAI/wwwroot/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add libraries after style-inline-buttons.css
libs = '''    <!-- Highlight.js Theme -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    <!-- Marked.js & Highlight.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>'''

content = content.replace(
    '<link rel="stylesheet" href="style-inline-buttons.css">',
    '<link rel="stylesheet" href="style-inline-buttons.css">\n' + libs
)

# Add html-preview.js script
content = content.replace(
    '<script src="chat-helpers.js"></script>',
    '<script src="chat-helpers.js"></script>\n    <script src="html-preview.js"></script>'
)

# Write back
with open('KikiAI/wwwroot/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
