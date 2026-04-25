import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileSpreadsheet,
  FileCode,
  Copy,
  X,
  Maximize2,
  Train,
  ExternalLink
} from 'lucide-react';
import { cn } from './lib/utils';
import { MetroData } from './types';
import { extractMetroDataFromImage } from './services/geminiService';
import { exportToCSV, exportToExcel } from './services/exportService';

const PAGE_SIZE = 10;

export default function App() {
  const [images, setImages] = useState<{ 
    id: string; 
    file: File; 
    preview: string; 
    status: 'idle' | 'processing' | 'success' | 'error'; 
    results?: MetroData[];
    error?: string;
  }[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files as FileList).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        status: 'idle' as const
      }));
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx === currentImageIndex && idx > 0) {
        setCurrentImageIndex(idx - 1);
      }
      const target = prev.find(img => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const processImage = async (id: string) => {
    const target = images.find(img => img.id === id);
    if (!target || target.status === 'processing') return;

    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing' } : img));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(target.file);
      });
      const base64 = await base64Promise;
      
      const results = await extractMetroDataFromImage(base64, target.file.type);
      
      setImages(prev => prev.map(img => img.id === id ? { 
        ...img, 
        status: 'success', 
        results 
      } : img));
    } catch (error: any) {
      console.error(error);
      setImages(prev => prev.map(img => img.id === id ? { 
        ...img, 
        status: 'error',
        error: error?.message || '识别失败，请检查网络或图片重试'
      } : img));
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    const idleImages = images.filter(img => img.status === 'idle' || img.status === 'error');
    for (const img of idleImages) {
      await processImage(img.id);
    }
    setIsProcessingAll(false);
  };

  const allResults = useMemo(() => images.flatMap(img => img.results || []), [images]);
  const displayImages = useMemo(() => images.filter(i => i.status === 'success' || i.status === 'error'), [images]);
  
  const progressPercent = useMemo(() => {
    if (images.length === 0) return 0;
    return (images.filter(i => i.status === 'success' || i.status === 'error').length / images.length) * 100;
  }, [images]);

  const currentImage = displayImages[currentImageIndex];
  const currentImageResults = currentImage?.results || [];
  const currentImageError = currentImage?.status === 'error' ? currentImage.error : null;

  const copyToClipboard = () => {
    if (currentImageResults.length === 0) return;
    const body = currentImageResults.map(r => `${r.date}\t${r.city}\t${r.passenger_volume}`).join('\n');
    navigator.clipboard.writeText(body).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#E9EDF2] text-[#141414] font-sans selection:bg-[#141414] selection:text-white">
      {/* Header */}
      <header className="pt-16 pb-12 flex flex-col items-center justify-center text-center">
        <h1 className="font-sans font-bold text-5xl tracking-tight mb-4">地铁客流量数据更新小助手</h1>
        <p className="font-sans text-xl opacity-60 mb-8 font-medium">支持批量上传图片，AI将自动识别并提取数据</p>
        
        <a 
          href="https://weibo.com/1005052728041997?profile_ftype=1&is_all=1&is_search=1&key_word=%23%E5%9C%B0%E9%93%81%E5%AE%A2%E6%B5%81%E6%8E%92%E8%A1%8C%E6%A6%9C"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-sans font-bold hover:bg-blue-700 transition-all shadow-sm"
        >
          打开数据源
        </a>
      </header>

      <main className="max-w-[1700px] mx-auto px-12 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column */}
        <div className="space-y-12 lg:sticky lg:top-8">
          {/* Upload Section */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-2xl">上传图片</h3>
              {images.length > 0 && (
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                  <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                    <span className={cn(images.every(i => i.status === 'success') ? "text-green-600" : "text-blue-600")}>
                      进度: {images.filter(i => i.status === 'success' || i.status === 'error').length} / {images.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className={cn(
                        "h-full transition-all duration-500",
                        progressPercent === 100 ? "bg-green-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div 
                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#141414] transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <p className="text-base font-bold">点击或拖拽图片到此处</p>
                <p className="text-xs opacity-40 mt-1 uppercase font-bold tracking-wider">支持批量处理</p>
                <input type="file" className="hidden" ref={fileInputRef} multiple accept="image/*" onChange={onFileChange} />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  <AnimatePresence>
                    {images.map((img) => (
                      <motion.div 
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative group overflow-hidden"
                      >
                        <div 
                          className="aspect-video rounded-lg overflow-hidden mb-2 cursor-zoom-in relative grayscale group-hover:grayscale-0 transition-all"
                          onClick={() => setSelectedImage(img.preview)}
                        >
                          <img src={img.preview} className="object-cover w-full h-full" alt="预览" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="text-white" size={20} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <p className="text-[10px] font-bold truncate opacity-60 flex-1">{img.file.name}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {img.status === 'processing' && <Loader2 className="animate-spin text-blue-500" size={12} />}
                            {img.status === 'success' && <CheckCircle2 className="text-green-500" size={12} />}
                            {img.status === 'error' && <AlertCircle className="text-red-500" size={12} />}
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                              className="p-1 hover:bg-red-50 text-red-400 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                      </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <button 
                onClick={processAll}
                disabled={isProcessingAll || images.length === 0 || images.every(img => img.status === 'success')}
                className="w-full py-4 bg-[#28A745] text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {isProcessingAll ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                开始识别
              </button>
            </div>
          </section>

          {/* Recognition Results */}
          <section className="bg-white rounded-3xl shadow-sm border border-white flex flex-col overflow-hidden h-[600px]">
            <div className="p-8 pb-4 bg-white space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-2xl">识别结果</h3>
                <div className="flex gap-3">
                  <button 
                    disabled={allResults.length === 0}
                    onClick={() => exportToCSV(allResults)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-30"
                  >
                    <FileCode size={16} />导出 CSV
                  </button>
                  <button 
                    disabled={allResults.length === 0}
                    onClick={() => exportToExcel(allResults)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-30"
                  >
                    <FileSpreadsheet size={16} />导出 Excel
                  </button>
                  <button 
                    disabled={currentImageResults.length === 0}
                    onClick={copyToClipboard}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 bg-[#4F5560] text-white rounded-xl font-bold text-sm shadow hover:opacity-90 active:scale-95 transition-all disabled:opacity-30",
                      copySuccess && "bg-green-600"
                    )}
                  >
                    {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copySuccess ? '已复制' : '复制数据'}
                  </button>
                </div>
              </div>

              {displayImages.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                  <button 
                    disabled={currentImageIndex === 0}
                    onClick={() => setCurrentImageIndex(prev => prev - 1)}
                    className="px-4 py-1.5 bg-white text-[#141414] text-sm rounded-lg font-bold hover:shadow-sm border border-gray-100 transition-all disabled:opacity-20"
                  >
                    上一张
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-sm">图片 {currentImageIndex + 1} / {displayImages.length}</p>
                    <p className="text-[10px] font-mono opacity-40 truncate max-w-[150px]">
                      {displayImages[currentImageIndex]?.file.name}
                    </p>
                  </div>
                  <button 
                    disabled={currentImageIndex === displayImages.length - 1}
                    onClick={() => setCurrentImageIndex(prev => prev + 1)}
                    className="px-4 py-1.5 bg-white text-[#141414] text-sm rounded-lg font-bold hover:shadow-sm border border-gray-100 transition-all disabled:opacity-20"
                  >
                    下一张
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto bg-white custom-scrollbar px-8 pb-8">
              {currentImageError ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-red-500 bg-red-50/30 rounded-2xl border border-red-100/50">
                  <AlertCircle size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-bold mb-2">识别出现问题</p>
                  <p className="text-sm opacity-80 break-all">{currentImageError}</p>
                </div>
              ) : currentImageResults.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead className="bg-[#F8F9FA] sticky top-0 z-10">
                    <tr>
                      <th className="font-bold text-left px-6 py-4 border-b border-gray-100">日期</th>
                      <th className="font-bold text-left px-6 py-4 border-b border-gray-100">城市</th>
                      <th className="font-bold text-left px-6 py-4 border-b border-gray-100">客运量(万人)</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    {currentImageResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 border-b border-gray-50 text-sm whitespace-nowrap">{row.date}</td>
                        <td className="px-6 py-4 border-b border-gray-50 text-sm">{row.city}</td>
                        <td className="px-6 py-4 border-b border-gray-50 text-sm tabular-nums">{row.passenger_volume.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-10">
                  <TableIcon size={80} />
                  <p className="text-xl font-bold mt-4">等待解析数据...</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Original Dashboard */}
        <div className="h-full">
          <section className="bg-white rounded-3xl shadow-sm border border-white h-[1050px] flex flex-col overflow-hidden relative">
            <div className="h-20 bg-white border-b border-gray-50 flex items-center justify-between px-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6A00] rounded-xl flex items-center justify-center text-white">
                  <Train size={24} />
                </div>
                <h3 className="font-bold text-2xl">地铁数据文档</h3>
              </div>
              <a 
                href="https://nankai.feishu.cn/base/QIpxbhjZmaXzbqsdFnQcfTkonef?table=tblwZG5Sct3tDPoZ&view=vewGCV15Pu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
              >
                在新窗口中打开 <Maximize2 size={16} />
              </a>
            </div>
            
            <div className="flex-1 w-full relative bg-gray-50">
              <iframe 
                src="https://nankai.feishu.cn/base/QIpxbhjZmaXzbqsdFnQcfTkonef?table=tblwZG5Sct3tDPoZ&view=vewGCV15Pu" 
                className="w-full h-full border-none shadow-inner"
                title="Metro Data"
              />
            </div>
          </section>
        </div>
      </main>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#141414]/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-2 border-white" alt="放大图" referrerPolicy="no-referrer" />
              <button 
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-[#141414] rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-all border border-[#141414]"
                onClick={() => setSelectedImage(null)}
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}} />
    </div>
  );
}
