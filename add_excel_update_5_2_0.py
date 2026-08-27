import os
import pandas as pd
from datetime import datetime

docs_dir = 'docs'
push_history_file = os.path.join(docs_dir, 'Git_Push_History.xlsx')
version_history_file = os.path.join(docs_dir, 'Project_Version_History.xlsx')

date_str = datetime.now().strftime("%Y-%m-%d")
time_str = datetime.now().strftime("%H:%M")

pushes = [
    {
        'Date': date_str, 'Time': time_str, 'Git Push ID': 'PENDING', 'Version': '5.2.0',
        'Module': 'Admin Panel (Settings)',
        'Change Summary': 'Completed Phase 3: Global Library Settings Injection',
        'Detailed Changes': 'Added library_name, opening_hours, and library_policies to the LibraryConfig database schema. Built the Settings.jsx UI panel for admins to edit these fields. Modified the core AI RAG engine (engine.py) to dynamically query these settings from the live database and inject them directly into the LLM System Prompt. The Voice AI will now enforce custom library rules globally.',
        'Bugs Fixed': '',
        'Features Added': 'Dynamic Library Settings UI, AI System Prompt Injection.',
        'Testing': 'Verified UI saves correctly to DB and engine retrieves it.', 'Status': 'Live / Deployed'
    }
]

versions = [
    {
        'Version': p['Version'], 'Date': p['Date'], 'Git Push ID': p['Git Push ID'],
        'Major Changes': p['Change Summary'],
        'Functional Changes': p['Detailed Changes'],
        'UI/UX Changes': 'Created Settings Panel for Admin.',
        'Database/API Changes': 'Modified LibraryConfig schema with auto-migration.',
        'Bugs Fixed': p['Bugs Fixed'],
        'Testing Status': p['Testing'],
        'Current Status': p['Status'],
        'Notes': 'Deployed via Railway'
    } for p in pushes
]

try:
    df_push = pd.read_excel(push_history_file)
    df_new_push = pd.DataFrame(pushes)
    df_push = pd.concat([df_push, df_new_push], ignore_index=True)
    df_push.to_excel(push_history_file, index=False)

    df_version = pd.read_excel(version_history_file)
    df_new_version = pd.DataFrame(versions)
    df_version = pd.concat([df_version, df_new_version], ignore_index=True)
    df_version.to_excel(version_history_file, index=False)
    print("Excel updated successfully!")
except Exception as e:
    print(f"Error updating excel: {e}")
