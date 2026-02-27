/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Sparkles, Heart, RefreshCcw, ArrowRight, MessageCircle, User, Instagram, Search, Star, Palette, Maximize, X, Trophy, CheckCircle2, Send } from 'lucide-react';
import { getMoaSelectFeedback, chatWithBoss, type FeedbackResponse } from './services/gemini';
import { BossCharacter } from './components/BossCharacter';
import { cn } from './lib/utils';

const PURPOSES = [
  { id: 'profile', label: '카톡/SNS 프로필', icon: <User className="w-4 h-4" /> },
  { id: 'instagram', label: '인스타 업로드', icon: <Instagram className="w-4 h-4" /> },
  { id: 'dating', label: '소개팅 사진', icon: <Heart className="w-4 h-4" /> },
  { id: 'actor', label: '배우/모델 지망', icon: <Camera className="w-4 h-4" /> },
  { id: 'creator', label: '크리에이터', icon: <Sparkles className="w-4 h-4" /> },
];

const MAX_IMAGES = 3;

const SURVEY_QUESTIONS = [
  { id: 1, question: "오늘 피플이의 기분은 어때? ☀️", options: ["완전 신나!", "차분하고 평온해", "조금 센치해", "에너지가 필요해"] },
  { id: 2, question: "어떤 분위기의 사진을 남기고 싶어? ✨", options: ["힙하고 쿨한 느낌", "따뜻하고 부드러운 느낌", "자연스러운 일상", "강렬한 카리스마"] },
  { id: 3, question: "이 사진, 누구에게 가장 보여주고 싶어? 👥", options: ["나 자신에게", "좋아하는 사람에게", "불특정 다수(SNS)", "미래의 나에게"] },
  { id: 4, question: "사진을 찍을 때 가장 중요하게 생각하는 건? 📸", options: ["자연스러운 표정", "완벽한 구도", "독보적인 분위기", "선명한 색감"] },
  { id: 5, question: "지금 네 마음의 온도는 몇 도쯤 될까? 🌡️", options: ["뜨거운 100도!", "따뜻한 36.5도", "시원한 10도", "차가운 0도"] },
];

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

type AppStep = 'home' | 'chat_intro' | 'survey' | 'ready_to_upload' | 'main';

export default function App() {
  const [step, setStep] = useState<AppStep>('home');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState(PURPOSES[0].id);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState({ rating: 0, message: '' });
  const [evaluationSubmitted, setEvaluationSubmitted] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const [isBossSpeaking, setIsBossSpeaking] = useState(false);
  
  const ADMIN_EMAIL = "bosung09405@gmail.com";
  const userEmail = "bosung09405@gmail.com"; // In a real app, this would come from auth
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const startFlow = () => setStep('chat_intro');

  const handleSurveyAnswer = (answer: string) => {
    const newAnswers = [...surveyAnswers, answer];
    setSurveyAnswers(newAnswers);
    
    if (surveyIndex < SURVEY_QUESTIONS.length - 1) {
      setSurveyIndex(surveyIndex + 1);
    } else {
      setStep('ready_to_upload');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, MAX_IMAGES));
        setFeedback(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setFeedback(null);
  };

  const analyzeImages = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const selectedPurposeLabel = PURPOSES.find(p => p.id === purpose)?.label || purpose;
      // Pass survey context to Gemini
      const surveyContext = SURVEY_QUESTIONS.map((q, i) => `${q.question}: ${surveyAnswers[i]}`).join('\n');
      const result = await getMoaSelectFeedback(images, `${selectedPurposeLabel} (사용자 상태: ${surveyContext})`);
      setFeedback(result);
      setSelectedIndex(result.bestShotIndex);
      
      setChatHistory(prev => [
        ...prev,
        { role: 'model', text: `피플아, 네 마음 상태까지 고려해서 분석해봤어! "${result.message}"` }
      ]);
    } catch (err) {
      console.error(err);
      setError("보스가 사진들을 보다가 잠깐 회의 들어갔나 봐... 다시 시도해줄래?");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() && !chatImage) return;
    
    const newMessage: ChatMessage = { 
      role: 'user', 
      text: userInput || (chatImage ? "이 사진 어때 보스?" : ""),
      image: chatImage || undefined
    };
    setChatHistory(prev => [...prev, newMessage]);
    const currentInput = userInput;
    const currentImage = chatImage;
    setUserInput('');
    setChatImage(null);
    setLoading(true);

    try {
      const history = chatHistory.map(msg => ({
        role: msg.role,
        parts: [
          ...(msg.text ? [{ text: msg.text }] : []),
          ...(msg.image ? [{ 
            inlineData: { 
              mimeType: "image/jpeg", 
              data: msg.image.split(",")[1] 
            } 
          }] : [])
        ]
      }));
      const response = await chatWithBoss(newMessage.text, currentImage || undefined, history as any);
      setChatHistory(prev => [...prev, { role: 'model', text: response || '' }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', text: "미안 피플아, 보스가 지금 잠깐 자리를 비웠어!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const reset = () => {
    setImages([]);
    setFeedback(null);
    setError(null);
    setSelectedIndex(null);
    setChatHistory([]);
    setStep('home');
    setSurveyIndex(0);
    setSurveyAnswers([]);
    setEvaluation({ rating: 0, message: '' });
    setEvaluationSubmitted(false);
  };

  const submitEvaluation = async () => {
    if (evaluation.rating === 0) return;
    try {
      await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...evaluation, userEmail }),
      });
      setEvaluationSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await fetch('/api/evaluations');
      const data = await res.json();
      setAllEvaluations(data);
      setShowAdmin(true);
    } catch (err) {
      console.error(err);
    }
  };

  const currentFeedback = feedback && selectedIndex !== null ? feedback.individualFeedback[selectedIndex] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 flex flex-col items-center"
      >
        <div className="w-64 md:w-80 mb-6">
          <img 
            src="https://raw.githubusercontent.com/google-gemini/aistudio-applet-templates/main/assets/moa_people_logo.png" 
            alt="MOA PEOPLE" 
            referrerPolicy="no-referrer"
            className="w-full h-auto drop-shadow-sm"
            onError={(e) => {
              e.currentTarget.src = "https://picsum.photos/seed/moapeople/400/200?blur=10";
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold tracking-tighter text-stone-900">MOA PEOPLE</span>
            <span className="text-xl md:text-2xl font-cute font-bold text-stone-600">모아피플</span>
          </div>
        </div>
        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-stone-900 text-white rounded-full mb-4 border border-stone-800">
          <span className="font-cute text-lg font-bold">🕶️ 보스셀렉</span>
        </div>
      </motion.header>

      <main className="w-full flex-1 flex flex-col items-center gap-8">
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center gap-8"
            >
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, -2, 2, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <BossCharacter className="w-48 h-48 drop-shadow-xl" isSpeaking={false} />
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-3xl font-cute font-bold">안녕 피플아, 보스야.</h2>
                <p className="text-stone-500 text-xl font-cute">오늘 네 마음을 정리해줄 준비가 됐어.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startFlow}
                className="px-12 py-5 bg-stone-900 text-white rounded-full font-cute text-2xl shadow-2xl shadow-stone-900/20"
              >
                보스와 대화 시작하기
              </motion.button>
            </motion.div>
          )}

          {step === 'chat_intro' && (
            <motion.div
              key="chat_intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8 w-full max-w-2xl"
            >
              <div className="flex items-start gap-6 w-full">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, -2, 2, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  <BossCharacter className="w-32 h-32 drop-shadow-md" isSpeaking={isBossSpeaking} />
                </motion.div>
                <div className="bg-white p-5 md:p-8 rounded-[30px] rounded-tl-none shadow-sm border border-stone-100 flex-1 relative">
                  <div className="absolute top-0 -left-2 w-4 h-4 bg-white border-l border-t border-stone-100 -rotate-45" />
                  <p className="font-cute text-xl md:text-2xl text-stone-800 leading-relaxed italic">
                    <TypewriterText 
                      text="반가워 피플아! 사진을 고르기 전에 네 마음을 먼저 들여다보고 싶어. 몇 가지 질문을 해도 될까?" 
                      onTypingStart={() => setIsBossSpeaking(true)}
                      onTypingEnd={() => setIsBossSpeaking(false)}
                    />
                  </p>
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => setStep('survey')}
                className="px-10 py-4 bg-stone-900 text-white rounded-full font-cute text-xl shadow-lg"
              >
                좋아요, 보스!
              </motion.button>
            </motion.div>
          )}

          {step === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col items-center gap-10 w-full max-w-2xl"
            >
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-stone-900 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((surveyIndex + 1) / SURVEY_QUESTIONS.length) * 100}%` }}
                />
              </div>
              
              <div className="text-center space-y-4 md:space-y-6">
                <span className="text-stone-400 font-bold text-xs md:text-sm uppercase tracking-widest">Question {surveyIndex + 1}</span>
                <h3 className="text-2xl md:text-3xl font-cute font-bold text-stone-900 px-4">{SURVEY_QUESTIONS[surveyIndex].question}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full px-4 md:px-0">
                {SURVEY_QUESTIONS[surveyIndex].options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, backgroundColor: '#1c1917', color: '#fff' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSurveyAnswer(option)}
                    className="p-4 md:p-6 bg-white border-2 border-stone-100 rounded-2xl md:rounded-3xl font-cute text-lg md:text-xl text-stone-700 transition-all shadow-sm"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'ready_to_upload' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8 w-full max-w-2xl"
            >
              <div className="flex items-start gap-6 w-full">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, -2, 2, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  <BossCharacter className="w-32 h-32 drop-shadow-md" isSpeaking={isBossSpeaking} />
                </motion.div>
                <div className="bg-white p-5 md:p-8 rounded-[30px] rounded-tl-none shadow-sm border border-stone-100 flex-1 relative">
                  <div className="absolute top-0 -left-2 w-4 h-4 bg-white border-l border-t border-stone-100 -rotate-45" />
                  <p className="font-cute text-xl md:text-2xl text-stone-800 leading-relaxed italic">
                    <TypewriterText 
                      text="피플이의 마음을 잘 알겠어. 이제 그 마음이 담긴 사진들을 올려볼래? 보스가 최고의 샷을 찾아줄게!" 
                      onTypingStart={() => setIsBossSpeaking(true)}
                      onTypingEnd={() => setIsBossSpeaking(false)}
                    />
                  </p>
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => setStep('main')}
                className="px-12 py-5 bg-stone-900 text-white rounded-full font-cute text-2xl shadow-2xl"
              >
                사진 올리러 가기
              </motion.button>
            </motion.div>
          )}

          {step === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col items-center gap-8"
            >
              {!feedback ? (
                <div className="w-full flex flex-col items-center gap-8">
                  {/* Image Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    {images.map((img, idx) => (
                      <motion.div 
                        key={idx}
                        layoutId={`img-${idx}`}
                        className="relative aspect-square group"
                      >
                        <img 
                          src={img} 
                          alt={`Upload ${idx}`} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-[30px] shadow-md border-4 border-white"
                        />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-lg text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    
                    {images.length < MAX_IMAGES && (
                      <motion.div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square bg-white rounded-[30px] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-stone-900/20 transition-colors group"
                      >
                        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-stone-600" />
                        </div>
                        <p className="text-stone-400 text-sm font-cute">사진 추가 ({images.length}/{MAX_IMAGES})</p>
                      </motion.div>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleFileUpload}
                  />

                  {images.length > 0 && (
                    <div className="w-full max-w-md space-y-6">
                      <div className="space-y-4">
                        <p className="text-center font-cute text-xl text-stone-600">피플아, 어떤 용도로 쓸 사진이야?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {PURPOSES.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setPurpose(p.id)}
                              className={cn(
                                "px-4 py-2 rounded-full font-cute text-lg flex items-center gap-2 transition-all border",
                                purpose === p.id 
                                  ? "bg-stone-900 text-white border-stone-900 shadow-md" 
                                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-900/30"
                              )}
                            >
                              {p.icon} {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={analyzeImages}
                        disabled={loading}
                        className={cn(
                          "w-full py-4 bg-stone-900 text-white rounded-full font-cute text-2xl flex items-center justify-center gap-3 shadow-xl shadow-stone-900/20 disabled:opacity-50 transition-all",
                          loading && "animate-pulse"
                        )}
                      >
                        {loading ? (
                          <>보스가 검토 중이야... <Sparkles className="w-6 h-6 animate-spin" /></>
                        ) : (
                          <>보스의 베스트 샷 추천 받기 <ArrowRight className="w-6 h-6" /></>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-8"
                >
                  {/* Best Shot Selection Header */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4 overflow-x-auto pb-4 max-w-full px-4">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={cn(
                            "relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all",
                            selectedIndex === idx ? "border-stone-900 scale-110 shadow-lg" : "border-white opacity-60 grayscale-[0.5]"
                          )}
                        >
                          <img 
                            src={img} 
                            alt={`Thumb ${idx}`} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                          {feedback.bestShotIndex === idx && (
                            <div className="absolute top-1 right-1 bg-stone-900 p-1 rounded-full shadow-sm">
                              <Trophy className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {selectedIndex === feedback.bestShotIndex && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-stone-900 text-white px-6 py-3 rounded-full flex items-center gap-3"
                      >
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <span className="font-cute text-xl font-bold">보스의 베스트 픽! ✨</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Image & Analysis */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="relative">
                        <img 
                          src={images[selectedIndex || 0]} 
                          alt="Selected" 
                          referrerPolicy="no-referrer"
                          className="w-full aspect-square object-cover rounded-[40px] shadow-2xl border-8 border-white"
                        />
                        {selectedIndex === feedback.bestShotIndex && (
                          <div className="absolute -top-4 -left-4 bg-stone-900 text-white px-4 py-2 rounded-2xl font-cute text-xl shadow-lg flex items-center gap-2">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> BEST
                          </div>
                        )}
                      </div>

                      <div className="bg-stone-900 text-white p-8 rounded-[40px] shadow-xl">
                        <h4 className="font-cute text-2xl mb-6 flex items-center gap-2">
                          <Search className="w-6 h-6 text-stone-400" /> 보스의 상세 분석
                        </h4>
                        {currentFeedback && (
                          <div className="space-y-6">
                            <AnalysisItem label="구도" content={currentFeedback.analysis.composition} icon={<Maximize className="w-4 h-4" />} />
                            <AnalysisItem label="표정" content={currentFeedback.analysis.expression} icon={<Star className="w-4 h-4" />} />
                            <AnalysisItem label="색감" content={currentFeedback.analysis.color} icon={<Palette className="w-4 h-4" />} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Insights & Boss */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                      {/* Boss Character & Speech Bubble with Animation */}
                      <div className="flex items-start gap-4 mb-4">
                        <motion.div
                          animate={{ 
                            y: [0, -10, 0],
                            rotate: [0, -2, 2, 0]
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <BossCharacter className="w-28 h-28 drop-shadow-md flex-shrink-0" isSpeaking={isBossSpeaking} />
                        </motion.div>
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, x: -20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={{ type: "spring", damping: 12 }}
                          className="bg-white p-5 md:p-6 rounded-[30px] rounded-tl-none shadow-sm border border-stone-100 flex-1 relative"
                        >
                          <div className="absolute top-0 -left-2 w-4 h-4 bg-white border-l border-t border-stone-100 -rotate-45" />
                          <p className="font-cute text-xl md:text-2xl text-stone-800 leading-relaxed italic">
                            <TypewriterText 
                              text={`"${feedback.message}"`} 
                              onTypingStart={() => setIsBossSpeaking(true)}
                              onTypingEnd={() => setIsBossSpeaking(false)}
                            />
                          </p>
                        </motion.div>
                      </div>

                      {selectedIndex === feedback.bestShotIndex && (
                        <div className="bg-stone-100 p-6 md:p-8 rounded-[30px] md:rounded-[40px] border border-stone-200">
                          <h4 className="font-cute text-xl md:text-2xl font-bold text-stone-800 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-stone-900" /> 왜 이 사진이 베스트야?
                          </h4>
                          <p className="text-lg md:text-xl text-stone-700 font-cute leading-relaxed italic">
                            "{feedback.bestShotReason}"
                          </p>
                        </div>
                      )}

                      {currentFeedback && (
                        <>
                          <InsightCard 
                            title="이 사진의 매력" 
                            content={currentFeedback.charm} 
                            icon={<Sparkles className="w-6 h-6 text-amber-400" />}
                            color="bg-white"
                            delay={0.1}
                          />
                          <InsightCard 
                            title="조금 아쉬운 점" 
                            content={currentFeedback.disappointing} 
                            icon={<MessageCircle className="w-6 h-6 text-blue-400" />}
                            color="bg-white"
                            delay={0.2}
                          />
                          <InsightCard 
                            title="이럴 때 쓰면 좋아" 
                            content={currentFeedback.usage} 
                            icon={<Heart className="w-6 h-6 text-rose-400" />}
                            color="bg-white"
                            delay={0.3}
                          />
                        </>
                      )}

                      {/* Evaluation Section */}
                      <div className="mt-12 bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm space-y-6">
                        <div className="text-center space-y-2">
                          <h4 className="font-cute text-2xl font-bold text-stone-900">보스셀렉은 어땠어?</h4>
                          <p className="text-stone-500 font-cute text-lg">피플이의 소중한 의견을 들려줘!</p>
                        </div>

                        {!evaluationSubmitted ? (
                          <div className="space-y-6">
                            <div className="flex justify-center gap-4">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setEvaluation(prev => ({ ...prev, rating: star }))}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star 
                                    className={cn(
                                      "w-10 h-10",
                                      evaluation.rating >= star ? "fill-amber-400 text-amber-400" : "text-stone-200"
                                    )} 
                                  />
                                </button>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <label className="font-cute text-lg text-stone-600 ml-2">보스한테 한 마디</label>
                              <textarea
                                value={evaluation.message}
                                onChange={(e) => setEvaluation(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="보스, 이런 점이 좋았어! 혹은 이런 건 고쳐줘!"
                                className="w-full p-4 bg-stone-50 border border-stone-100 rounded-3xl font-cute text-lg focus:outline-none focus:border-stone-900 h-32 resize-none"
                              />
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={submitEvaluation}
                              disabled={evaluation.rating === 0}
                              className="w-full py-4 bg-stone-900 text-white rounded-full font-cute text-xl shadow-lg disabled:opacity-50"
                            >
                              평가 남기기
                            </motion.button>
                          </div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8 space-y-4"
                          >
                            <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="w-8 h-8 text-white" />
                            </div>
                            <p className="font-cute text-2xl text-stone-900">고마워 피플아! 네 의견 잘 들었어. 🕶️</p>
                          </motion.div>
                        )}
                      </div>

                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={reset}
                        className="mt-4 w-full py-5 bg-stone-900 text-white rounded-[30px] font-cute text-2xl hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-lg"
                      >
                        <RefreshCcw className="w-6 h-6" /> 처음부터 다시 하기
                      </motion.button>

                      {userEmail === ADMIN_EMAIL && (
                        <button 
                          onClick={fetchEvaluations}
                          className="w-full py-3 text-stone-400 font-cute text-lg hover:text-stone-600 transition-colors"
                        >
                          관리자: 모든 평가 보기
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Modal */}
        <AnimatePresence>
          {showAdmin && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-900 text-white">
                  <h3 className="text-2xl font-cute font-bold">피플이들의 목소리 (관리자 전용)</h3>
                  <button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-stone-50">
                  {allEvaluations.length === 0 ? (
                    <div className="text-center py-20 text-stone-400 font-cute text-xl">아직 도착한 평가가 없어.</div>
                  ) : (
                    allEvaluations.map((ev, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={cn("w-5 h-5", ev.rating >= s ? "fill-amber-400 text-amber-400" : "text-stone-100")} />
                            ))}
                          </div>
                          <span className="text-stone-400 text-sm font-mono">{new Date(ev.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-stone-800 font-cute text-xl italic">"{ev.message}"</p>
                        <div className="text-stone-400 text-sm font-cute">작성자: {ev.user_email}</div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-red-500 font-cute text-lg"
          >
            {error}
          </motion.p>
        )}
      </main>

      {/* Chat Interface */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-80 md:w-96 h-[500px] bg-white rounded-[30px] shadow-2xl border border-stone-100 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-stone-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden">
                    <BossCharacter className="w-6 h-6" isSpeaking={loading} />
                  </div>
                  <span className="text-white font-cute text-lg">보스와 대화하기</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-stone-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-stone-400 font-cute text-sm md:text-base">피플아, 궁금한 거 있어? 보스한테 물어봐!</p>
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl font-cute text-base md:text-lg space-y-2",
                      msg.role === 'user' 
                        ? "bg-stone-900 text-white rounded-tr-none" 
                        : "bg-white text-stone-800 border border-stone-100 rounded-tl-none shadow-sm"
                    )}>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Chat upload" 
                          referrerPolicy="no-referrer"
                          className="w-full h-auto rounded-xl mb-2 border border-white/20" 
                        />
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-stone-100 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-stone-100 bg-white space-y-3">
                {chatImage && (
                  <div className="relative w-20 h-20">
                    <img 
                      src={chatImage} 
                      alt="Preview" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl border border-stone-200" 
                    />
                    <button 
                      onClick={() => setChatImage(null)}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-0.5 text-stone-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={chatFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleChatImageUpload}
                  />
                  <button 
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="보스한테 한마디..."
                    className="flex-1 bg-stone-50 border border-stone-100 rounded-full px-4 py-2 font-cute text-lg focus:outline-none focus:border-stone-900 transition-colors"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={loading || (!userInput.trim() && !chatImage)}
                    className="p-2 bg-stone-900 text-white rounded-full disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative"
        >
          <MessageCircle className="w-8 h-8" />
          {!isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>

      <footer className="mt-20 py-8 border-t border-stone-100 w-full text-center text-stone-300 text-sm font-cute">
        © 2026 보스셀렉 (Boss Select) • 피플이의 매력을 찾아가는 여정
      </footer>
    </div>
  );
}

function AnalysisItem({ label, content, icon }: { label: string, content: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-stone-400 text-sm uppercase tracking-wider font-bold">
        {icon} {label}
      </div>
      <p className="text-stone-300 text-lg font-cute">{content}</p>
    </div>
  );
}

function InsightCard({ title, content, icon, color, delay }: { title: string, content: string, icon: React.ReactNode, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={cn("p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-sm border border-white/50", color)}
    >
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <div className="p-2 bg-white rounded-xl md:rounded-2xl shadow-sm">
          {icon}
        </div>
        <h4 className="font-cute text-xl md:text-2xl font-bold text-stone-800">{title}</h4>
      </div>
      <p className="text-stone-700 text-lg md:text-xl font-cute leading-relaxed">{content}</p>
    </motion.div>
  );
}

function TypewriterText({ text, onTypingStart, onTypingEnd }: { text: string, onTypingStart?: () => void, onTypingEnd?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    if (onTypingStart) onTypingStart();
    
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        if (onTypingEnd) onTypingEnd();
      }
    }, 30);
    
    return () => {
      clearInterval(timer);
      if (onTypingEnd) onTypingEnd();
    };
  }, [text]);

  return <span>{displayedText}</span>;
}
