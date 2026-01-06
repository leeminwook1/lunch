import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Rhythm.module.css';

export default function RhythmGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'result'
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [difficulty, setDifficulty] = useState('normal');
    const [selectedSong, setSelectedSong] = useState(0);
    const [judgement, setJudgement] = useState('');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [health, setHealth] = useState(100);
    const [missCount, setMissCount] = useState(0);
    const gameRef = useRef(null);
    const audioContextRef = useRef(null);
    const eventListenersRef = useRef({ keydown: null, keyup: null });
    const musicIntervalRef = useRef(null);

    // 곡 데이터
    const songs = [
        {
            name: '🍕 피자 파티',
            bpm: 120,
            duration: 30,
            pattern: 'pizza'
        },
        {
            name: '🍔 버거 비트',
            bpm: 140,
            duration: 30,
            pattern: 'burger'
        },
        {
            name: '🍜 라면 러시',
            bpm: 160,
            duration: 30,
            pattern: 'ramen'
        }
    ];

    // 난이도 설정
    const difficultySettings = {
        easy: { speed: 3, noteFrequency: 1.5, perfectWindow: 80, goodWindow: 150 },
        normal: { speed: 4, noteFrequency: 1.0, perfectWindow: 60, goodWindow: 120 },
        hard: { speed: 5, noteFrequency: 0.7, perfectWindow: 40, goodWindow: 80 }
    };

    // 오디오 컨텍스트 초기화
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // 사운드 설정 로드
        const savedSoundEnabled = localStorage.getItem('rhythmSoundEnabled');
        if (savedSoundEnabled !== null) {
            setSoundEnabled(savedSoundEnabled === 'true');
        }
        
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            // 배경 음악 정리
            stopBackgroundMusic(musicIntervalRef.current);
        };
    }, []);

    // 사운드 재생 함수
    const playSound = (frequency, duration = 0.1, type = 'sine') => {
        if (!soundEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    };

    // 배경 음악 재생
    const playBackgroundMusic = (song) => {
        if (!soundEnabled || !audioContextRef.current) return null;

        const ctx = audioContextRef.current;
        const beatInterval = (60 / song.bpm); // seconds per beat
        
        // 곡별 멜로디 패턴 (음계)
        const melodies = {
            pizza: [262, 330, 392, 330], // C, E, G, E
            burger: [294, 370, 440, 370], // D, F#, A, F#
            ramen: [330, 415, 494, 415]  // E, G#, B, G#
        };

        const melody = melodies[song.pattern] || melodies.pizza;
        let noteIndex = 0;

        const playNote = () => {
            if (!soundEnabled || !audioContextRef.current) return;

            const ctx = audioContextRef.current;
            const now = ctx.currentTime;
            const frequency = melody[noteIndex % melody.length];
            const noteDuration = beatInterval * 0.4; // 짧게
            
            try {
                // 멜로디 노트
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.frequency.value = frequency;
                osc.type = 'square';
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);
                
                osc.start(now);
                osc.stop(now + noteDuration);
                
                // 베이스 라인 (옥타브 아래)
                if (noteIndex % 2 === 0) {
                    const bass = ctx.createOscillator();
                    const bassGain = ctx.createGain();
                    
                    bass.connect(bassGain);
                    bassGain.connect(ctx.destination);
                    
                    bass.frequency.value = frequency / 2;
                    bass.type = 'sine';
                    
                    bassGain.gain.setValueAtTime(0, now);
                    bassGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
                    bassGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 0.8);
                    
                    bass.start(now);
                    bass.stop(now + noteDuration * 0.8);
                }
            } catch (error) {
                console.error('음악 재생 오류:', error);
            }
            
            noteIndex++;
        };

        // 첫 노트 즉시 재생
        playNote();
        
        // 비트 간격으로 노트 재생
        const intervalId = setInterval(playNote, beatInterval * 1000);
        
        return intervalId;
    };

    // 배경 음악 정지
    const stopBackgroundMusic = (intervalId) => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };

    // 레인별 사운드
    const laneSounds = [262, 330, 392, 523]; // C, E, G, C (한 옥타브 위)

    // 게임 시작
    const startGame = () => {
        if (audioContextRef.current) {
            audioContextRef.current.resume();
        }

        setGameState('playing');
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setAccuracy(100);
        setHealth(100);
        setMissCount(0);

        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 800;
            canvas.height = 600;

            const settings = difficultySettings[difficulty];
            const song = songs[selectedSong];

            // 게임 객체
            const game = {
                lanes: [
                    { x: 150, key: 'D', color: '#ef4444', emoji: '🍕', pressed: false },
                    { x: 300, key: 'F', color: '#3b82f6', emoji: '🍔', pressed: false },
                    { x: 450, key: 'J', color: '#22c55e', emoji: '🍜', pressed: false },
                    { x: 600, key: 'K', color: '#f59e0b', emoji: '🍰', pressed: false }
                ],
                notes: [],
                particles: [],
                judgeLine: 500,
                score: 0,
                combo: 0,
                maxCombo: 0,
                perfectCount: 0,
                goodCount: 0,
                missCount: 0,
                health: 100,
                maxHealth: 100,
                frame: 0,
                isRunning: true,
                startTime: Date.now(),
                duration: song.duration * 1000,
                noteTimer: 0,
                settings: settings
            };

            gameRef.current = game;

            // 노트 패턴 생성
            generateNotePattern(game, song);

            // 배경 음악 시작
            musicIntervalRef.current = playBackgroundMusic(song);

            // 키보드 이벤트
            const handleKeyDown = (e) => {
                const key = e.key.toUpperCase();
                const laneIndex = game.lanes.findIndex(lane => lane.key === key);
                
                if (laneIndex !== -1 && !game.lanes[laneIndex].pressed) {
                    game.lanes[laneIndex].pressed = true;
                    checkHit(game, laneIndex);
                    playSound(laneSounds[laneIndex], 0.15);
                }
            };

            const handleKeyUp = (e) => {
                const key = e.key.toUpperCase();
                const laneIndex = game.lanes.findIndex(lane => lane.key === key);
                
                if (laneIndex !== -1) {
                    game.lanes[laneIndex].pressed = false;
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            // 이벤트 리스너 저장
            eventListenersRef.current = {
                keydown: handleKeyDown,
                keyup: handleKeyUp
            };

            // 게임 루프
            const gameLoop = () => {
                if (!game.isRunning) return;

                update(game);
                draw(game, ctx, canvas);

                // 게임 종료 체크
                const elapsed = Date.now() - game.startTime;
                if (elapsed >= game.duration && game.notes.length === 0) {
                    endGame(game);
                    cleanupEventListeners();
                    return;
                }

                requestAnimationFrame(gameLoop);
            };

            // 이벤트 리스너 정리 함수
            const cleanupEventListeners = () => {
                if (eventListenersRef.current.keydown) {
                    window.removeEventListener('keydown', eventListenersRef.current.keydown);
                }
                if (eventListenersRef.current.keyup) {
                    window.removeEventListener('keyup', eventListenersRef.current.keyup);
                }
                if (eventListenersRef.current.click && canvas) {
                    canvas.removeEventListener('click', eventListenersRef.current.click);
                }
                // 배경 음악 정지
                stopBackgroundMusic(musicIntervalRef.current);
            };

            gameLoop();
        }, 100);
    };

    // 노트 패턴 생성
    const generateNotePattern = (game, song) => {
        const beatInterval = (60 / song.bpm) * 1000; // ms per beat
        const totalBeats = (song.duration * song.bpm) / 60;
        const noteFreq = game.settings.noteFrequency;

        // 패턴별 노트 생성
        for (let beat = 0; beat < totalBeats; beat++) {
            const time = beat * beatInterval;

            if (song.pattern === 'pizza') {
                // 간단한 패턴
                if (beat % 2 === 0) {
                    game.notes.push(createNote(game, Math.floor(Math.random() * 4), time));
                }
            } else if (song.pattern === 'burger') {
                // 중간 난이도 패턴
                if (beat % 1 === 0) {
                    game.notes.push(createNote(game, Math.floor(Math.random() * 4), time));
                }
                if (beat % 4 === 0 && Math.random() < 0.5) {
                    game.notes.push(createNote(game, Math.floor(Math.random() * 4), time + beatInterval / 2));
                }
            } else if (song.pattern === 'ramen') {
                // 어려운 패턴
                if (beat % 1 === 0) {
                    game.notes.push(createNote(game, Math.floor(Math.random() * 4), time));
                }
                if (Math.random() < 0.6) {
                    game.notes.push(createNote(game, Math.floor(Math.random() * 4), time + beatInterval / 2));
                }
            }
        }

        // 난이도에 따라 노트 필터링
        if (difficulty === 'easy') {
            game.notes = game.notes.filter((_, i) => i % 2 === 0);
        } else if (difficulty === 'hard') {
            // 추가 노트
            const extraNotes = [];
            game.notes.forEach(note => {
                if (Math.random() < 0.3) {
                    extraNotes.push(createNote(game, (note.lane + 1) % 4, note.spawnTime + 100));
                }
            });
            game.notes.push(...extraNotes);
        }

        game.notes.sort((a, b) => a.spawnTime - b.spawnTime);
    };

    // 노트 생성
    const createNote = (game, laneIndex, spawnTime) => {
        return {
            lane: laneIndex,
            y: -50,
            spawnTime: spawnTime,
            spawned: false,
            hit: false,
            missed: false,
            emoji: game.lanes[laneIndex].emoji
        };
    };

    // 히트 체크
    const checkHit = (game, laneIndex) => {
        const notesInLane = game.notes.filter(note => 
            note.lane === laneIndex && 
            !note.hit && 
            !note.missed &&
            note.spawned
        );

        if (notesInLane.length === 0) return;

        // 가장 가까운 노트 찾기
        const closestNote = notesInLane.reduce((closest, note) => {
            const dist = Math.abs(note.y - game.judgeLine);
            const closestDist = Math.abs(closest.y - game.judgeLine);
            return dist < closestDist ? note : closest;
        });

        const distance = Math.abs(closestNote.y - game.judgeLine);

        if (distance <= game.settings.perfectWindow) {
            // Perfect
            closestNote.hit = true;
            game.score += 100;
            game.combo++;
            game.perfectCount++;
            setJudgement('PERFECT!');
            createHitParticles(game, game.lanes[laneIndex].x, game.judgeLine, game.lanes[laneIndex].color);
            playSound(laneSounds[laneIndex] * 2, 0.1, 'square');
        } else if (distance <= game.settings.goodWindow) {
            // Good
            closestNote.hit = true;
            game.score += 50;
            game.combo++;
            game.goodCount++;
            setJudgement('GOOD');
            createHitParticles(game, game.lanes[laneIndex].x, game.judgeLine, game.lanes[laneIndex].color);
        } else {
            return; // Too far
        }

        if (game.combo > game.maxCombo) {
            game.maxCombo = game.combo;
        }

        setScore(game.score);
        setCombo(game.combo);
        setMaxCombo(game.maxCombo);

        setTimeout(() => setJudgement(''), 300);
    };

    // 파티클 생성
    const createHitParticles = (game, x, y, color) => {
        for (let i = 0; i < 15; i++) {
            game.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                radius: Math.random() * 4 + 2,
                life: 30,
                color: color
            });
        }
    };

    // 업데이트
    const update = (game) => {
        game.frame++;
        const currentTime = Date.now() - game.startTime;

        // 노트 스폰 및 이동
        game.notes.forEach(note => {
            if (!note.spawned && currentTime >= note.spawnTime) {
                note.spawned = true;
            }

            if (note.spawned && !note.hit && !note.missed) {
                note.y += game.settings.speed;

                // Miss 체크
                if (note.y > game.judgeLine + game.settings.goodWindow) {
                    note.missed = true;
                    game.combo = 0;
                    game.missCount++;
                    
                    // 체력 감소
                    game.health -= 20;
                    setHealth(game.health);
                    setMissCount(game.missCount);
                    setCombo(0);
                    setJudgement('MISS!');
                    
                    // 체력이 0 이하면 게임 오버
                    if (game.health <= 0) {
                        game.health = 0;
                        game.isRunning = false;
                        setHealth(0);
                        
                        // 약간의 지연 후 게임 종료 (애니메이션 보여주기 위해)
                        setTimeout(() => {
                            endGame(game);
                        }, 500);
                        return;
                    }
                    
                    setTimeout(() => setJudgement(''), 300);
                }
            }
        });

        // 화면 밖 노트 제거
        game.notes = game.notes.filter(note => 
            !note.hit && !note.missed || note.y < 650
        );

        // 파티클 업데이트
        game.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3;
            particle.life--;

            if (particle.life <= 0) {
                game.particles.splice(index, 1);
            }
        });

        // 정확도 계산
        const totalNotes = game.perfectCount + game.goodCount + game.missCount;
        if (totalNotes > 0) {
            const acc = ((game.perfectCount * 100 + game.goodCount * 50) / (totalNotes * 100)) * 100;
            setAccuracy(Math.round(acc * 10) / 10);
        }
    };

    // 그리기
    const draw = (game, ctx, canvas) => {
        // 배경
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e1b4b');
        gradient.addColorStop(1, '#312e81');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 레인 그리기
        game.lanes.forEach(lane => {
            // 레인 배경
            ctx.fillStyle = lane.pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(lane.x - 40, 0, 80, canvas.height);

            // 레인 테두리
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(lane.x - 40, 0, 80, canvas.height);

            // 판정 라인
            ctx.strokeStyle = lane.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(lane.x - 45, game.judgeLine);
            ctx.lineTo(lane.x + 45, game.judgeLine);
            ctx.stroke();

            // 키 표시
            ctx.fillStyle = lane.pressed ? lane.color : 'rgba(255, 255, 255, 0.5)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(lane.key, lane.x, game.judgeLine + 50);
        });

        // 노트 그리기
        game.notes.forEach(note => {
            if (!note.spawned || note.hit || note.missed) return;

            const lane = game.lanes[note.lane];
            const distance = Math.abs(note.y - game.judgeLine);
            
            // 노트 색상
            let alpha = 1;
            if (distance < game.settings.perfectWindow) {
                alpha = 1;
                ctx.shadowColor = lane.color;
                ctx.shadowBlur = 20;
            } else if (distance < game.settings.goodWindow) {
                alpha = 0.8;
                ctx.shadowBlur = 10;
            }

            ctx.fillStyle = lane.color;
            ctx.globalAlpha = alpha;
            
            // 노트 그리기 (둥근 사각형)
            const noteWidth = 70;
            const noteHeight = 20;
            const x = lane.x - noteWidth / 2;
            const y = note.y - noteHeight / 2;
            const radius = 10;

            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + noteWidth - radius, y);
            ctx.quadraticCurveTo(x + noteWidth, y, x + noteWidth, y + radius);
            ctx.lineTo(x + noteWidth, y + noteHeight - radius);
            ctx.quadraticCurveTo(x + noteWidth, y + noteHeight, x + noteWidth - radius, y + noteHeight);
            ctx.lineTo(x + radius, y + noteHeight);
            ctx.quadraticCurveTo(x, y + noteHeight, x, y + noteHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();

            // 이모지
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(note.emoji, lane.x, note.y);
        });

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // 파티클 그리기
        game.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life / 30;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        // UI 그리기
        drawUI(game, ctx);
    };

    // UI 그리기
    const drawUI = (game, ctx) => {
        ctx.save();
        
        // 점수
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.textAlign = 'left';
        ctx.strokeText(`점수: ${game.score}`, 20, 40);
        ctx.fillText(`점수: ${game.score}`, 20, 40);

        // 정확도
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.strokeText(`정확도: ${accuracy}%`, 780, 40);
        ctx.fillText(`정확도: ${accuracy}%`, 780, 40);
        
        ctx.textAlign = 'left';

        // 체력바 배경
        const healthBarX = 20;
        const healthBarY = 70;
        const healthBarWidth = 200;
        const healthBarHeight = 25;
        
        // 체력바 테두리
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // 체력바 배경 (어두운 부분)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX + 2, healthBarY + 2, healthBarWidth - 4, healthBarHeight - 4);
        
        // 체력바 (색상은 체력에 따라 변경)
        const healthPercent = game.health / game.maxHealth;
        let healthColor;
        if (healthPercent > 0.6) {
            healthColor = '#22c55e'; // 초록
        } else if (healthPercent > 0.3) {
            healthColor = '#f59e0b'; // 주황
        } else {
            healthColor = '#ef4444'; // 빨강
        }
        
        const currentHealthWidth = (healthBarWidth - 4) * healthPercent;
        ctx.fillStyle = healthColor;
        ctx.fillRect(healthBarX + 2, healthBarY + 2, currentHealthWidth, healthBarHeight - 4);
        
        // 체력 텍스트
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(`❤️ ${Math.max(0, game.health)}`, healthBarX + healthBarWidth / 2, healthBarY + 18);
        ctx.fillText(`❤️ ${Math.max(0, game.health)}`, healthBarX + healthBarWidth / 2, healthBarY + 18);
        
        ctx.textAlign = 'left';

        // 콤보
        if (game.combo > 0) {
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = game.combo > 10 ? '#fbbf24' : '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(`${game.combo} COMBO!`, 400, 150);
            ctx.fillText(`${game.combo} COMBO!`, 400, 150);
        }

        // 진행도
        const elapsed = Date.now() - game.startTime;
        const progress = Math.min(elapsed / game.duration, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(20, 560, 760, 20);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(20, 560, 760 * progress, 20);
        
        ctx.restore();
    };

    // 게임 종료
    const endGame = (game) => {
        game.isRunning = false;
        
        // 배경 음악 정지
        stopBackgroundMusic(musicIntervalRef.current);
        
        setGameState('result');
        setScore(game.score);
        setMaxCombo(game.maxCombo);
        setHealth(game.health);
        setMissCount(game.missCount);
        
        // 점수 저장 (선택사항)
        saveScore(game);
    };

    // 점수 저장
    const saveScore = async (game) => {
        try {
            const userId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
            const userName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');

            if (!userId || !userName) return;

            await fetch('/api/game-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    nickname: userName,
                    score: game.score,
                    gameType: 'rhythm'
                })
            });
        } catch (error) {
            console.error('점수 저장 실패:', error);
        }
    };

    return (
        <>
            <Head>
                <title>🎵 리듬 게임 - 음식 비트</title>
            </Head>

            <div className={styles.container}>
                {gameState === 'menu' && (
                    <div className={styles.menu}>
                        <h1 className={styles.title}>🎵 음식 비트</h1>
                        <p className={styles.subtitle}>리듬에 맞춰 키를 눌러보세요!</p>

                        <div className={styles.songSelect}>
                            <h2>곡 선택</h2>
                            {songs.map((song, index) => (
                                <button
                                    key={index}
                                    className={`${styles.songButton} ${selectedSong === index ? styles.selected : ''}`}
                                    onClick={() => setSelectedSong(index)}
                                >
                                    <span className={styles.songName}>{song.name}</span>
                                    <span className={styles.songInfo}>BPM: {song.bpm} | {song.duration}초</span>
                                </button>
                            ))}
                        </div>

                        <div className={styles.difficultySelect}>
                            <h2>난이도</h2>
                            <div className={styles.difficultyButtons}>
                                <button
                                    className={`${styles.diffButton} ${difficulty === 'easy' ? styles.selected : ''}`}
                                    onClick={() => setDifficulty('easy')}
                                >
                                    😊 쉬움
                                </button>
                                <button
                                    className={`${styles.diffButton} ${difficulty === 'normal' ? styles.selected : ''}`}
                                    onClick={() => setDifficulty('normal')}
                                >
                                    😎 보통
                                </button>
                                <button
                                    className={`${styles.diffButton} ${difficulty === 'hard' ? styles.selected : ''}`}
                                    onClick={() => setDifficulty('hard')}
                                >
                                    🔥 어려움
                                </button>
                            </div>
                        </div>

                        <div className={styles.controls}>
                            <p>🎹 조작법: D, F, J, K 키를 사용하세요</p>
                            <p>🎯 판정: Perfect (±60ms) | Good (±120ms)</p>
                            <p>❤️ 체력: 100 (미스 시 -20, 0이 되면 게임 오버!)</p>
                        </div>

                        <div className={styles.menuButtons}>
                            <button className={styles.startButton} onClick={startGame}>
                                게임 시작
                            </button>
                            <button className={styles.backButton} onClick={() => router.push('/')}>
                                메인으로
                            </button>
                        </div>

                        <button 
                            className={styles.soundToggle}
                            onClick={() => {
                                const newSoundEnabled = !soundEnabled;
                                setSoundEnabled(newSoundEnabled);
                                localStorage.setItem('rhythmSoundEnabled', newSoundEnabled.toString());
                            }}
                        >
                            {soundEnabled ? '🔊' : '🔇'}
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className={styles.gameContainer}>
                        <canvas ref={canvasRef} className={styles.canvas} />
                        {judgement && (
                            <div className={styles.judgement}>{judgement}</div>
                        )}
                    </div>
                )}

                {gameState === 'result' && (
                    <div className={styles.result}>
                        <h1 className={styles.resultTitle}>
                            {health > 0 ? '🎉 완주!' : '💔 게임 오버'}
                        </h1>
                        {health <= 0 && (
                            <p className={styles.gameOverText}>체력이 모두 소진되었습니다!</p>
                        )}
                        <div className={styles.resultStats}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>점수</span>
                                <span className={styles.statValue}>{score}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>최대 콤보</span>
                                <span className={styles.statValue}>{maxCombo}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>정확도</span>
                                <span className={styles.statValue}>{accuracy}%</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>남은 체력</span>
                                <span className={styles.statValue}>❤️ {health}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>미스 횟수</span>
                                <span className={styles.statValue}>{missCount}</span>
                            </div>
                        </div>

                        <div className={styles.resultButtons}>
                            <button className={styles.retryButton} onClick={startGame}>
                                다시 하기
                            </button>
                            <button className={styles.menuButton} onClick={() => setGameState('menu')}>
                                메뉴로
                            </button>
                            <button className={styles.backButton} onClick={() => router.push('/')}>
                                메인으로
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
