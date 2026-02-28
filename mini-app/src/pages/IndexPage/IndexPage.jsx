import { Button } from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page.jsx';
import { useState, useEffect, useRef, useCallback } from 'react';




// Звуки
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playBeep(frequency, duration, volume = 0.3, type = 'sine') {
  if (!audioCtx) return;
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playSound(type) {
  switch (type) {
    case 'beep3': playBeep(880, 0.15, 0.2); break;
    case 'beep2': playBeep(700, 0.15, 0.25); break;
    case 'beep1': playBeep(600, 0.15, 0.3); break;
    case 'start': playBeep(880, 0.3, 0.3, 'sine'); break;
    case 'done':
      playBeep(700, 0.6, 0.5, 'square');
      setTimeout(() => playBeep(800, 0.6, 0.5, 'square'), 220);
      setTimeout(() => playBeep(900, 0.6, 0.5, 'square'), 440);
      break;
  }
}

function vibrate(type) {
  if (!navigator.vibrate) return;
  switch (type) {
    case 'tick': navigator.vibrate(30); break;
    case 'start': navigator.vibrate([50, 30, 50]); break;
    case 'done': navigator.vibrate([100, 50, 100, 50, 200]); break;
  }
}

function DrumPicker({ values, selected, onChange, label, disabled }) {
  const containerRef = useRef(null);
  const itemHeight = 44;

  useEffect(() => {
    const index = values.indexOf(selected);
    if (containerRef.current) {
      containerRef.current.scrollTop = (index + 1) * itemHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    onChange(values[clamped]);
  }, [values, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
      <span style={{
        fontSize: '15px', color: '#555', marginBottom: '12px',
        fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <div style={{
        position: 'relative', height: itemHeight * 3, width: '100%',
        overflow: 'hidden', borderRadius: '14px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '4px', right: '4px',
          height: itemHeight, transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.07)', borderRadius: '10px',
          pointerEvents: 'none', zIndex: 1,
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: itemHeight,
          background: 'linear-gradient(to bottom, #0d0d0f 20%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: itemHeight,
          background: 'linear-gradient(to top, #0d0d0f 20%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            height: '100%',
            overflowY: disabled ? 'hidden' : 'scroll',
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            scrollPaddingTop: itemHeight,
            pointerEvents: disabled ? 'none' : 'auto',
            opacity: disabled ? 0.3 : 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <style>{`
            ._drum::-webkit-scrollbar { display: none; }
            @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800;900&display=swap');
          `}</style>
          <div style={{ height: itemHeight, flexShrink: 0 }} />
          {values.map((val) => (
            <div
              key={val}
              style={{
                height: itemHeight, scrollSnapAlign: 'start',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: val === selected ? '18px' : '15px',
                fontWeight: val === selected ? '700' : '400',
                color: val === selected ? '#ffffff' : '#444',
                transition: 'all 0.15s ease', cursor: 'pointer',
                letterSpacing: '-0.02em',
              }}
              onClick={() => {
                onChange(val);
                containerRef.current.scrollTo({
                  top: (values.indexOf(val) + 1) * itemHeight,
                  behavior: 'smooth'
                });
              }}
            >
              {label === 'Круги' ? val : val === 0 ? 'Без отдыха' : `${val} сек`}
            </div>
          ))}
          <div style={{ height: itemHeight, flexShrink: 0, pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
}

const roundValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const timeValues = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
const restValues = [0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

const MODE = { IDLE: 'idle', WORK: 'work', REST: 'rest', DONE: 'done' };

export function IndexPage() {
  const [rounds, setRounds] = useState(3);
  const [restTime, setRestTime] = useState(10);
  const [workTime, setWorkTime] = useState(30);
  const [seconds, setSeconds] = useState(30);
  const [mode, setMode] = useState(MODE.IDLE);
  const [currentRound, setCurrentRound] = useState(1);
  const [shouldStart, setShouldStart] = useState(false);
  const intervalRef = useRef(null);

  const isRunning = mode === MODE.WORK || mode === MODE.REST;

  useEffect(() => {
    if (mode === MODE.IDLE || mode === MODE.DONE) setSeconds(workTime);
  }, [workTime, mode]);

  useEffect(() => {
    if (shouldStart && seconds === workTime) {
      setShouldStart(false);
      setMode(MODE.WORK);
      playSound('start');
      vibrate('start');
    }
  }, [shouldStart, seconds, workTime]);

  useEffect(() => {
    if (!isRunning) return;
    if (seconds === 3) { playSound('beep3'); vibrate('tick'); }
    if (seconds === 2) { playSound('beep2'); vibrate('tick'); }
    if (seconds === 1) { playSound('beep1'); vibrate('tick'); }
  }, [seconds, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  useEffect(() => {
    if (seconds !== 0 || !isRunning) return;
    if (mode === MODE.WORK) {
      if (currentRound >= rounds) {
        playSound('done'); vibrate('done');
        setMode(MODE.DONE); setCurrentRound(1);
            } else {
        playSound('start'); vibrate('start');
        if (restTime === 0) {
          setCurrentRound(prev => prev + 1);
          setSeconds(workTime);
          setMode(MODE.WORK);
        } else {
          setSeconds(restTime); setMode(MODE.REST);
        }
      }
    } else if (mode === MODE.REST) {
      playSound('start'); vibrate('start');
      setCurrentRound(prev => prev + 1);
      setSeconds(workTime); setMode(MODE.WORK);
    }
  }, [seconds]);

  const handleStart = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    setCurrentRound(1);
    setSeconds(workTime);
    setShouldStart(true);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setMode(MODE.IDLE); setCurrentRound(1); setSeconds(workTime);
  };

  const displaySeconds = isRunning ? seconds : workTime;
  const totalTime = mode === MODE.REST ? restTime : workTime;
  const progress = (displaySeconds / totalTime) * 100;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const circleColor = mode === MODE.REST ? '#34C759' : '#007AFF';
  const isCountdown = displaySeconds <= 3 && isRunning;

  const getTitle = () => {
    if (mode === MODE.IDLE) return 'Выбери время\nдля тренировки';
    if (mode === MODE.WORK) return `Тренировка 🔥`;
    if (mode === MODE.REST) return 'Отдыхаем 😮‍💨';
    if (mode === MODE.DONE) return 'Готово! 🎉';
  };

  const getSubtitle = () => {
    if (mode === MODE.WORK || mode === MODE.REST) return `Круг ${currentRound} из ${rounds}`;
    return null;
  };

  return (
    <Page back={false}>
    
      <div style={{
        display: 'flex', flexDirection: 'column',
        padding: '0 20px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d0d0f 0%, #111318 100%)',
      }}>

        {/* Заголовок */}
        <div style={{ padding: '28px 0 16px', textAlign: 'center' }}>
          <div style={{
           fontSize: '22px', fontWeight: '800',
          letterSpacing: '0.02em', lineHeight: 1.2,
          }}>
            {getTitle()}
          </div>
          {getSubtitle() && (
            <div style={{
              marginTop: '6px', fontSize: '13px',
              color: circleColor, fontWeight: '600',
              letterSpacing: '0.02em',
            }}>
              {getSubtitle()}
            </div>
          )}
        </div>

        {/* Круг */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
          <div style={{ position: 'relative', width: '220px', height: '220px' }}>
            <svg width="220" height="220" style={{
              transform: 'rotate(-90deg)',
              filter: `drop-shadow(0 0 12px ${circleColor}66) drop-shadow(0 0 24px ${circleColor}33)`,
              transition: 'filter 0.3s ease',
            }}>
              <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle
                cx="110" cy="110" r={radius}
                fill="none" stroke={circleColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{
                fontSize: '64px', fontWeight: '800',
                letterSpacing: '-0.04em', lineHeight: 1,
                color: isCountdown ? '#FF3B30' : '#ffffff',
                transition: 'color 0.3s ease',
              }}>
                {displaySeconds}
              </span>
              <span style={{
                fontSize: '12px', color: '#444', marginTop: '6px',
                fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                секунд
              </span>
            </div>
          </div>
        </div>

        {/* Слайдеры */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <DrumPicker values={roundValues} selected={rounds} onChange={setRounds} label="Круги" disabled={isRunning} />
          <DrumPicker values={restValues} selected={restTime} onChange={setRestTime} label="Отдых" disabled={isRunning} />
          <DrumPicker values={timeValues} selected={workTime} onChange={setWorkTime} label="Время" disabled={isRunning} />
        </div>

        {/* Кнопка */}
        <div style={{ paddingBottom: '32px' }}>
          {mode === MODE.DONE ? (
            <button onClick={handleStart} style={{
              width: '100%', padding: '18px', border: 'none', borderRadius: '16px',
              background: 'linear-gradient(135deg, #007AFF, #0055CC)',
              color: '#fff', fontSize: '20px', fontWeight: '800',
              letterSpacing: '0.08em', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(0,122,255,0.35)',
            }}>ЕЩЁ РАЗ 🔄</button>
          ) : !isRunning ? (
            <button onClick={handleStart} style={{
              width: '100%', padding: '18px', border: 'none', borderRadius: '16px',
              background: 'linear-gradient(135deg, #007AFF, #0055CC)',
              color: '#fff', fontSize: '20px', fontWeight: '800',
              letterSpacing: '0.08em', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(0,122,255,0.35)',
            }}>СТАРТ</button>
          ) : (
            <button onClick={handleStop} style={{
              width: '100%', padding: '18px', border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: '16px', background: 'transparent',
              color: '#fff', fontSize: '20px', fontWeight: '800',
              letterSpacing: '0.08em', cursor: 'pointer',
            }}>СТОП</button>
          )}
        </div>

      </div>
    </Page>
  );
}