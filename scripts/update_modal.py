with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Replace the HTML modal structure
modal_html_old = r'<div class=\"modal-overlay\" id=\"authModal\">.*?</div>\s*</div>\s*</div>'
modal_html_new = '''<div class="modal-overlay" id="authModal">
  <div class="modal" style="max-width: 600px;">
    <button class="close-modal" onclick="closeModals()">×</button>
    <div id="loginSection">
      <h2>Librarian Login</h2>
      <input type="text" id="username" placeholder="Username">
      <input type="password" id="password" placeholder="Password">
      <button onclick="doLogin()">Login</button>
    </div>
    <div id="uploadSection" style="display: none; flex-direction: column;">
      <h2>Admin Dashboard</h2>
      
      <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div class="stat-card" style="flex: 1; padding: 16px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid var(--line); text-align: center;">
          <h3 id="statTotal" style="font-size: 24px; color: var(--blue); margin: 0;">0</h3>
          <p style="font-size: 11.5px; color: var(--faint); margin: 4px 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Files</p>
        </div>
        <div class="stat-card" style="flex: 1; padding: 16px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid var(--line); text-align: center;">
          <h3 id="statSuccess" style="font-size: 24px; color: var(--orange); margin: 0;">0</h3>
          <p style="font-size: 11.5px; color: var(--faint); margin: 4px 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Success</p>
        </div>
        <div class="stat-card" style="flex: 1; padding: 16px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid var(--line); text-align: center;">
          <h3 id="statFailed" style="font-size: 24px; color: #ff4a4a; margin: 0;">0</h3>
          <p style="font-size: 11.5px; color: var(--faint); margin: 4px 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Failed</p>
        </div>
      </div>

      <div class="file-drop" onclick="document.getElementById('fileInput').click()" style="margin-bottom: 12px; padding: 20px; font-size: 13px;">
        Click to select or drag and drop a PDF/Word/TXT file to inject into the AI brain.
      </div>
      <input type="file" id="fileInput" style="display: none;" onchange="uploadFile()">
      <p id="uploadStatus" style="font-size: 13px; color: var(--blue); margin-top: 0; margin-bottom: 16px; text-align: center; height: 15px;"></p>

      <h3 style="font-size: 14px; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 10px;">Upload History</h3>
      <div id="uploadHistory" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
        <!-- History items -->
      </div>
    </div>
  </div>
</div>'''
content = re.sub(modal_html_old, modal_html_new, content, flags=re.DOTALL)

# Replace the JS logic
js_old = r'function doLogin\(\).*?\}\s*\}\s*async function uploadFile\(\).*?\}\s*\}'
js_new = '''function doLogin() {
          const u = document.getElementById('username').value;
          const p = document.getElementById('password').value;
          if(u === 'admin' && p === 'admin') {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('uploadSection').style.display = 'flex';
            fetchDashboard();
          } else {
            alert('Invalid credentials');
          }
        }

        async function fetchDashboard() {
          try {
            const res = await fetch('/api/uploads');
            const data = await res.json();
            
            document.getElementById('statTotal').innerText = data.length;
            document.getElementById('statSuccess').innerText = data.filter(d => d.status === 'Success').length;
            document.getElementById('statFailed').innerText = data.filter(d => d.status === 'Failed').length;
            
            const history = document.getElementById('uploadHistory');
            history.innerHTML = data.map(d => {
              let color = d.status === 'Success' ? 'var(--orange)' : (d.status === 'Failed' ? '#ff4a4a' : 'var(--blue)');
              let msg = d.message ? `<div style="font-size: 11px; color: var(--faint); margin-top: 6px; line-height: 1.4;">${d.message}</div>` : '';
              return `<div style="padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 3px solid ${color};">
                <div style="display: flex; justify-content: space-between; font-size: 13px; align-items: center;">
                  <span style="color: var(--ink); font-weight: 500;">${d.filename}</span>
                  <span style="color: ${color}; font-weight: 700; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;">${d.status}</span>
                </div>
                ${msg}
              </div>`;
            }).join('');
          } catch(e) {
            console.error("Dashboard fetch error", e);
          }
        }

        async function uploadFile() {
          const file = document.getElementById('fileInput').files[0];
          if(!file) return;
          const stat = document.getElementById('uploadStatus');
          stat.innerText = "File queued for background indexing...";
          stat.style.color = "var(--blue)";
          
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            if(res.ok) {
              fetchDashboard(); // Refresh immediately
              // Poll to catch the status transition from Processing -> Success/Failed
              let polls = 0;
              let intv = setInterval(() => {
                fetchDashboard();
                polls++;
                if(polls > 10) clearInterval(intv); // Stop polling after ~30s
              }, 3000);
            } else {
              stat.innerText = "Server rejected the file.";
              stat.style.color = "#ff4a4a";
            }
          } catch(e) {
            stat.innerText = "Upload network error.";
            stat.style.color = "#ff4a4a";
          }
        }'''
content = re.sub(js_old, js_new, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated auth modal')
