import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { uploadFile, getUploads, deleteUpload, resetStuckUploads, deleteAllData } from '../../api/client';
import { useToast } from '../../components/Toast';

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();
  const intervalRef = useRef(null);

  // Poll backend for upload status
  const fetchUploads = async () => {
    try {
      const response = await getUploads();
      const serverUploads = response.data;
      
      setFiles(prev => {
        // Keep only local pending files that haven't been assigned a numeric ID yet
        const localPending = prev.filter(f => typeof f.id === 'string' && f.status === 'pending');
        
        // Map server uploads
        const mappedServer = serverUploads.map(serverFile => {
          let progress = serverFile.status === 'completed' || serverFile.status === 'failed' ? 100 : 25;
          const msg = serverFile.message || '';
          if (msg.includes('Converting')) progress = 40;
          if (msg.includes('Generating')) progress = 60;
          if (msg.includes('Embedded')) {
            const match = msg.match(/Embedded (\d+) of (\d+)/);
            if (match) {
               progress = 60 + Math.floor((parseInt(match[1]) / parseInt(match[2])) * 35);
            } else {
               progress = 75;
            }
          }
          return {
            id: serverFile.id,
            filename: serverFile.filename,
            size: "Unknown",
            status: serverFile.status,
            message: msg,
            progress: progress
          };
        });
        
        return [...mappedServer, ...localPending];
      });
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    }
  };

  useEffect(() => {
    fetchUploads();
    intervalRef.current = setInterval(fetchUploads, 3000); // Poll every 3 seconds
    return () => clearInterval(intervalRef.current);
  }, []);

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

    if (validFiles.length < newFiles.length) {
      showToast("Some files were rejected. Unsupported format.", "error");
    }

    const newFileObjs = validFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substring(7), // Temp ID until uploaded
      filename: f.name,
      size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
      progress: 0,
      status: 'pending',
      message: 'Ready to upload'
    }));

    setFiles(prev => [...prev, ...newFileObjs]);
  };

  const startUpload = async () => {
    setUploading(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending' && f.file);
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileObj = pendingFiles[i];
      
      updateFileStatus(fileObj.id, 'uploading', 'Uploading to server...', 25);
      
      const formData = new FormData();
      formData.append('file', fileObj.file);
      
      try {
        const response = await uploadFile(formData);
        const serverId = response.data.upload_id;
        
        // Update local ID to server ID so polling matches it
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
          ...f, 
          id: serverId, 
          status: 'processing', 
          message: 'Uploaded. Waiting for pipeline...',
          progress: 50
        } : f));
        
        showToast(`Successfully uploaded ${fileObj.filename}`, "success");
      } catch (err) {
        console.error("Upload error:", err);
        updateFileStatus(fileObj.id, 'failed', err.response?.data?.detail || 'Upload failed', 100);
        showToast(`Failed to upload ${fileObj.filename}`, "error");
      }
    }
    
    setUploading(false);
    fetchUploads(); // Trigger immediate poll
  };

  const updateFileStatus = (id, status, message, progress) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status, message, progress } : f));
  };

  const removeFile = async (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (typeof id === 'number') {
      try {
        await deleteUpload(id);
      } catch (err) {
        console.error("Failed to delete upload from server:", err);
      }
    }
  };

  const handleResetQueue = async () => {
    try {
      await resetStuckUploads();
      showToast("Queue reset successfully", "success");
      fetchUploads();
    } catch (err) {
      showToast("Failed to reset queue", "error");
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all database data? This action cannot be undone.")) {
      try {
        await deleteAllData();
        showToast("All data deleted successfully", "success");
        fetchUploads();
      } catch (err) {
        showToast("Failed to delete all data", "error");
      }
    }
  };

  const isCompleteOrFailed = (status) => status === 'completed' || status === 'failed';

  // Determine active pipeline step based on the most recent processing file
  const activeProcessingFile = files.find(f => f.status === 'processing' || f.status === 'uploading');
  const pipelineStep = activeProcessingFile ? (
    activeProcessingFile.status === 'uploading' ? 1 :
    activeProcessingFile.message.includes('Converting') ? 2 :
    activeProcessingFile.message.includes('Generating') || activeProcessingFile.message.includes('Embedded') ? 3 : 4
  ) : (files.some(f => f.status === 'completed') ? 4 : 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Dataset</h1>
        <p className="text-gray-400 text-sm mt-1">Upload files to extract JSON data and update embedding vectors.</p>
        {files.some(f => f.status === 'completed') && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium flex items-center gap-2">
            <CheckCircle size={18} />
            Your data is now live and perfectly searchable in the Voice Chat!
          </div>
        )}
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
            <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <h3 className="font-medium text-white">Upload Queue ({files.length})</h3>
                <button 
                  onClick={startUpload}
                  disabled={uploading || !files.some(f => f.status === 'pending' && f.file)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Start Upload'}
                </button>
              </div>
              <ul className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <li key={file.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <FileType size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate">{file.filename}</span>
                        <span className="text-xs text-gray-400">{file.size}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1 relative overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            file.status === 'completed' ? 'bg-green-500' :
                            file.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${file.progress}%` }}
                        ></div>
                        {(file.status === 'processing' || file.status === 'uploading') && (
                          <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 capitalize">{file.message || file.status}</span>
                        {!(file.status === 'uploading' || file.status === 'processing') && (
                          <button onClick={() => removeFile(file.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 flex justify-end">
                      {file.status === 'completed' && <CheckCircle size={20} className="text-green-500" />}
                      {file.status === 'failed' && <AlertCircle size={20} className="text-red-500" />}
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
          <div className="glass-card rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">Live Pipeline Tracking</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent">
              
              <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${pipelineStep >= 1 ? 'is-active' : 'opacity-50'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${pipelineStep >= 1 ? 'border-blue-500 bg-blue-900/50 text-blue-400' : 'border-gray-700 bg-gray-900 text-gray-500'} shadow shrink-0 z-10 transition-colors`}>
                  1
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className={`text-sm font-medium ${pipelineStep >= 1 ? 'text-white' : 'text-gray-500'}`}>Upload</h4>
                  <p className="text-xs text-gray-500">File safely stored on server</p>
                </div>
              </div>
              
              <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${pipelineStep >= 2 ? 'is-active' : 'opacity-50'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${pipelineStep >= 2 ? 'border-purple-500 bg-purple-900/50 text-purple-400' : 'border-gray-700 bg-gray-900 text-gray-500'} shadow shrink-0 z-10 transition-colors`}>
                  2
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className={`text-sm font-medium ${pipelineStep >= 2 ? 'text-white' : 'text-gray-500'}`}>JSON Parse</h4>
                  <p className="text-xs text-gray-500">Converted to normalized JSON</p>
                </div>
              </div>

              <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${pipelineStep >= 3 ? 'is-active' : 'opacity-50'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${pipelineStep >= 3 ? 'border-amber-500 bg-amber-900/50 text-amber-400' : 'border-gray-700 bg-gray-900 text-gray-500'} shadow shrink-0 z-10 transition-colors`}>
                  3
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className={`text-sm font-medium ${pipelineStep >= 3 ? 'text-white' : 'text-gray-500'}`}>Embed</h4>
                  <p className="text-xs text-gray-500">Vector generation in progress</p>
                </div>
              </div>

              <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${pipelineStep >= 4 ? 'is-active' : 'opacity-50'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${pipelineStep >= 4 ? 'border-green-500 bg-green-900/50 text-green-400' : 'border-gray-700 bg-gray-900 text-gray-500'} shadow shrink-0 z-10 transition-colors`}>
                  4
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:odd:pr-4 md:even:pl-4">
                  <h4 className={`text-sm font-medium ${pipelineStep >= 4 ? 'text-white' : 'text-gray-500'}`}>Index</h4>
                  <p className="text-xs text-gray-500">Data pushed to ChromaDB & BM25</p>
                </div>
              </div>

            </div>
          </div>

          <div className="glass-card rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Stuck Processing?
            </h3>
            <p className="text-xs text-gray-400 mb-4">If a file has been stuck in processing for more than 10 minutes, you can reset the queue.</p>
            <button onClick={handleResetQueue} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              <RefreshCw size={14} /> Reset Queue
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-red-900/50 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <Trash2 size={16} className="text-red-500" />
              Danger Zone
            </h3>
            <p className="text-xs text-gray-400 mb-4">Permanently delete all uploaded files, books, and vector embeddings from the database.</p>
            <button onClick={handleDeleteAll} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-sm font-medium rounded-lg border border-red-900/50 transition-colors">
              <Trash2 size={14} /> Delete All Database Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
