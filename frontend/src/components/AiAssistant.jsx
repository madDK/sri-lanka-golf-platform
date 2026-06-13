import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { API_BASE } from '../config';

export default function AiAssistant({ t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: t.aiGreeting }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);

  const messagesEndRef = useRef(null);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputValue('');
    setTyping(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Apologies, I am having trouble connecting right now.' }]);
      }
    } catch(err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Connection failure. Please verify network.' }]);
    }
    setTyping(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "Recommend a course",
    "How to book a tee time?",
    "Nuwara Eliya weather",
    "Stay & Play packages"
  ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 hover:from-golf-gold-500 hover:to-golf-gold-700 text-golf-charcoal-950 p-4 rounded-full shadow-2xl transition-all hover:scale-105 border border-white/10 flex items-center justify-center animate-pulse-slow"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[380px] h-[500px] glass-panel rounded-3xl border border-golf-gold-500/20 shadow-2xl flex flex-col overflow-hidden animate-slide-up text-xs">
          
          {/* Header */}
          <div className="bg-golf-charcoal-900 border-b border-golf-charcoal-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-golf-green-600 p-1.5 rounded-lg text-golf-gold-400 border border-golf-gold-500/10">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="font-bold text-white font-serif">{t.aiAssistantTitle}</h4>
                <span className="text-[10px] text-golf-gold-400 font-semibold uppercase tracking-wider">Online Ambasssador</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-golf-green-600 text-white rounded-tr-none'
                    : 'bg-golf-charcoal-800 border border-golf-charcoal-700/60 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-golf-charcoal-800 border border-golf-charcoal-700/60 text-slate-400 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-golf-gold-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-golf-gold-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-golf-gold-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Container */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-golf-charcoal-850 flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="bg-golf-charcoal-800 hover:bg-golf-green-950/20 hover:text-golf-gold-400 border border-golf-charcoal-700/60 rounded-full px-3 py-1.5 text-[10px] text-slate-300 font-semibold transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-golf-charcoal-900 border-t border-golf-charcoal-800 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t.aiPlaceholder}
              className="flex-1 bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-golf-gold-500"
            />
            <button
              onClick={() => handleSendMessage()}
              className="bg-golf-gold-500 hover:bg-golf-gold-600 text-golf-charcoal-950 p-2.5 rounded-xl flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
