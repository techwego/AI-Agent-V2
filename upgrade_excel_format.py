import os
import pandas as pd

docs_dir = 'docs'
push_history_file = os.path.join(docs_dir, 'Git_Push_History.xlsx')
version_history_file = os.path.join(docs_dir, 'Project_Version_History.xlsx')

# New Enterprise-Level Columns for Git Push History
ent_push_cols = [
    'Date', 'Time', 'Version (Major.Minor.Build)', 'Git Push ID / Commit Hash', 
    'Affected Module / Workflow', 'What was changed', 'Why it was changed', 
    'How it works now', 'Bugs / Issues Fixed', 'New Functionality Added', 
    'What was tested', 'Current Status', 'Limitations / Pending Work'
]

# New Enterprise-Level Columns for Project Version History
ent_version_cols = [
    'Version (Major.Minor.Build)', 'Release Date', 'Git Commit Range', 
    'Major Changes Overview', 'Functional / Logic Changes', 'UI/UX Changes', 
    'Database / API / Backend Changes', 'Bugs / Issues Fixed', 
    'QA / Testing Status', 'Current Status', 'Limitations / Pending Work'
]

def migrate_push_history():
    if os.path.exists(push_history_file):
        df = pd.read_excel(push_history_file)
        # Map old columns to new, filling missing with empty string
        new_df = pd.DataFrame(columns=ent_push_cols)
        if not df.empty:
            new_df['Date'] = df.get('Date', '')
            new_df['Time'] = df.get('Time', '')
            new_df['Version (Major.Minor.Build)'] = df.get('Version', '')
            new_df['Git Push ID / Commit Hash'] = df.get('Git Push ID', '')
            new_df['Affected Module / Workflow'] = df.get('Module', '')
            new_df['What was changed'] = df.get('Detailed Changes', '')
            new_df['Why it was changed'] = df.get('Change Summary', '')
            new_df['How it works now'] = df.get('Detailed Changes', '')
            new_df['Bugs / Issues Fixed'] = df.get('Bugs Fixed', '')
            new_df['New Functionality Added'] = df.get('Features Added', '')
            new_df['What was tested'] = df.get('Testing', '')
            new_df['Current Status'] = df.get('Status', '')
            new_df['Limitations / Pending Work'] = ''
        new_df.to_excel(push_history_file, index=False)

def migrate_version_history():
    if os.path.exists(version_history_file):
        df = pd.read_excel(version_history_file)
        new_df = pd.DataFrame(columns=ent_version_cols)
        if not df.empty:
            new_df['Version (Major.Minor.Build)'] = df.get('Version', '')
            new_df['Release Date'] = df.get('Date', '')
            new_df['Git Commit Range'] = df.get('Git Push ID', '')
            new_df['Major Changes Overview'] = df.get('Major Changes', '')
            new_df['Functional / Logic Changes'] = df.get('Functional Changes', '')
            new_df['UI/UX Changes'] = df.get('UI/UX Changes', '')
            new_df['Database / API / Backend Changes'] = df.get('Database/API Changes', '')
            new_df['Bugs / Issues Fixed'] = df.get('Bugs Fixed', '')
            new_df['QA / Testing Status'] = df.get('Testing Status', '')
            new_df['Current Status'] = df.get('Current Status', '')
            new_df['Limitations / Pending Work'] = df.get('Notes', '')
        new_df.to_excel(version_history_file, index=False)

migrate_push_history()
migrate_version_history()
print("Excel files successfully upgraded to Enterprise-Level format.")
