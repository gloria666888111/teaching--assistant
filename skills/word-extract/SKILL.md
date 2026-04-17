---
name: word-extract
description: Extract text from Word (.docx) documents with structure preservation
metadata: { "openclaw": { "emoji": "📄", "requires": { "bins": ["python3"], "pip": ["python-docx"] }, "primaryEnv": "" } }
---

# Word Document Extractor

Extract text content from Word (.docx) documents with structure preservation.

## Features

- **Structure preservation**: Detects headings, paragraphs, and lists
- **Table extraction**: Extracts tables in Markdown format
- **Markdown conversion**: Converts Word documents to Markdown format
- **Plain text mode**: Extracts text without any formatting

## Scripts

### extract_docx.py

Extract text from Word documents.

#### Usage

```bash
# Extract with structure (Markdown format)
python extract_docx.py input.docx

# Extract to file
python extract_docx.py input.docx -o output.md

# Extract plain text only
python extract_docx.py input.docx --plain -o output.txt

# Convert to Markdown
python extract_docx.py input.docx --md -o output.md
```

#### Options

| Option | Description |
|--------|-------------|
| `docx_file` | Path to the Word (.docx) file (required) |
| `-o, --output` | Output file path (optional, prints to stdout if not specified) |
| `--plain` | Extract plain text without structure |
| `--md, --markdown` | Convert to Markdown format (default) |

## Integration with MaterialLoader

The MaterialLoader automatically detects `.docx` files and uses this extractor.

## Supported Elements

- ✅ Headings (H1-H6)
- ✅ Paragraphs
- ✅ Bold, italic, underline (preserved as Markdown)
- ✅ Lists (ordered and unordered)
- ✅ Tables (converted to Markdown tables)
- ✅ Images (preserved as Markdown image links)

## Technical Notes

- Requires `python-docx` package
- Preserves document structure by default
- Tables are converted to Markdown format
- Heading styles are mapped to Markdown headings
