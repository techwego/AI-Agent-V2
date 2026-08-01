with open('backend/api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re

if 'from fastapi import' in content:
    content = content.replace('from fastapi import FastAPI, WebSocket', 'from fastapi import FastAPI, WebSocket, BackgroundTasks')
if 'import database' not in content:
    content = content.replace('from backend.rag.engine import HybridRAGEngine', 'from backend.rag.engine import HybridRAGEngine\nimport backend.database as database\nimport sys')

if 'database.init_db()' not in content:
    content = content.replace('def startup_event():', 'def startup_event():\n    database.init_db()')

upload_logic = '''
def process_upload_task(upload_id: int):
    import subprocess
    try:
        print(f'[UPLOAD] Processing task {upload_id}')
        result = subprocess.run([sys.executable, "index_books.py"], cwd=BASE_DIR, capture_output=True, text=True)
        if result.returncode == 0:
            database.update_upload_status(upload_id, "Success", "Indexed successfully")
            rag_engine.reload_index()
            print(f'[UPLOAD] Task {upload_id} Success')
        else:
            database.update_upload_status(upload_id, "Failed", result.stderr[-200:] if result.stderr else "Failed without error trace")
            print(f'[UPLOAD] Task {upload_id} Failed: {result.stderr}')
    except Exception as e:
        database.update_upload_status(upload_id, "Failed", str(e))
        print(f'[UPLOAD] Task {upload_id} Exception: {e}')

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_path = os.path.join(DATA_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
        
    upload_id = database.insert_upload(file.filename, "Processing", "File saved, indexing...")
    background_tasks.add_task(process_upload_task, upload_id)
    
    return JSONResponse(content={"message": f"Successfully uploaded {file.filename}", "upload_id": upload_id})

@app.get("/api/uploads")
def get_uploads():
    return database.get_all_uploads()
'''

old_upload = r'@app\.post\("/api/upload"\).*?return JSONResponse\(content=\{"message": f"Successfully uploaded \{file\.filename\}"\}\)'
content = re.sub(old_upload, upload_logic, content, flags=re.DOTALL)

with open('backend/api/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated main.py')
