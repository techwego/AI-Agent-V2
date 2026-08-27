import os
import pandas as pd
from datetime import datetime

docs_dir = 'docs'
if not os.path.exists(docs_dir):
    os.makedirs(docs_dir)

push_history_file = os.path.join(docs_dir, 'Git_Push_History.xlsx')
version_history_file = os.path.join(docs_dir, 'Project_Version_History.xlsx')

def init_push_history():
    cols = ['Date', 'Time', 'Git Push ID', 'Version', 'Module', 'Change Summary', 'Detailed Changes', 'Bugs Fixed', 'Features Added', 'Testing', 'Status']
    if not os.path.exists(push_history_file):
        df = pd.DataFrame(columns=cols)
        df.to_excel(push_history_file, index=False)
    return cols

def init_version_history():
    cols = ['Version', 'Date', 'Git Push ID', 'Major Changes', 'Functional Changes', 'UI/UX Changes', 'Database/API Changes', 'Bugs Fixed', 'Testing Status', 'Current Status', 'Notes']
    if not os.path.exists(version_history_file):
        df = pd.DataFrame(columns=cols)
        df.to_excel(version_history_file, index=False)
    return cols

push_cols = init_push_history()
version_cols = init_version_history()

# Push data to append
date_str = '2026-08-20'

pushes = [
    {
        'Date': date_str, 'Time': '15:46', 'Git Push ID': '5278463', 'Version': '5.0.2',
        'Module': 'Backend (RAG Engine)',
        'Change Summary': 'Fixed catalog search bug and updated location routing logic.',
        'Detailed Changes': 'Updated the intent router to strip conversational fluff like "where is" to properly extract book titles. Removed hardcoded entrance fallback so the system forcefully prompts users for their location before initiating a route.',
        'Bugs Fixed': 'Fixed catalog lookup failing on "where is" questions.',
        'Features Added': 'Interactive 2-step location routing.',
        'Testing': 'Tested on local backend.', 'Status': 'Deployed'
    },
    {
        'Date': date_str, 'Time': '15:56', 'Git Push ID': '20f9216', 'Version': '5.0.3',
        'Module': 'Frontend (Wayfinder)',
        'Change Summary': 'Added GPS-style turn-by-turn navigation.',
        'Detailed Changes': 'Replaced generic guidance with a mathematical heading vector system that calculates cross-products of movement vectors to accurately instruct users to Turn left, Turn right, or Head straight.',
        'Bugs Fixed': '',
        'Features Added': 'Precise directional turn-by-turn logic.',
        'Testing': 'Verified grid traversal cross products.', 'Status': 'Deployed'
    },
    {
        'Date': date_str, 'Time': '16:03', 'Git Push ID': 'df2830d', 'Version': '5.0.4',
        'Module': 'Frontend (Voice Assistant)',
        'Change Summary': 'Dynamic floor switcher buttons in 3D Map.',
        'Detailed Changes': 'Updated the fullscreen map UI to dynamically read the admin architecture configuration and render buttons for all active floors rather than being hardcoded to just Floor 1 and 2.',
        'Bugs Fixed': '',
        'Features Added': 'Dynamic floor synchronization.',
        'Testing': 'Verified UI button generation.', 'Status': 'Deployed'
    },
    {
        'Date': date_str, 'Time': '16:27', 'Git Push ID': '45dda18', 'Version': '5.0.5',
        'Module': 'Backend (LLM Config)',
        'Change Summary': 'Changed Groq Model ID.',
        'Detailed Changes': 'Updated GROQ_MODEL in config.py from llama-3.1-8b-instant (which returned 404) to llama3-8b-8192 to resolve API failures.',
        'Bugs Fixed': 'Fixed 404 Model Not Found error on Groq.',
        'Features Added': '',
        'Testing': 'Tested connection logic.', 'Status': 'Superseded'
    },
    {
        'Date': date_str, 'Time': '16:37', 'Git Push ID': '295b9bd', 'Version': '5.0.6',
        'Module': 'Frontend & Backend',
        'Change Summary': 'Fixed WebGL leak and updated Groq model.',
        'Detailed Changes': 'Removed onConfigLoaded from LibraryWayfinder useEffect dependencies to stop an infinite fetch loop when the session expired. Changed Groq model to mixtral-8x7b-32768 after discovering llama3-8b-8192 was decommissioned.',
        'Bugs Fixed': 'Fixed "Too many active WebGL contexts" memory leak. Fixed Groq 400 decommission error.',
        'Features Added': '',
        'Testing': 'Verified infinite loop fix in useEffect.', 'Status': 'Superseded'
    },
    {
        'Date': date_str, 'Time': '16:50', 'Git Push ID': '90f719b', 'Version': '5.0.7',
        'Module': 'Backend (LLM Config)',
        'Change Summary': 'Final Groq Model alignment for API key.',
        'Detailed Changes': 'Wrote a script to query the allowed models on the user\'s specific Groq API key tier, and updated config.py to use qwen/qwen3.6-27b which was confirmed to work and support thinking blocks.',
        'Bugs Fixed': 'Fixed 403 / 400 errors across all standard models for this specific API key.',
        'Features Added': '',
        'Testing': 'Tested API key capabilities via Python urllib script.', 'Status': 'Live / Deployed'
    }
]

versions = [
    {
        'Version': p['Version'], 'Date': p['Date'], 'Git Push ID': p['Git Push ID'],
        'Major Changes': p['Change Summary'],
        'Functional Changes': p['Detailed Changes'],
        'UI/UX Changes': 'Updated map and navigation panel' if 'Frontend' in p['Module'] else 'N/A',
        'Database/API Changes': 'Changed Groq Model endpoints' if 'LLM' in p['Module'] else 'N/A',
        'Bugs Fixed': p['Bugs Fixed'],
        'Testing Status': p['Testing'],
        'Current Status': p['Status'],
        'Notes': 'Deployed via Railway'
    } for p in pushes
]

# Append to Git_Push_History.xlsx
df_push = pd.read_excel(push_history_file)
df_new_push = pd.DataFrame(pushes)
df_push = pd.concat([df_push, df_new_push], ignore_index=True)
df_push.to_excel(push_history_file, index=False)

# Append to Project_Version_History.xlsx
df_version = pd.read_excel(version_history_file)
df_new_version = pd.DataFrame(versions)
df_version = pd.concat([df_version, df_new_version], ignore_index=True)
df_version.to_excel(version_history_file, index=False)

print("Excel tracking files created and updated successfully.")
