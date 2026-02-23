/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Loader2, Image as ImageIcon, Layout, Palette, Target, Briefcase, Type as TypeIcon, Sparkles, CheckCircle2, ChevronRight, Upload, Wand2, X } from 'lucide-react';
import { researchCompany, generateLayoutIdeas, generateImage, editImage } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'idle' | 'researching' | 'ideating' | 'generating' | 'done' | 'error';

const steps = [
  { id: 'researching', label: 'Researching Brand' },
  { id: 'ideating', label: 'Generating Layouts' },
  { id: 'generating', label: 'Creating Images' },
];

export default function App() {
  const [companyName, setCompanyName] = useState('');
  const [photoSize, setPhotoSize] = useState('1440x700');
  const [eventTitle, setEventTitle] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [brandData, setBrandData] = useState<any>(null);
  const [images, setImages] = useState<{url: string, title: string, description: string, index: number}[]>([]);
  const [imagesGeneratedCount, setImagesGeneratedCount] = useState(0);

  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async (index: number, url: string) => {
    if (!editPrompt.trim()) return;
    setIsEditingLoading(true);
    try {
      const match = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format");
      const mimeType = match[1];
      const base64Data = match[2];

      const newUrl = await editImage(base64Data, mimeType, editPrompt);
      
      setImages(prev => prev.map((img, i) => i === index ? { ...img, url: newUrl } : img));
      setEditingImageIndex(null);
      setEditPrompt('');
    } catch (err) {
      console.error(err);
      alert("Failed to edit image. Please try again.");
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setStep('researching');
    setError(null);
    setBrandData(null);
    setImages([]);
    setImagesGeneratedCount(0);

    try {
      // 1. Research
      const brand = await researchCompany(companyName);
      setBrandData(brand);
      
      // 2. Ideate
      setStep('ideating');
      const ideas = await generateLayoutIdeas(brand);

      // 3. Generate Images
      setStep('generating');
      
      for (let i = 0; i < ideas.length; i++) {
        const idea = ideas[i];
        try {
          const url = await generateImage(idea.description, brand, photoSize, !!logoImage, eventTitle);
          const newImg = { url, title: idea.title, description: idea.description, index: i };
          
          setImages(prev => {
            const next = [...prev, newImg];
            return next.sort((a, b) => a.index - b.index);
          });
        } catch (imgErr) {
          console.error("Failed to generate image", imgErr);
        } finally {
          setImagesGeneratedCount(prev => prev + 1);
        }
        
        // Add a small delay between requests to help with rate limits
        if (i < ideas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setStep('done');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white bg-[#fafafa] text-[#171717]">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>EventFrame AI</span>
          </div>
          
          {step !== 'idle' && (
            <form onSubmit={handleGenerate} className="flex items-center gap-2 relative max-w-3xl w-full ml-8">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name..."
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-100 border-transparent focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 rounded-full text-sm transition-all outline-none"
                  disabled={step !== 'done' && step !== 'error'}
                />
              </div>
              <div className="relative w-full max-w-[140px]">
                <Layout className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={photoSize}
                  onChange={(e) => setPhotoSize(e.target.value)}
                  placeholder="Size"
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-100 border-transparent focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 rounded-full text-sm transition-all outline-none"
                  disabled={step !== 'done' && step !== 'error'}
                />
              </div>
              <div className="relative w-full max-w-[180px]">
                <TypeIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event Title"
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-100 border-transparent focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 rounded-full text-sm transition-all outline-none"
                  disabled={step !== 'done' && step !== 'error'}
                />
              </div>
              <div className="relative w-full max-w-[140px]">
                <Upload className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full pl-9 pr-4 py-1 bg-neutral-100 border-transparent focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 rounded-full text-xs transition-all outline-none file:hidden text-neutral-500"
                  disabled={step !== 'done' && step !== 'error'}
                />
              </div>
              <button type="submit" className="hidden">Generate</button>
            </form>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'idle' ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                AI-Powered Brand Analysis
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-neutral-900 mb-6 max-w-3xl">
                Generate branded event frames in seconds.
              </h1>
              <p className="text-lg text-neutral-500 mb-10 max-w-2xl">
                Enter a company name. Our AI agents will research their brand identity, propose 3 unique layout concepts, and generate ready-to-use event frames.
              </p>
              
              <form onSubmit={handleGenerate} className="w-full max-w-xl relative flex flex-col gap-4 items-center">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Stripe, Airbnb, Spotify..."
                    className="block w-full pl-11 pr-4 py-4 text-lg bg-white border border-neutral-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Layout className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={photoSize}
                    onChange={(e) => setPhotoSize(e.target.value)}
                    placeholder="Photo Size (e.g. 1440x700)"
                    className="block w-full pl-11 pr-4 py-4 text-lg bg-white border border-neutral-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <TypeIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Event Title (Optional)"
                    className="block w-full pl-11 pr-4 py-4 text-lg bg-white border border-neutral-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Upload className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full pl-11 pr-32 py-3.5 text-sm bg-white border border-neutral-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 px-6 bg-black text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Progress Pipeline */}
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-neutral-100">
                  <motion.div 
                    className="h-full bg-indigo-600"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: step === 'researching' ? '33%' : 
                             step === 'ideating' ? '66%' : 
                             step === 'generating' ? '90%' : 
                             step === 'done' ? '100%' : '0%' 
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                
                <div className="flex items-center w-full justify-between relative z-10">
                  {steps.map((s, i) => {
                    const isActive = step === s.id;
                    const isPast = steps.findIndex(x => x.id === step) > i || step === 'done';
                    
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isPast ? 'bg-indigo-600 text-white' : 
                          isActive ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' : 
                          'bg-neutral-100 text-neutral-400'
                        }`}>
                          {isPast ? <CheckCircle2 className="w-5 h-5" /> : 
                           isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                           <span>{i + 1}</span>}
                        </div>
                        <span className={`font-medium ${isActive || isPast ? 'text-neutral-900' : 'text-neutral-400'}`}>
                          {s.label}
                          {s.id === 'generating' && (isActive || isPast) && ` (${imagesGeneratedCount}/3)`}
                        </span>
                        {i < steps.length - 1 && (
                          <ChevronRight className="w-5 h-5 text-neutral-300 ml-4 hidden md:block" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Brand Analysis */}
              {brandData && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-neutral-400" />
                    Brand Analysis: {companyName}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Industry
                      </div>
                      <div className="font-medium text-lg">{brandData.industry}</div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Target Audience
                      </div>
                      <div className="font-medium text-lg">{brandData.targetAudience}</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Brand Colors
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brandData.colors.map((color: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                            <div className="w-4 h-4 rounded-full border border-neutral-200" style={{ backgroundColor: color }}></div>
                            <span className="text-sm font-mono">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Personality
                      </div>
                      <div className="font-medium">{brandData.personality}</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <Layout className="w-4 h-4" /> Design Style
                      </div>
                      <div className="font-medium">{brandData.designStyle}</div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                      <div className="text-neutral-500 text-sm font-medium mb-1 flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" /> Typography
                      </div>
                      <div className="font-medium">{brandData.typography}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Generated Images */}
              {images.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-neutral-400" />
                    Generated Event Frames
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-12">
                    {images.map((img, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-3xl overflow-hidden border border-neutral-200 shadow-sm"
                      >
                        <div className="p-6 md:p-8 border-b border-neutral-100 bg-neutral-50/50">
                          <h3 className="text-xl font-semibold mb-2">Concept {i + 1}: {img.title}</h3>
                          <p className="text-neutral-600">{img.description}</p>
                        </div>
                        <div className="p-6 md:p-8 bg-neutral-100 flex flex-col items-center justify-center gap-6">
                          <div className="relative inline-block w-full max-w-5xl">
                            <img 
                              src={img.url} 
                              alt={img.title} 
                              className="w-full rounded-xl shadow-md"
                            />
                            {logoImage && (
                              <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 w-48 md:w-64 h-auto flex items-center justify-center pointer-events-none">
                                <img src={logoImage} alt="Uploaded Logo" className="max-w-full max-h-24 object-contain drop-shadow-md" />
                              </div>
                            )}
                            {eventTitle && (
                              <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none px-8">
                                <h2 className="text-2xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wide uppercase" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                  {eventTitle}
                                </h2>
                              </div>
                            )}
                          </div>

                          {/* Edit Controls */}
                          <div className="w-full max-w-5xl bg-white rounded-2xl p-4 shadow-sm border border-neutral-200">
                            {editingImageIndex === i ? (
                              <div className="flex items-center gap-3">
                                <input
                                  type="text"
                                  value={editPrompt}
                                  onChange={(e) => setEditPrompt(e.target.value)}
                                  placeholder="e.g., Add a retro filter, make it neon, remove the background..."
                                  className="flex-1 px-4 py-2 bg-neutral-100 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition-all outline-none"
                                  disabled={isEditingLoading}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditImage(i, img.url);
                                  }}
                                />
                                <button
                                  onClick={() => handleEditImage(i, img.url)}
                                  disabled={isEditingLoading || !editPrompt.trim()}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  {isEditingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                  {isEditingLoading ? 'Editing...' : 'Apply'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingImageIndex(null);
                                    setEditPrompt('');
                                  }}
                                  disabled={isEditingLoading}
                                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingImageIndex(i)}
                                className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-indigo-600 transition-colors px-2 py-1"
                              >
                                <Wand2 className="w-4 h-4" />
                                Edit with AI
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
