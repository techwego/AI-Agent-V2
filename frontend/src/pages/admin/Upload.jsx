import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, RefreshCw, Trash2, Database, Sparkles, FileText, ArrowRight } from 'lucide-react';
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
        const localPending = prev.filter(f => typeof f.id === 'string' && f.status === 'pending');
        
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
            size: "Server File",
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
    intervalRef.current = setInterval(fetchUploads, 3000);
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
      showToast("Some files were rejected. Supported formats: CSV, XLSX, JSON, PDF, TXT", "error");
    }

    const newFileObjs = validFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substring(7),
      filename: f.name,
      size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
      status: 'pending',
      progress: 0,
      message: 'Ready to upload'
    }));

    setFiles(prev => [...newFileObjs, ...prev]);
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' && f.file);
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (const fileObj of pendingFiles) {
      const formData = new FormData();
      formData.append('file', fileObj.file);

      try {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', message: 'Sending to server...' } : f));
        
        await uploadFile(formData);
        showToast(`Uploaded ${fileObj.filename} successfully`, 'success');
        fetchUploads();
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'failed', message: err.response?.data?.detail || 'Upload failed' } : f));
        showToast(`Failed to upload ${fileObj.filename}`, 'error');
      }
    }

    setUploading(false);
  };

  const removeFile = async (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (typeof id === 'number') {
      try {
        await deleteUpload(id);
        showToast("File record removed", "info");
      } catch (err) {
        console.error("Failed to delete upload from server:", err);
      }
    }
  };

  const handleResetQueue = async () => {
    try {
      await resetStuckUploads();
      showToast("Processing queue reset successfully", "success");
      fetchUploads();
    } catch (err) {
      showToast("Failed to reset queue", "error");
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all indexed vectors and catalog data?")) {
      try {
        await deleteAllData();
        showToast("All data cleared successfully", "success");
        fetchUploads();
      } catch (err) {
        showToast("Failed to clear data", "error");
      }
    }
  };

  const activeProcessingFile = files.find(f => f.status === 'processing' || f.status === 'uploading');
  const pipelineStep = activeProcessingFile ? (
    activeProcessingFile.status === 'uploading' ? 1 :
    activeProcessingFile.message.includes('Converting') ? 2 :
    activeProcessingFile.message.includes('Generating') || activeProcessingFile.message.includes('Embedded') ? 3 : 4
  ) : (files.some(f => f.status === 'completed') ? 4 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dataset Ingestion & Vector Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">Upload catalog datasets to extract entities, generate embeddings, and sync ChromaDB vectors.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetQueue}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <RefreshCw size={13} />
            <span>Reset Stuck Queue</span>
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-red-600 text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Trash2 size={13} />
            <span>Purge All Vectors</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {files.some(f => f.status === 'completed') && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span>Knowledge base updated. All ingested books & floor maps are now searchable via AI Voice & Chat!</span>
          </div>
          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">RAG Live</span>
        </div>
      )}

      {/* Grid: Left Upload Zone & Queue | Right Pipeline Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Dropzone & Queue */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Drag & Drop Zone */}
          <div 
            className={`bg-white border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
            } shadow-sm`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UploadCloud size={30} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Drag & Drop Catalog Files Here</h3>
            <p className="text-xs text-slate-500 mb-5">Supports Excel (.xlsx, .xls), CSV, JSON, PDF, and DOCX files</p>
            
            <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all">
              <FileText size={15} />
              <span>Browse Local Files</span>
              <input type="file" className="hidden" multiple onChange={handleFileInput} accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.docx" />
            </label>
          </div>

          {/* Upload Queue Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Dataset Queue ({files.length})</h3>
              </div>
              <button 
                onClick={startUpload}
                disabled={uploading || !files.some(f => f.status === 'pending' && f.file)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                {uploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing Ingestion...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Start Vector Ingestion</span>
                  </>
                )}
              </button>
            </div>

            {files.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No files uploaded yet. Drag files into the box above to ingest them into the vector database.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <li key={file.id} className="p-4 sm:px-6 flex items-center gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <FileType size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{file.filename}</p>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">{file.size}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            file.status === 'completed' 
                              ? 'bg-emerald-500' 
                              : file.status === 'failed' 
                                ? 'bg-red-500' 
                                : 'bg-blue-600'
                          }`}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-medium ${
                          file.status === 'completed' 
                            ? 'text-emerald-600' 
                            : file.status === 'failed' 
                              ? 'text-red-600' 
                              : 'text-slate-500'
                        }`}>
                          {file.message || file.status}
                        </span>
                        
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-slate-400 hover:text-red-600 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* Right Column: Live Pipeline Tracking Stepper */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Database size={15} className="text-blue-600" />
              <span>Live Pipeline Tracking</span>
            </h3>

            <div className="space-y-5">
              
              {/* Step 1: Upload */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  pipelineStep >= 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-400'
                }`}>
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Upload & Save</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Files safely cached and validated on server</p>
                </div>
              </div>

              {/* Step 2: Parse */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  pipelineStep >= 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 text-slate-400'
                }`}>
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">JSON Normalization</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Extraction into structured book records & rack IDs</p>
                </div>
              </div>

              {/* Step 3: Embed */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  pipelineStep >= 3 ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'bg-slate-100 text-slate-400'
                }`}>
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Embedding Vector Gen</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Dense semantic vectors created for RAG search</p>
                </div>
              </div>

              {/* Step 4: ChromaDB Index */}
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  pipelineStep >= 4 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'
                }`}>
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Index & Sync</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Vectors pushed to ChromaDB & BM25 hybrid index</p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Help Card */}
          <div className="bg-blue-50/80 rounded-3xl border border-blue-100 p-5 text-xs text-blue-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>Catalog Ingestion Tips</span>
            </h4>
            <p className="text-blue-700/90 leading-relaxed">
              For best 3D Wayfinder accuracy, ensure your catalog file includes columns for <strong>Title</strong>, <strong>Author</strong>, <strong>Rack / Shelf Code</strong>, and <strong>Floor</strong>.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Upload;
