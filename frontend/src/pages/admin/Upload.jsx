import React, { useState, useCallback } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { uploadFile } from '../../api/client';

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles) => {
    const validExtensions = ['csv', 'xlsx', 'json', 'txt', 'pdf', 'docx'];
    const validFiles = newFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return validExtensions.includes(ext);
    });

    const newFileObjs = validFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending' // pending, uploading, processing, success, error
    }));

    setFiles(prev => [...prev, ...newFileObjs]);
  };

  const startUpload = async () => {
    setUploading(true);
    // Simulate upload and processing for demo
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      updateFileStatus(files[i].id, 'uploading', 50);
      await new Promise(r => setTimeout(r, 1000));
      
      updateFileStatus(files[i].id, 'processing', 75);
      await new Promise(r => setTimeout(r, 2000));
      
      updateFileStatus(files[i].id, 'success', 100);
    }
    setUploading(false);
  };

  const updateFileStatus = (id, status, progress) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status, progress } : f));
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Dataset</h1>
        <p className="text-gray-400 text-sm mt-1">Upload files to update the library database and embedding vectors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & Drop Zone */}
          <div 
            className={`glass-card border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <UploadCloud size={32} className={isDragging ? 'text-blue-400' : 'text-gray-400'} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Drag & Drop files here</h3>
            <p className="text-sm text-gray-400 mb-6">Supports CSV, Excel, JSON, PDF, TXT, DOCX</p>
            
            <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              <span>Browse Files</span>
              <input type="file" className="hidden" multiple onChange={handleFileInput} accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.docx" />
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <h3 className="font-medium text-white">Selected Files ({files.length})</h3>
                <button 
                  onClick={startUpload}
                  disabled={uploading || files.every(f => f.status === 'success')}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors"
                >
                  {uploading ? 'Processing...' : 'Start Upload'}
                </button>
              </div>
              <ul className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <li key={file.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <FileType size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">{file.file.name}</span>
                        <span className="text-xs text-gray-400">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1 relative overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            file.status === 'success' ? 'bg-green-500' :
                            file.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${file.progress}%` }}
                        ></div>
                        {file.status === 'processing' && (
                          <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 capitalize">{file.status}</span>
                        {file.status === 'pending' && (
                          <button onClick={() => removeFile(file.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 flex justify-end">
                      {file.status === 'success' && <CheckCircle size={20} className="text-green-500" />}
                      {file.status === 'error' && <AlertCircle size={20} className="text-red-500" />}
                      {(file.status === 'uploading' || file.status === 'processing') && <Loader2 size={20} className="text-blue-500 animate-spin" />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pipeline Info */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-gray-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Processing Pipeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-900 text-blue-400 shadow shrink-0 z-10">
                  1
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className="text-sm font-medium text-white">Upload</h4>
                  <p className="text-xs text-gray-500">Files saved to secure storage</p>
                </div>
              </div>
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-900 text-purple-400 shadow shrink-0 z-10">
                  2
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className="text-sm font-medium text-white">Parse</h4>
                  <p className="text-xs text-gray-500">Extract text and metadata</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-900 text-amber-400 shadow shrink-0 z-10">
                  3
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className="text-sm font-medium text-white">Embed</h4>
                  <p className="text-xs text-gray-500">Generate vector embeddings</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-900 text-green-400 shadow shrink-0 z-10">
                  4
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className="text-sm font-medium text-white">Index</h4>
                  <p className="text-xs text-gray-500">Update vector DB & SQL</p>
                </div>
              </div>

            </div>
          </div>

          <div className="glass-card rounded-2xl border border-gray-800 p-6">
            <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Stuck Processing?
            </h3>
            <p className="text-xs text-gray-400 mb-4">If a file has been stuck in processing for more than 10 minutes, you can reset the queue.</p>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              <RefreshCw size={14} /> Reset Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
