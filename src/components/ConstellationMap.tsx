import React, { useMemo, useState, useEffect } from 'react';
import { Star, Sparkles, ListIcon, Map as MapIcon, Mic, ChevronRight, ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';
import { StarNode, DailyMessage, Photo } from '../types';
import { generateConstellationNodes, getChapterForDay, getChapterRange, CHAPTER_SIZE } from '../utils/constellationUtils';
import { PARTNER_NAME } from '../data/constants';

interface ConstellationMapProps {
  daysPlayed: number;
  unlockedDays: number[];
  linkedPhotos?: Photo[];
  onSelectStar: (message: DailyMessage) => void;
}

export const ConstellationMap: React.FC<ConstellationMapProps> = ({
  daysPlayed,
  unlockedDays,
  linkedPhotos = [],
  onSelectStar,
}) => {
  const [view, setView] = useState<'map' | 'list'>('map');
  const linkedDaySet = useMemo(
    () => new Set(linkedPhotos.filter((p) => p.linkedDay).map((p) => p.linkedDay as number)),
    [linkedPhotos]
  );

  // The whole journey is paged into 30-day "chapters" — like a level map in a
  // mobile game (Planet of Gems / Candy Crush style): finishing chapter 1
  // opens up chapter 2 as a new area, but it's all one continuous night sky
  // you can page back through.
  const currentChapter = Math.max(1, getChapterForDay(Math.max(daysPlayed, 1)));
  const [selectedChapter, setSelectedChapter] = useState<number>(currentChapter);

  // Keep the view pinned to the newest chapter as new ones unlock
  useEffect(() => {
    setSelectedChapter(currentChapter);
  }, [currentChapter]);

  const chapterList = useMemo(
    () => Array.from({ length: currentChapter }, (_, i) => i + 1),
    [currentChapter]
  );

  const { start: chapterStart, end: chapterEnd } = getChapterRange(selectedChapter);
  const chapterIsComplete = daysPlayed >= chapterEnd;

  // Generate spiral points for the selected chapter (Golden Ratio / Phyllotaxis)
  const nodes: StarNode[] = useMemo(() => {
    return generateConstellationNodes(daysPlayed, unlockedDays, selectedChapter, CHAPTER_SIZE);
  }, [daysPlayed, unlockedDays, selectedChapter]);

  // Filter unlocked nodes to connect with glowing lines
  const unlockedNodes = useMemo(() => {
    return nodes.filter((node) => node.unlocked);
  }, [nodes]);

  // Generate path string d for SVG connecting lines
  const pathD = useMemo(() => {
    if (unlockedNodes.length === 0) return '';
    return unlockedNodes.reduce((acc, node, index) => {
      if (index === 0) return `M ${node.x} ${node.y}`;
      return `${acc} L ${node.x} ${node.y}`;
    }, '');
  }, [unlockedNodes]);

  return (
    <div className="w-full max-w-lg mx-auto my-3 px-4 relative z-10">
      <div className="bg-[var(--bg-elevated)]/70 border border-[var(--border)] rounded-[32px] sm:rounded-[40px] p-6 sm:p-7 backdrop-blur-xl shadow-[0_20px_50px_var(--overlay)] text-center relative overflow-hidden">
        {/* Title */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif text-xl sm:text-2xl font-light italic text-[var(--accent)]">
              Галактика
            </h3>
          </div>

          {/* Map / List view toggle — the list is much easier to tap through on a phone
              than the small clustered stars on the spiral map */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)]">
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition ${
                view === 'map' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              Карта
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition ${
                view === 'list' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <ListIcon className="w-3 h-3" />
              Тізім
            </button>
          </div>
        </div>

        {/* Chapter selector — a small level-map style strip. Each chapter is a
            fresh 30-day constellation; finishing one reveals the next. */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
            disabled={selectedChapter <= 1}
            className="p-1.5 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Алдыңғы тарау"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {chapterList.map((chapterNum) => {
              const { end } = getChapterRange(chapterNum);
              const isDone = daysPlayed >= end;
              const isActive = chapterNum === selectedChapter;
              return (
                <button
                  key={chapterNum}
                  onClick={() => setSelectedChapter(chapterNum)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3 h-3" />}
                  Тарау {chapterNum}
                </button>
              );
            })}

            {/* Teaser for the next, still-locked chapter */}
            {chapterIsComplete && (
              <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium border border-dashed border-[var(--border)] text-[var(--locked-text)]">
                <Lock className="w-3 h-3" />
                Тарау {currentChapter + 1}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-[var(--accent-2)] -mt-1 mb-2">
          Күндер {chapterStart}–{chapterEnd}
          {view === 'map' && ' · Жұлдызды бас'}
        </p>

        {view === 'map' ? (
          <>
            {/* SVG CONSTELLATION CANVAS */}
            <div className="relative w-full aspect-square max-w-[340px] mx-auto my-1 flex items-center justify-center">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full filter drop-shadow-[0_0_15px_var(--accent-glow)] overflow-visible"
              >
                <defs>
                  {/* Line Gradient */}
                  <linearGradient id="starLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="var(--accent-2)" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="var(--text)" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Glowing star filter */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Connecting lines between unlocked stars */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#starLineGrad)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-700"
                  />
                )}

                {/* Render Constellation Star Nodes */}
                {nodes.map((node) => {
                  const isLatest = node.dayNumber === daysPlayed;
                  return (
                    <g
                      key={node.id}
                      onClick={() => {
                        if (node.unlocked) {
                          onSelectStar(node.message);
                        }
                      }}
                      className={`cursor-pointer transition-transform duration-300 ${
                        node.unlocked ? 'hover:scale-125' : 'opacity-40 cursor-not-allowed'
                      }`}
                      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    >
                      {/* Larger invisible tap target — makes tiny stars easier to hit on mobile */}
                      {node.unlocked && (
                        <circle cx={node.x} cy={node.y} r="20" fill="transparent" />
                      )}

                      {/* Outer pulse for latest unlocked star */}
                      {isLatest && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="16"
                          fill="var(--accent-glow)"
                          className="animate-ping"
                        />
                      )}

                      {/* Star aura / glow */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.unlocked ? (isLatest ? '12' : '9') : '5'}
                        fill={node.unlocked ? (isLatest ? 'var(--text)' : 'var(--accent)') : 'var(--locked-fill)'}
                        opacity={node.unlocked ? '0.35' : '0.5'}
                        filter="url(#glow)"
                      />

                      {/* Core Star Point */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.unlocked ? (isLatest ? '6' : '4.5') : '3'}
                        fill={node.unlocked ? 'var(--accent)' : 'var(--locked-fill)'}
                        stroke={node.unlocked ? 'var(--accent-2)' : 'var(--locked-border)'}
                        strokeWidth={node.unlocked ? '1.5' : '1'}
                      />

                      {/* Star Day Number Label */}
                      <text
                        x={node.x}
                        y={node.y + 14}
                        textAnchor="middle"
                        fill={node.unlocked ? 'var(--accent-dark)' : 'var(--locked-text)'}
                        fontSize="9"
                        fontWeight={node.unlocked ? 'bold' : 'normal'}
                        className="select-none font-sans"
                      >
                        {node.dayNumber}
                      </text>

                      {/* Camera badge — this star has a linked gallery photo */}
                      {linkedDaySet.has(node.dayNumber) && node.unlocked && (
                        <g>
                          <circle
                            cx={node.x + 9}
                            cy={node.y - 9}
                            r="6"
                            fill="var(--bg-elevated)"
                            stroke="var(--accent-2)"
                            strokeWidth="1"
                          />
                          <text
                            x={node.x + 9}
                            y={node.y - 6.5}
                            textAnchor="middle"
                            fontSize="7"
                            className="select-none"
                          >
                            📷
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        ) : (
          /* LIST VIEW — easier to browse and tap on a phone than the spiral map */
          <div className="max-h-[380px] overflow-y-auto space-y-2 -mx-1 px-1">
            {nodes.filter((n) => n.unlocked).length === 0 ? (
              <div className="text-center py-10 text-[var(--text-faint)] italic text-sm">
                Бұл тарауда әлі бірде-бір жұлдыз ашылмаған.
              </div>
            ) : (
              nodes
                .filter((n) => n.unlocked)
                .map((node) => {
                  const isLatest = node.dayNumber === daysPlayed;
                  const isVoice = !!node.message.voiceUrl;
                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectStar(node.message)}
                      className={`w-full flex items-center gap-3 text-left p-3.5 rounded-2xl border transition active:scale-[0.98] ${
                        isLatest
                          ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40'
                          : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]/30'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                        {isVoice ? (
                          <Mic className="w-4 h-4 text-[var(--accent)]" />
                        ) : (
                          <Star className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[var(--accent-2)] font-semibold uppercase tracking-wide flex items-center gap-1">
                          Күн {node.dayNumber}
                          {linkedDaySet.has(node.dayNumber) && <span className="text-[10px]">📷</span>}
                        </div>
                        <div className="text-sm text-[var(--text)] font-medium truncate">
                          {node.message.title}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" />
                    </button>
                  );
                })
            )}
          </div>
        )}

        {/* Caption under constellation */}
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5 font-medium">
            <Star className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]" />
            <span className="font-serif text-sm italic text-[var(--accent)]">
              Тарау {selectedChapter}: {Math.min(Math.max(daysPlayed - chapterStart + 1, 0), CHAPTER_SIZE)} / {CHAPTER_SIZE}
            </span>
          </div>

          <div className="text-[11px] text-[var(--accent-2)] italic">
            Барлығы бірге: {daysPlayed} күн
          </div>
        </div>
      </div>
    </div>
  );
};
