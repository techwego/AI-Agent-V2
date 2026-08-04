import os
import csv
import json
from typing import List, Dict

def parse_file(file_path: str) -> List[Dict]:
    """Parse a file based on its extension into normalized chunks with metadata."""
    ext = file_path.split('.')[-1].lower() if '.' in file_path else ''
    filename = os.path.basename(file_path)
    
    if ext == 'csv':
        return parse_csv(file_path, filename)
    elif ext == 'txt':
        return parse_txt(file_path, filename)
    elif ext in ['md', 'markdown']:
        return parse_txt(file_path, filename)
    elif ext == 'json':
        return parse_json(file_path, filename)
    elif ext == 'pdf':
        return parse_pdf(file_path, filename)
    elif ext in ['docx', 'doc']:
        return parse_docx(file_path, filename)
    elif ext in ['xlsx', 'xls']:
        return parse_excel(file_path, filename)
    else:
        # Fallback to basic text parsing for other types
        return parse_txt(file_path, filename)

def parse_csv(file_path: str, filename: str) -> List[Dict]:
    """Convert CSV rows into rich natural language representations."""
    chunks = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # We construct a natural language block instead of raw CSV
            lines = []
            metadata = {"source": filename, "document_type": "csv"}
            
            # Map standard book headers if present
            title = row.get("Book Name") or row.get("Title") or row.get("Book_Name")
            author = row.get("Author")
            rack = row.get("Rack")
            shelf = row.get("Shelf")
            copies = row.get("Copies") or row.get("Available")
            
            if title: lines.append(f"Book Title: {title}")
            if author: lines.append(f"Author: {author}")
            if rack: lines.append(f"Rack: {rack}")
            if shelf: lines.append(f"Shelf: {shelf}")
            if copies: lines.append(f"Available Copies: {copies}")
            
            # Add any remaining keys
            for k, v in row.items():
                if v and str(v).strip():
                    metadata[k.lower()] = str(v).strip()
                    if k not in ["Book Name", "Title", "Book_Name", "Author", "Rack", "Shelf", "Copies", "Available"]:
                        lines.append(f"{k}: {v}")
                        
            text_block = "\n".join(lines)
            if text_block.strip():
                chunks.append({
                    "text": text_block,
                    "metadata": metadata
                })
    return chunks

def parse_txt(file_path: str, filename: str) -> List[Dict]:
    """Simple text parser that chunks by double newlines (paragraphs)."""
    chunks = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by paragraphs
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    for i, p in enumerate(paragraphs):
        chunks.append({
            "text": p,
            "metadata": {
                "source": filename,
                "document_type": "txt",
                "paragraph_index": i
            }
        })
    return chunks

def parse_json(file_path: str, filename: str) -> List[Dict]:
    """Parse a JSON array of objects."""
    chunks = []
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                text = item.pop("text", None) or item.pop("content", None) or json.dumps(item)
                item["source"] = filename
                item["document_type"] = "json"
                chunks.append({
                    "text": str(text),
                    "metadata": item
                })
    return chunks

def parse_pdf(file_path: str, filename: str) -> List[Dict]:
    import pypdf
    chunks = []
    try:
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    chunks.append({
                        "text": text.strip(),
                        "metadata": {
                            "source": filename,
                            "document_type": "pdf",
                            "page": i + 1
                        }
                    })
    except Exception as e:
        print(f"Error parsing PDF {filename}: {e}")
    return chunks

def parse_docx(file_path: str, filename: str) -> List[Dict]:
    import docx2txt
    chunks = []
    try:
        text = docx2txt.process(file_path)
        if text:
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            for i, p in enumerate(paragraphs):
                chunks.append({
                    "text": p,
                    "metadata": {
                        "source": filename,
                        "document_type": "docx",
                        "paragraph_index": i
                    }
                })
    except Exception as e:
        print(f"Error parsing DOCX {filename}: {e}")
    return chunks

def parse_excel(file_path: str, filename: str) -> List[Dict]:
    import pandas as pd
    chunks = []
    try:
        df = pd.read_excel(file_path)
        for i, row in df.iterrows():
            lines = []
            metadata = {"source": filename, "document_type": "excel"}
            for col_name, val in row.items():
                if pd.notna(val):
                    val_str = str(val).strip()
                    if val_str:
                        metadata[str(col_name).lower()] = val_str
                        lines.append(f"{col_name}: {val_str}")
            text_block = "\n".join(lines)
            if text_block.strip():
                chunks.append({
                    "text": text_block,
                    "metadata": metadata
                })
    except Exception as e:
        print(f"Error parsing Excel {filename}: {e}")
    return chunks
