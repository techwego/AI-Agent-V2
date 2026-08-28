import re
f=open('frontend/src/pages/VoiceAssistant.jsx', 'r', encoding='utf-8')
c=f.read()
f.close()

# 1. Remove duplicate equalizer block CORRECTLY
eq_pattern = r'\{\/\*\s*Dynamic Sound Wave Acoustic Equalizer\s*\*\/\}.*?(?=<\/div>\s*\{\/\*\s*Live Voice Transcript Box)'
c = re.sub(eq_pattern, '', c, flags=re.DOTALL)

# 2. Fix header responsive layout
c = c.replace('<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">', '<div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-3">', 1)
c = c.replace('<h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">', '<h1 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-none">', 1)

# 3. Fix empty bubble error logic
v_err = '''      setVoiceMessages(prev => {
        const newMsg = [...prev];
        if (newMsg.length > 0 && newMsg[newMsg.length - 1].content === '') {
          newMsg[newMsg.length - 1] = { role: 'assistant', content: errMsg, timestamp: Date.now() };
          return newMsg;
        }
        return [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }];
      });'''

c = re.sub(r'setVoiceMessages\(prev => \[\.\.\.prev, \{ role: \'assistant\', content: errMsg, timestamp: Date.now\(\) \}\]\);', v_err, c)

t_err = '''        setChatMessages(prev => {
          const newMsg = [...prev];
          if (newMsg.length > 0 && newMsg[newMsg.length - 1].content === '') {
            newMsg[newMsg.length - 1] = { role: 'assistant', content: errMsg, timestamp: Date.now() };
            return newMsg;
          }
          return [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }];
        });'''

c = re.sub(r'setChatMessages\(prev => \[\.\.\.prev, \{ role: \'assistant\', content: errMsg, timestamp: Date.now\(\) \}\]\);', t_err, c)

v_clean = '''        if (isValid) {
          showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
          setActiveTab('map');
          setIsMapFullscreen(true);
        }
      }

      setVoiceMessages(prev => {
        const newMsg = [...prev];
        if (newMsg.length > 0 && newMsg[newMsg.length - 1].content.trim() === '') {
          newMsg.pop();
          return newMsg;
        }
        return prev;
      });
'''

c = c.replace('''        if (isValid) {
          showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
          setActiveTab('map');
          setIsMapFullscreen(true);
        }
      }''', v_clean, 1)

t_clean = '''          if (isValid) {
            showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
            setActiveTab('map');
            setIsMapFullscreen(true);
          }
        }

        setChatMessages(prev => {
          const newMsg = [...prev];
          if (newMsg.length > 0 && newMsg[newMsg.length - 1].content.trim() === '') {
            newMsg.pop();
            return newMsg;
          }
          return prev;
        });
'''

c = c.replace('''          if (isValid) {
            showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
            setActiveTab('map');
            setIsMapFullscreen(true);
          }
        }''', t_clean, 1)


f=open('frontend/src/pages/VoiceAssistant.jsx', 'w', encoding='utf-8')
f.write(c)
f.close()
