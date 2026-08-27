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
        'Date': date_str, 'Time': time_str, 'Git Push ID': '237b894', 'Version': '5.1.0',
        'Module': 'Admin Panel & RAG Engine',
        'Change Summary': 'Completed Books API, Analytics Dashboard, and Real-time SQL Sync',
        'Detailed Changes': 'Created fully working Books API so Admin UI can Add/Edit/Delete books. Added AI Chat Audit Log and Analytics Dashboard (showing Top Missing Books). Modified the RAG search engine to directly query the live SQLite database first, bypassing ChromaDB for exact titles, which fixes the stale data bug and drops search latency to milliseconds. Added time-based Voice Assistant greeting.',
        'Bugs Fixed': 'Fixed stale book location data by querying live DB. Reduced agent latency. Added missing Voice greeting.',
        'Features Added': 'Analytics Page, AI Chat Audit Logs, Time-based Mic Greeting.',
        'Testing': 'Verified SQL query execution in search_catalog.', 'Status': 'Live / Deployed'
    }
]

versions = [
    {
        'Version': p['Version'], 'Date': p['Date'], 'Git Push ID': p['Git Push ID'],
        'Major Changes': p['Change Summary'],
        'Functional Changes': p['Detailed Changes'],
        'UI/UX Changes': 'Added AI Chat Logs tab and Voice greeting logic.',
        'Database/API Changes': 'New analytics_routes and book_routes APIs. RAG engine modified to hit SQLite.',
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
