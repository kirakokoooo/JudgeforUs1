import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppPhase, INITIAL_STATE, GameState, Player, BattleRound } from './types';
import { generateArguments, simulateBattleRound } from './services/geminiService';
import { SketchBox, SketchButton, SketchInput, StickFigureAvatar, FloatingCard, ChatBubble, ShoutingAnimation } from './components/SketchComponents';

const MAX_ROUNDS = 3;

const App = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [draftInput, setDraftInput] = useState("");
  const [generatedArgs, setGeneratedArgs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualBattleInput, setManualBattleInput] = useState("");
  
  // Visual state for battle
  const [displayDialogue, setDisplayDialogue] = useState<any[]>([]);
  const [showResultCard, setShowResultCard] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [displayDialogue, showResultCard]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // --- ACTIONS ---

  const handleSetupComplete = () => {
    if (!gameState.p1.nickname || !gameState.p2.nickname || !gameState.topic) {
      alert("请填写好双方昵称和吵架主题哦！");
      return;
    }
    setGameState(prev => ({ ...prev, phase: AppPhase.P1_DRAFT }));
  };

  const handleGenerateArgs = async () => {
    if (!draftInput.trim()) return;
    setIsLoading(true);
    const args = await generateArguments(gameState.topic, draftInput);
    setGeneratedArgs(args);
    setIsLoading(false);
  };

  const handleToggleArg = (arg: string, playerId: 1 | 2) => {
    setGameState(prev => {
      const player = playerId === 1 ? prev.p1 : prev.p2;
      const currentTeam = player.team;
      let newTeam;
      if (currentTeam.includes(arg)) {
        newTeam = currentTeam.filter(a => a !== arg);
      } else {
        if (currentTeam.length >= 10) return prev; 
        newTeam = [...currentTeam, arg];
      }
      return {
        ...prev,
        [playerId === 1 ? 'p1' : 'p2']: { ...player, team: newTeam }
      };
    });
  };

  const handleDraftComplete = (playerId: 1 | 2) => {
    const player = playerId === 1 ? gameState.p1 : gameState.p2;
    if (player.team.length === 0) {
      alert("请至少选择一个吵架理由！");
      return;
    }
    
    // Save state
    setGameState(prev => ({
      ...prev,
      [playerId === 1 ? 'p1' : 'p2']: { ...player, mainView: draftInput }
    }));
    
    // Reset inputs
    setDraftInput("");
    setGeneratedArgs([]);

    // Next Phase
    if (playerId === 1) {
      setGameState(prev => ({ ...prev, phase: AppPhase.P2_DRAFT }));
    } else {
      setGameState(prev => ({ ...prev, phase: AppPhase.BATTLE }));
    }
  };

  const handleSurrender = (playerId: 1 | 2) => {
    if (confirm(`${playerId === 1 ? gameState.p1.nickname : gameState.p2.nickname} 确定要认输吗？`)) {
       setGameState(prev => ({
         ...prev,
         surrenderBy: playerId,
         phase: AppPhase.RESULT
       }));
    }
  };

  // Logic to play out the turn-by-turn dialogue
  const playDialogueAnimation = async (dialogue: any[]) => {
    setDisplayDialogue([]);
    setShowResultCard(false);

    for (const line of dialogue) {
      await new Promise(r => setTimeout(r, 1500)); // Delay between messages
      setDisplayDialogue(prev => [...prev, line]);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    setShowResultCard(true);
  };

  const startNextRound = useCallback(async (manualInput?: string) => {
    const roundIdx = gameState.currentRoundIndex;
    
    // Stop if we reached max rounds
    if (roundIdx >= MAX_ROUNDS) {
      setGameState(prev => ({ ...prev, phase: AppPhase.RESULT }));
      return;
    }

    const p1Arg = gameState.p1.team[roundIdx] || null;
    const p2Arg = gameState.p2.team[roundIdx] || null;

    // Game Over if no args left (and not handled by max rounds) or manual input needed but not provided
    if (!p1Arg && !p2Arg && !manualInput) {
      setGameState(prev => ({ ...prev, phase: AppPhase.RESULT }));
      return;
    }

    setGameState(prev => ({ ...prev, isBattleProcessing: true }));
    setShowResultCard(false);
    setDisplayDialogue([]);

    // Prepare inputs
    let finalP1Arg = p1Arg;
    let finalP2Arg = p2Arg;
    let isP1Manual = false;
    let isP2Manual = false;

    if (!finalP1Arg) {
       if (manualInput && !p1Arg) { 
         finalP1Arg = manualInput;
         isP1Manual = true;
       } else {
         finalP1Arg = "我没词了！";
       }
    }
    if (!finalP2Arg) {
      if (manualInput && !p2Arg) { 
        finalP2Arg = manualInput;
        isP2Manual = true;
      } else {
        finalP2Arg = "我没词了！";
      }
    }

    // Call API
    const result = await simulateBattleRound(
      gameState.topic,
      finalP1Arg,
      gameState.p1.nickname,
      finalP2Arg,
      gameState.p2.nickname,
      isP1Manual,
      isP2Manual
    );

    // Turn off "Processing" (Brawl animation)
    setGameState(prev => ({ ...prev, isBattleProcessing: false }));

    // Start visual playback
    await playDialogueAnimation(result.dialogue);

    // Update Game State with result
    setGameState(prev => {
      const p1Votes = Math.round(result.voteP1); 
      const winnerId = p1Votes > 50 ? 1 : p1Votes < 50 ? 2 : 0;
      
      const newRound: BattleRound = {
        roundNumber: roundIdx + 1,
        p1Arg: finalP1Arg,
        p2Arg: finalP2Arg,
        isP1Manual,
        isP2Manual,
        dialogue: result.dialogue,
        voteP1: p1Votes,
        winnerId,
        reason: result.reason
      };

      return {
        ...prev,
        rounds: [...prev.rounds, newRound],
        totalP1Votes: prev.totalP1Votes + p1Votes,
        totalP2Votes: prev.totalP2Votes + (100 - p1Votes),
      };
    });
    
    setManualBattleInput("");
  }, [gameState.currentRoundIndex, gameState.p1, gameState.p2, gameState.topic]);

  const handleNextRoundClick = () => {
    const nextRoundIdx = gameState.rounds.length;
    
    if (nextRoundIdx >= MAX_ROUNDS) {
      setGameState(prev => ({ ...prev, phase: AppPhase.RESULT }));
    } else {
      setGameState(prev => ({ ...prev, currentRoundIndex: nextRoundIdx }));
      setShowResultCard(false);
      setDisplayDialogue([]);
    }
  };

  const resetGame = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setGameState(INITIAL_STATE);
    setDraftInput("");
    setGeneratedArgs([]);
    setManualBattleInput("");
    setShowResultCard(false);
    setDisplayDialogue([]);
  };

  // --- EFFECT: TRIGGER BATTLE ROUND ---
  useEffect(() => {
    if (gameState.phase !== AppPhase.BATTLE) return;

    const roundIndex = gameState.currentRoundIndex;
    
    // Stop auto-trigger if we exceeded max rounds
    if (roundIndex >= MAX_ROUNDS) return;

    const p1Arg = gameState.p1.team[roundIndex];
    const p2Arg = gameState.p2.team[roundIndex];

    const needsManual = (!p1Arg || !p2Arg) && (p1Arg || p2Arg);
    
    // Check if this round has already been played
    const isRoundPlayed = gameState.rounds.length > roundIndex;
    
    // Only auto-start if valid args, not processing, not showing result, and round not yet played
    if (p1Arg && p2Arg && !gameState.isBattleProcessing && !showResultCard && !isRoundPlayed && displayDialogue.length === 0) {
       startNextRound();
    }
  }, [
    gameState.phase, 
    gameState.currentRoundIndex, 
    gameState.p1.team, 
    gameState.p2.team, 
    gameState.isBattleProcessing, 
    gameState.rounds.length, 
    showResultCard,
    displayDialogue.length,
    startNextRound
  ]);


  // --- RENDERERS ---

  if (gameState.phase === AppPhase.SETUP) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center max-w-2xl mx-auto">
        <h1 className="text-6xl font-handwriting mb-8 text-center animate-float tracking-widest text-[#2D3748]">都来评评理</h1>
        
        <SketchBox className="w-full mb-8" color="white">
          <div className="flex justify-around items-end mb-6">
            <div className="flex flex-col items-center group">
              <StickFigureAvatar id={1} name={gameState.p1.nickname} showName={false} />
              <SketchInput 
                placeholder="昵称 1" 
                className="w-32 text-center mt-4 text-indigo-700 font-bold"
                maxLength={8}
                value={gameState.p1.nickname}
                onChange={(e) => setGameState(prev => ({ ...prev, p1: { ...prev.p1, nickname: e.target.value } }))}
              />
            </div>
            <div className="text-6xl font-handwriting mb-12 text-gray-300 font-bold">VS</div>
            <div className="flex flex-col items-center group">
              <StickFigureAvatar id={2} name={gameState.p2.nickname} showName={false} />
              <SketchInput 
                placeholder="昵称 2" 
                className="w-32 text-center mt-4 text-orange-700 font-bold"
                maxLength={8}
                value={gameState.p2.nickname}
                onChange={(e) => setGameState(prev => ({ ...prev, p2: { ...prev.p2, nickname: e.target.value } }))}
              />
            </div>
          </div>
          
          <div className="mt-8 bg-yellow-50 p-4 border-sketch-sm border-2 border-yellow-200">
            <label className="block font-handwriting text-2xl mb-2 text-center text-gray-700">✍️ 吵架问题：</label>
            <SketchInput 
              placeholder="需双方协商一致后填入（25字内）" 
              maxLength={25}
              value={gameState.topic}
              className="text-center text-gray-800"
              onChange={(e) => setGameState(prev => ({ ...prev, topic: e.target.value }))}
            />
          </div>
        </SketchBox>

        <SketchButton onClick={handleSetupComplete} className="w-full text-2xl py-4 shadow-xl hover:-translate-y-1">
          🔥 开始吵架！ 🔥
        </SketchButton>
      </div>
    );
  }

  if (gameState.phase === AppPhase.P1_DRAFT || gameState.phase === AppPhase.P2_DRAFT) {
    const isP1 = gameState.phase === AppPhase.P1_DRAFT;
    const currentPlayer = isP1 ? gameState.p1 : gameState.p2;

    return (
      <div className="min-h-screen p-4 max-w-4xl mx-auto flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
               <StickFigureAvatar id={isP1 ? 1 : 2} name={currentPlayer.nickname} size="sm" showName={false} />
               <h2 className="text-4xl font-handwriting text-gray-800">
                 <span className={isP1 ? "text-indigo-600" : "text-orange-600"}>{currentPlayer.nickname}</span> 的回合
               </h2>
            </div>
            <div className="font-handwriting text-2xl bg-white px-4 py-2 border-2 border-gray-800 border-sketch-sm shadow-md">
               战队人数: {currentPlayer.team.length}/10 🚩
            </div>
        </div>

        <SketchBox className="mb-6" color={isP1 ? 'blue' : 'yellow'}>
           <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-grow w-full">
               <label className="block font-handwriting text-xl mb-2 text-gray-700">你的核心观点（20字以内）：</label>
               <SketchInput 
                 value={draftInput}
                 onChange={(e) => setDraftInput(e.target.value)}
                 maxLength={20} 
                 placeholder="例如：豆腐脑必须是咸的！"
                 className="text-xl bg-white/50 rounded px-2"
               />
             </div>
             <SketchButton onClick={handleGenerateArgs} disabled={isLoading || !draftInput} className="whitespace-nowrap w-full md:w-auto">
               {isLoading ? "🧠 思考中..." : "🧞‍♂️ 召唤外援"}
             </SketchButton>
           </div>
        </SketchBox>

        <div className="flex-grow relative min-h-[400px] border-sketch border-2 border-gray-400 bg-white p-6 shadow-inner overflow-hidden">
          {generatedArgs.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 font-handwriting opacity-80 pointer-events-none select-none">
              <span className="text-8xl mb-4 opacity-50">💭</span>
              <span className="text-3xl">输入观点，云端外援团就会出现！</span>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center font-handwriting text-3xl animate-pulse text-indigo-400 z-10 bg-white/80">
               <span className="text-6xl mb-6 animate-bounce">🤔</span>
               正在绞尽脑汁帮你想理由...
            </div>
          )}
          <div className="flex flex-wrap justify-center content-start gap-4 h-full overflow-y-auto scrollbar-hide py-4 pb-20">
            {generatedArgs.map((arg, idx) => (
              <FloatingCard 
                key={idx}
                index={idx}
                text={arg}
                selected={currentPlayer.team.includes(arg)}
                onClick={() => handleToggleArg(arg, isP1 ? 1 : 2)}
              />
            ))}
          </div>
        </div>

        <SketchButton 
          className="mt-6 w-full py-4 text-2xl shadow-xl hover:-translate-y-1 z-20" 
          onClick={() => handleDraftComplete(isP1 ? 1 : 2)}
          disabled={currentPlayer.team.length === 0}
          variant="primary"
        >
          ✨ {currentPlayer.nickname} 战队组建完成！
        </SketchButton>
      </div>
    );
  }

  if (gameState.phase === AppPhase.BATTLE) {
    const roundIndex = gameState.currentRoundIndex;
    const p1HasArg = !!gameState.p1.team[roundIndex];
    const p2HasArg = !!gameState.p2.team[roundIndex];
    const needsManual = (!p1HasArg || !p2HasArg) && (p1HasArg || p2HasArg); 
    const manualPlayerId = !p1HasArg ? 1 : 2;
    const manualPlayerName = manualPlayerId === 1 ? gameState.p1.nickname : gameState.p2.nickname;

    const isWaitingForManual = needsManual && !gameState.isBattleProcessing && !showResultCard;
    const currentRoundData = gameState.rounds[roundIndex];

    return (
      <div className="min-h-screen p-4 max-w-2xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 bg-white p-3 border-2 border-sketch-sm border-gray-800 shadow-sm sticky top-2 z-30">
           <StickFigureAvatar id={1} name={gameState.p1.nickname} size="sm" animate={gameState.isBattleProcessing} />
           <div className="text-center font-handwriting">
             <div className="text-3xl font-bold text-gray-800 bg-yellow-100 px-4 transform -rotate-1 inline-block border-2 border-gray-800">
               Round {roundIndex + 1} / {MAX_ROUNDS}
             </div>
             <div className="text-sm text-gray-500 max-w-[150px] truncate mt-1 mx-auto">{gameState.topic}</div>
           </div>
           <StickFigureAvatar id={2} name={gameState.p2.nickname} size="sm" animate={gameState.isBattleProcessing} />
        </div>

        {/* Surrender Buttons */}
        <div className="flex justify-between mb-2 px-2">
           <button onClick={() => handleSurrender(1)} className="text-sm font-handwriting text-gray-500 hover:text-red-500 underline">
             {gameState.p1.nickname} 认输
           </button>
           <button onClick={() => handleSurrender(2)} className="text-sm font-handwriting text-gray-500 hover:text-red-500 underline">
             {gameState.p2.nickname} 认输
           </button>
        </div>

        {/* BATTLE ARENA */}
        <div className="flex-grow flex flex-col relative min-h-[600px] bg-white border-2 border-gray-200 border-sketch rounded-lg p-2 shadow-inner">
          
          {/* Waiting / Input State */}
          {isWaitingForManual && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
              <SketchBox className="w-full max-w-md shadow-2xl animate-pop border-red-400 bg-[#FFEBEE]">
                <h3 className="font-handwriting text-3xl mb-2 text-center text-red-600 font-bold">
                  😲 {manualPlayerName} 没词了！
                </h3>
                <p className="font-handwriting mb-6 text-center text-gray-700 text-xl">
                  快！亲自上场反击！
                </p>
                <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300 mb-4 font-handwriting text-center italic text-gray-500 text-lg">
                   对方说: "{manualPlayerId === 1 ? gameState.p2.team[roundIndex] : gameState.p1.team[roundIndex]}"
                </div>
                <SketchInput 
                  value={manualBattleInput}
                  onChange={(e) => setManualBattleInput(e.target.value)}
                  placeholder="输入你的神反击..."
                  className="mb-6 bg-white rounded border-b-0 border-2 border-gray-300"
                  autoFocus
                />
                <SketchButton onClick={() => startNextRound(manualBattleInput)} disabled={!manualBattleInput} className="w-full" variant="danger">
                  🗣️ 亲自反击！
                </SketchButton>
              </SketchBox>
            </div>
          )}

          {/* Processing / Brawl State */}
          {gameState.isBattleProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm rounded-lg">
               <ShoutingAnimation p1Name={gameState.p1.nickname} p2Name={gameState.p2.nickname} />
               <div className="font-handwriting text-3xl text-indigo-600 mt-6 animate-pulse">
                 激烈交涉中...
               </div>
            </div>
          )}

          {/* Chat Display (Turn by Turn) */}
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth pb-48">
            {displayDialogue.length > 0 ? (
               displayDialogue.map((line, idx) => (
                 <ChatBubble 
                   key={idx} 
                   text={line.text} 
                   isP1={line.speaker === gameState.p1.nickname} 
                   speakerName={line.speaker}
                   roundIndex={roundIndex}
                 />
               ))
            ) : (
              !isWaitingForManual && !gameState.isBattleProcessing && (
                <div className="text-center mt-20 text-gray-300 font-handwriting text-4xl">
                   准备开战...
                </div>
              )
            )}
          </div>

          {/* Verdict Card (Fixed at bottom when shown) */}
          {showResultCard && currentRoundData && (
             <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-10">
               <div className="animate-slide-up">
                 <SketchBox className="bg-[#FFF9C4] border-yellow-400 shadow-xl">
                   <div className="font-handwriting text-center mb-3 text-2xl font-bold flex items-center justify-center gap-2 text-gray-800">
                     <span>⚖️</span> 本轮战况 <span>⚖️</span>
                   </div>
                   
                   {/* Progress Bar */}
                   <div className="relative h-10 w-full bg-[#FFCCBC] rounded-full border-2 border-gray-800 overflow-hidden mb-2">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#C5CAE9] transition-all duration-1000 ease-out flex items-center justify-end pr-2 border-r-2 border-gray-800" 
                        style={{ width: `${currentRoundData.voteP1}%` }}
                      >
                         {currentRoundData.voteP1 > 20 && <span className="text-indigo-900 font-bold font-handwriting mr-2">{currentRoundData.voteP1}人</span>}
                      </div>
                      <div className="absolute top-0 right-0 h-full flex items-center justify-start pl-2">
                         {currentRoundData.voteP1 < 80 && <span className="text-red-900 font-bold font-handwriting ml-2">{100 - currentRoundData.voteP1}人</span>}
                      </div>
                   </div>

                   <p className="text-center font-handwriting text-gray-700 text-lg italic bg-white/60 p-2 rounded border border-yellow-300">
                     " {currentRoundData.reason} "
                   </p>
                 </SketchBox>
                 
                 <SketchButton onClick={handleNextRoundClick} className="w-full mt-4 text-2xl py-3 shadow-lg hover:-translate-y-1">
                   {roundIndex < MAX_ROUNDS - 1 ? "👉 进入下一轮" : "🏁 查看最终结果"}
                 </SketchButton>
               </div>
             </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState.phase === AppPhase.RESULT) {
    let winnerName = "";
    let reason = "";

    if (gameState.surrenderBy) {
      winnerName = gameState.surrenderBy === 1 ? gameState.p2.nickname : gameState.p1.nickname;
      reason = `${gameState.surrenderBy === 1 ? gameState.p1.nickname : gameState.p2.nickname} 举白旗投降了！`;
    } else {
      const winnerId = gameState.totalP1Votes > gameState.totalP2Votes ? 1 : 2;
      winnerName = winnerId === 1 ? gameState.p1.nickname : gameState.p2.nickname;
      reason = "经过几轮激烈的唇枪舌战...";
    }
    
    const roundsPlayed = gameState.rounds.length;

    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center max-w-2xl mx-auto bg-repeat" style={{ backgroundImage: 'radial-gradient(#ddd 1px, transparent 1px)', backgroundSize: '15px 15px' }}>
        <h1 className="text-6xl font-handwriting mb-8 text-center text-[#2D3748]">🏆 最终裁决 🏆</h1>
        
        <SketchBox className="w-full mb-8 p-8 transform rotate-1 bg-white" color="white">
           <p className="font-handwriting text-3xl text-center mb-10 leading-relaxed text-gray-700">
             {reason}
           </p>
           
           {!gameState.surrenderBy && (
             <div className="flex justify-between mb-12 font-handwriting text-xl px-4">
                <div className="text-center flex flex-col items-center">
                  <StickFigureAvatar id={1} name={gameState.p1.nickname} size="sm" showName={false} />
                  <div className="font-bold text-2xl mt-2">{gameState.p1.nickname}</div>
                  <div className="font-bold text-5xl text-indigo-600 my-2">{gameState.totalP1Votes}</div>
                  <div className="text-gray-500 bg-gray-100 px-2 rounded">支持票</div>
                </div>
                <div className="text-center flex flex-col items-center">
                  <StickFigureAvatar id={2} name={gameState.p2.nickname} size="sm" showName={false} />
                  <div className="font-bold text-2xl mt-2">{gameState.p2.nickname}</div>
                  <div className="font-bold text-5xl text-orange-600 my-2">{gameState.totalP2Votes}</div>
                  <div className="text-gray-500 bg-gray-100 px-2 rounded">支持票</div>
                </div>
             </div>
           )}

           <div className="text-center border-t-4 border-dashed border-gray-200 pt-8 relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-4 text-gray-400 font-handwriting text-xl">
                 结果是
              </div>
              <p className="font-handwriting text-2xl text-gray-600 mb-4">获胜的是...</p>
              <h2 className="font-handwriting text-7xl font-bold text-red-500 animate-float inline-block tracking-wider drop-shadow-sm">
                 🎉 {winnerName} 🎉
              </h2>
           </div>
        </SketchBox>

        <div className="flex flex-col w-full gap-4 max-w-md">
          <SketchButton onClick={resetGame} variant="primary" className="text-2xl py-4 shadow-xl">
             🕊️ 接受结果，和平相处
          </SketchButton>
          <SketchButton onClick={() => setGameState(prev => ({ ...prev, phase: AppPhase.P1_DRAFT, rounds: [], currentRoundIndex: 0, totalP1Votes: 0, totalP2Votes: 0, surrenderBy: undefined }))} variant="secondary" className="text-2xl py-4 shadow-md">
             😤 不服！再战
          </SketchButton>
        </div>
      </div>
    );
  }

  return null;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);