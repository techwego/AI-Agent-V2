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
        'Date': date_str, 'Time': time_str, 'Git Push ID': '4b71756', 'Version': '5.3.0',
        'Module': 'Admin Panel (Users & Departments)',
        'Change Summary': 'Completed Phase 4: Users and Departments Management',
        'Detailed Changes': 'Added a Create User modal to Users.jsx allowing Admins to register new users or other admins. Verified that Departments.jsx is fully functional for tracking campus buildings, HODs, and floors.',
        'Bugs Fixed': '',
        'Features Added': 'Admin user creation capability.',
        'Testing': 'Verified UI rendering.', 'Status': 'Live / Deployed'
    }
]

versions = [
    {
        'Version': p['Version'], 'Date': p['Date'], 'Git Push ID': p['Git Push ID'],
        'Major Changes': p['Change Summary'],
        'Functional Changes': p['Detailed Changes'],
        'UI/UX Changes': 'Added Add User modal to Users.jsx',
        'Database/API Changes': 'Integrated register API into Admin dashboard.',
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
