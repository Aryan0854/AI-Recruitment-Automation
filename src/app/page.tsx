'use client';

import { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  Sparkles,
  Play
} from 'lucide-react';

const API_ENDPOINT = '/api/upload-process';

export default function Home() {
  // File States
  const [jdFiles, setJdFiles] = useState<File[]>([]);
  const [excelTemplate, setExcelTemplate] = useState<File | null>(null);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Export Outputs
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Drag and drop handlers for JDs
  const handleJdDrag = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleJdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(f => 
        f.name.endsWith('.docx') || f.name.endsWith('.pdf')
      );
      setJdFiles(prev => [...prev, ...files]);
      resetStatus();
    }
  };

  const handleJdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => 
        f.name.endsWith('.docx') || f.name.endsWith('.pdf')
      );
      setJdFiles(prev => [...prev, ...files]);
      resetStatus();
    }
  };

  const removeJdFile = (idx: number) => {
    setJdFiles(prev => prev.filter((_, i) => i !== idx));
    resetStatus();
  };

  // Excel template handler
  const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx')) {
        setExcelTemplate(file);
        resetStatus();
      } else {
        alert('Please upload a valid Excel spreadsheet template (.xlsx)');
      }
    }
  };

  const resetStatus = () => {
    setDownloadUrl(null);
    setErrorMessage(null);
    setProgressText('');
  };

  // Submit and process JDs + Excel
  const generateUpdatedExcel = async () => {
    if (jdFiles.length === 0) {
      setErrorMessage('Please upload at least one Job Description (.docx or .pdf) file.');
      return;
    }
    if (!excelTemplate) {
      setErrorMessage('Please upload one Excel template (.xlsx) file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setDownloadUrl(null);
    setProgressText('Extracting JD text and running AI NLP models...');

    const formData = new FormData();
    // Append JDs with the name 'jds' expected by FastAPI
    jdFiles.forEach(file => {
      formData.append('jds', file);
    });
    // Append Template Excel with the name 'template'
    formData.append('template', excelTemplate);

    try {
      // Small timeout simulate for smooth UI transition
      setTimeout(() => {
        setProgressText('Mapping fields and cloning cell-level borders/styles...');
      }, 2000);

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Spreadsheet processing failed.');
      }

      // Read response as binary blob attachment
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      const outName = `updated_${excelTemplate.name}`;
      setDownloadUrl(url);
      setOutputFilename(outName);
      
      setProgressText('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'FastAPI parser server connection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Visual background ambient details */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 space-y-8">
        
        {/* Title */}
        <header className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl items-center justify-center shadow-lg shadow-violet-500/10 mb-2">
            <Sparkles className="h-6 w-6 text-slate-100" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            JD to Excel Mapper
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            AI-Powered Recruitment Automation & Style-Preserving Excel Appender
          </p>
        </header>

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Execution Error:</span> {errorMessage}
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* SECTION 1: UPLOAD JOB DESCRIPTIONS */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="h-4 w-1 bg-violet-500 rounded-full" />
            Upload Job Descriptions
          </h2>
          
          {/* Dropzone */}
          <div 
            onDragOver={handleJdDrag}
            onDrop={handleJdDrop}
            className="border-2 border-dashed border-slate-800 hover:border-violet-500/60 bg-slate-950/40 hover:bg-slate-900/10 rounded-2xl p-6 text-center cursor-pointer transition duration-300 relative group"
          >
            <input 
              type="file" 
              id="jd-selector" 
              multiple 
              accept=".docx,.pdf" 
              className="hidden" 
              onChange={handleJdSelect}
            />
            <label htmlFor="jd-selector" className="cursor-pointer block space-y-3">
              <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-violet-400 mx-auto transition" />
              <div>
                <span className="text-xs font-bold text-slate-300 block">Drag & Drop JDs or click to select</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Accepts Word (.docx) and PDF (.pdf) files</span>
              </div>
            </label>
          </div>

          {/* JD files listing */}
          {jdFiles.length > 0 && (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {jdFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/80 border border-slate-900/60 px-3.5 py-2.5 rounded-xl">
                  <div className="flex items-center gap-2 truncate text-slate-300 font-medium">
                    <FileText className="h-4 w-4 text-violet-400 shrink-0" />
                    <span className="truncate max-w-[400px]">{file.name}</span>
                    <span className="text-[10px] text-slate-600 font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button 
                    onClick={() => removeJdFile(idx)} 
                    className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: UPLOAD EXCEL TEMPLATE */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="h-4 w-1 bg-violet-500 rounded-full" />
            Upload Excel Template
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input 
                type="file" 
                id="excel-selector" 
                accept=".xlsx" 
                className="hidden" 
                onChange={handleExcelSelect}
              />
              <label 
                htmlFor="excel-selector"
                className="flex items-center gap-3 border border-slate-800 bg-slate-950/40 hover:bg-slate-900/10 px-4 py-4.5 rounded-2xl cursor-pointer text-xs font-medium text-slate-300 hover:border-emerald-500/40 transition group"
              >
                <div className="h-9 w-9 bg-slate-900 border border-slate-800 group-hover:border-emerald-500/20 group-hover:bg-emerald-600/10 rounded-xl flex items-center justify-center transition">
                  <FileSpreadsheet className={`h-4.5 w-4.5 ${excelTemplate ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div>
                  <span className="block font-bold">
                    {excelTemplate ? 'Replace Excel Template' : 'Choose Excel Template File'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {excelTemplate ? excelTemplate.name : 'Select demand sheet e.g. BR_RawData 3.xlsx'}
                  </span>
                </div>
              </label>
            </div>

            {/* Quick cache state indicators */}
            <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-4.5 flex flex-col justify-center text-xs space-y-1">
              <span className="text-slate-500 font-semibold block uppercase text-[9px] tracking-wider">Template Status</span>
              <span className={`font-bold ${excelTemplate ? 'text-emerald-400' : 'text-amber-500'}`}>
                {excelTemplate ? 'Ready to Append' : 'Missing File'}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: GENERATE & DOWNLOAD */}
        <section className="pt-6 border-t border-slate-900/80 space-y-4">
          
          {!downloadUrl ? (
            <button 
              onClick={generateUpdatedExcel}
              disabled={isProcessing || jdFiles.length === 0 || !excelTemplate}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-100 disabled:text-slate-500 font-bold py-4 rounded-2xl text-sm transition-all duration-300 shadow-lg shadow-violet-500/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  Generating spreadsheet...
                </>
              ) : (
                <>
                  <Play className="h-4.5 w-4.5" />
                  Generate Updated Excel
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {/* Success notification banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4.5 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-black block text-slate-200">Generation Complete!</span>
                  <span>Extracted JD data rows have been mapped and successfully appended into the Excel template. styles, formatting, hidden sheets and borders have been fully preserved.</span>
                </div>
              </div>

              {/* Download Action button */}
              <div className="flex flex-col md:flex-row gap-3">
                <a 
                  href={downloadUrl}
                  download={outputFilename}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-100 font-bold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="h-4.5 w-4.5" />
                  Download Updated Excel
                </a>

                <button 
                  onClick={resetStatus}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-6 py-4 rounded-2xl text-xs active:scale-95 cursor-pointer"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* Loading Progress Text indicator */}
          {isProcessing && progressText && (
            <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 animate-pulse font-medium">
              <span>{progressText}</span>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
