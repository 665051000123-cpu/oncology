import sys
with open('d:/patien-system/client/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

stack = []
i = 0
in_str = None
in_comment = False
in_block_comment = False

while i < len(text):
    c = text[i]
    if in_str:
        if c == '\\': i += 2; continue
        if c == in_str: in_str = None
    elif in_comment:
        if c == '\n': in_comment = False
    elif in_block_comment:
        if c == '*' and i+1 < len(text) and text[i+1] == '/':
            in_block_comment = False; i += 1
    else:
        if c in ('\'', '\"', '`'):
            in_str = c
        elif c == '/' and i+1 < len(text) and text[i+1] == '/':
            in_comment = True; i += 1
        elif c == '/' and i+1 < len(text) and text[i+1] == '*':
            in_block_comment = True; i += 1
        elif c == '{' and i+1 < len(text) and text[i+1] == '/' and i+2 < len(text) and text[i+2] == '*':
            # Skip the entire JSX comment block to avoid unmatched }
            i += 3
            while i < len(text) - 1:
                if text[i] == '*' and text[i+1] == '/':
                    i += 1
                    # now skip until }
                    while i < len(text) and text[i] != '}':
                        i += 1
                    break
                i += 1
        elif c in '({[':
            stack.append((c, i))
        elif c in ')}]':
            if not stack:
                print(f'Unmatched {c} at index {i}')
                sys.exit(1)
            last, pos = stack.pop()
            pairs = {'(': ')', '{': '}', '[': ']'}
            if pairs[last] != c:
                line = text.count('\n', 0, i) + 1
                last_line = text.count('\n', 0, pos) + 1
                print(f'Mismatched {c} at line {line} (expected {pairs[last]} to match {last} at line {last_line})')
                sys.exit(1)
    i += 1
if stack:
    print('Unclosed brackets:', [(c, text.count('\n', 0, p) + 1) for c, p in stack])
else:
    print('All matched perfectly?!')
