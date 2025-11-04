import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Avoid.module.css';
import getSoundManager from '../utils/sounds';

export default function AvoidGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover'
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(3);
    const [timeLeft, setTimeLeft] = useState(0); // 경과 시간
    const [restaurants, setRestaurants] = useState([]);
    const [hitRestaurants, setHitRestaurants] = useState({}); // { restaurantId: count }
    const [currentUser, setCurrentUser] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [activeEffects, setActiveEffects] = useState({
        shield: 0,
        slow: 0,
        target: false
    });
    const [topScores, setTopScores] = useState([]);
    const [showNicknameInput, setShowNicknameInput] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const gameRef = useRef(null);
    const soundManager = useRef(null);
    const timerRef = useRef(null);

    // 게임 초기화
    useEffect(() => {
        soundManager.current = getSoundManager();
        
        const savedSoundEnabled = localStorage.getItem('avoidSoundEnabled');
        if (savedSoundEnabled !== null) {
            const enabled = savedSoundEnabled === 'true';
            setSoundEnabled(enabled);
            if (soundManager.current) {
                soundManager.current.setEnabled(enabled);
            }
        }

        loadCurrentUser();
        fetchRestaurants();
        fetchTopScores();
    }, []);

    const loadCurrentUser = () => {
        const savedUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId');
        const savedUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName');
        
        if (savedUserId && savedUserName) {
            setCurrentUser({
                _id: savedUserId,
                name: savedUserName
            });
        }
    };

    const fetchTopScores = async () => {
        try {
            const response = await fetch('/api/game-scores/top?gameType=avoid&limit=10');
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setTopScores(data.data);
                }
            }
        } catch (error) {
            console.error('상위 점수 로드 실패:', error);
        }
    };

    const saveScore = async (finalScore, survivalTime, userNickname) => {
        if (!currentUser) {
            return false;
        }

        try {
            const response = await fetch('/api/game-scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser._id,
                    nickname: userNickname,
                    score: finalScore,
                    gameType: 'avoid',
                    metadata: {
                        survivalTime: survivalTime
                    }
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await fetchTopScores();
                return true;
            } else {
                console.error('점수 저장 실패:', data.error);
                return false;
            }
        } catch (error) {
            console.error('점수 저장 오류:', error);
            return false;
        }
    };

    const fetchRestaurants = async () => {
        try {
            const response = await fetch('/api/restaurants');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRestaurants(data.data);
                }
            }
        } catch (error) {
            console.error('식당 데이터 로드 실패:', error);
        }
    };

    const toggleSound = () => {
        const newSoundEnabled = !soundEnabled;
        setSoundEnabled(newSoundEnabled);
        localStorage.setItem('avoidSoundEnabled', newSoundEnabled.toString());
        if (soundManager.current) {
            soundManager.current.setEnabled(newSoundEnabled);
        }
    };

    const startGame = () => {
        if (soundManager.current) {
            soundManager.current.resume();
        }

        setGameState('playing');
        setScore(0);
        setHp(3);
        setTimeLeft(0);
        setHitRestaurants({});
        setActiveEffects({ shield: 0, slow: 0, target: false });

        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 800;
            canvas.height = 600;

            // 게임 객체
            const game = {
                player: {
                    x: 400,
                    y: 540,
                    width: 40,
                    height: 40,
                    speed: 8,
                    moveLeft: false,
                    moveRight: false
                },
                fallingItems: [],
                particles: [],
                score: 0,
                hp: 3,
                combo: 0,
                lastHitRestaurant: null,
                isRunning: true,
                frame: 0,
                spawnTimer: 0,
                difficulty: 1,
                effects: {
                    shield: 0,
                    slow: 0,
                    target: false,
                    invincible: 0,
                    shake: 0
                }
            };

            gameRef.current = game;

            // 타이머 시작 (경과 시간 카운트)
            let timeElapsed = 0;
            timerRef.current = setInterval(() => {
                timeElapsed++;
                setTimeLeft(timeElapsed);
            }, 1000);

            // 키보드 이벤트
            const handleKeyDown = (e) => {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    game.player.moveLeft = true;
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    game.player.moveRight = true;
                }
            };

            const handleKeyUp = (e) => {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    game.player.moveLeft = false;
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    game.player.moveRight = false;
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            // 아이템 생성
            const createFallingItem = () => {
                const x = Math.random() * (canvas.width - 60) + 30;
                const speedMultiplier = game.effects.slow > 0 ? 0.5 : 1;
                const difficultyMultiplier = 1 + (game.difficulty - 1) * 0.3; // 난이도에 따라 속도 증가
                
                const random = Math.random();
                let item;

                // 난이도가 높아질수록 식당 똥 비율 증가
                const restaurantChance = Math.min(0.5, 0.35 + (game.difficulty - 1) * 0.05);

                if (random < restaurantChance && restaurants.length > 0) {
                    // 식당 똥 (35% → 최대 50%)
                    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
                    item = {
                        x: x,
                        y: -50,
                        width: 35,
                        height: 35,
                        speed: (2 + Math.random() * 2) * speedMultiplier * difficultyMultiplier,
                        type: 'restaurant',
                        emoji: '💩',
                        restaurant: restaurant,
                        color: getRestaurantColor(restaurant._id)
                    };
                } else if (random < restaurantChance + 0.25) {
                    // 좋은 아이템 (25%)
                    const goodItems = [
                        { emoji: '⭐', score: 10 },
                        { emoji: '💰', score: 10 },
                        { emoji: '❤️', hp: 1 },
                        { emoji: '🛡️', effect: 'shield' },
                        { emoji: '⚡', effect: 'slow' },
                        { emoji: '💯', score: 100 },
                        { emoji: '🍀', random: true }
                    ];
                    const goodItem = goodItems[Math.floor(Math.random() * goodItems.length)];
                    item = {
                        x: x,
                        y: -50,
                        width: 30,
                        height: 30,
                        speed: (2.5 + Math.random() * 2) * speedMultiplier * difficultyMultiplier,
                        type: 'good',
                        ...goodItem
                    };
                } else {
                    // 나쁜 아이템 (40% → 25%)
                    const badItems = [
                        { emoji: '💣', damage: 2 },
                        { emoji: '☠️', damage: 1 },
                        { emoji: '❌', scoreDeduct: 50 },
                        { emoji: '🔥', effect: 'shake' }
                    ];
                    const badItem = badItems[Math.floor(Math.random() * badItems.length)];
                    item = {
                        x: x,
                        y: -50,
                        width: 30,
                        height: 30,
                        speed: (2 + Math.random() * 2) * speedMultiplier * difficultyMultiplier,
                        type: 'bad',
                        ...badItem
                    };
                }

                game.fallingItems.push(item);
            };

            // 식당별 색상 생성
            const getRestaurantColor = (id) => {
                const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return colors[hash % colors.length];
            };

            // 파티클 생성
            const createParticles = (x, y, color, emoji = null) => {
                for (let i = 0; i < 15; i++) {
                    game.particles.push({
                        x: x,
                        y: y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8 - 2,
                        radius: Math.random() * 4 + 2,
                        life: 40,
                        color: color,
                        emoji: emoji && i === 0 ? emoji : null
                    });
                }
            };

            // 배경 그리기
            const drawBackground = () => {
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#0ea5e9');
                gradient.addColorStop(1, '#6366f1');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 구름
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                for (let i = 0; i < 5; i++) {
                    const x = (game.frame * 0.3 + i * 200) % (canvas.width + 200) - 100;
                    const y = 50 + i * 30;
                    ctx.beginPath();
                    ctx.arc(x, y, 40, 0, Math.PI * 2);
                    ctx.arc(x + 30, y, 50, 0, Math.PI * 2);
                    ctx.arc(x + 60, y, 40, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 땅
                ctx.fillStyle = '#86efac';
                ctx.fillRect(0, 560, canvas.width, 40);
                ctx.fillStyle = '#22c55e';
                for (let i = 0; i < canvas.width; i += 40) {
                    ctx.fillRect(i, 560, 35, 5);
                }
            };

            // 플레이어 그리기
            const drawPlayer = () => {
                ctx.save();
                
                // 쉴드 효과
                if (game.effects.shield > 0) {
                    ctx.strokeStyle = '#00aaff';
                    ctx.lineWidth = 3;
                    ctx.shadowColor = '#00aaff';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(game.player.x + game.player.width / 2, game.player.y + game.player.height / 2, 28, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // 무적 상태 (깜빡임)
                if (game.effects.invincible > 0 && Math.floor(game.frame / 5) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                }

                // 캐릭터 (사람 아이콘 🧍)
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧍', game.player.x + game.player.width / 2, game.player.y + game.player.height / 2);

                ctx.restore();

                // 그림자
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.ellipse(game.player.x + game.player.width / 2, 575, 20, 5, 0, 0, Math.PI * 2);
                ctx.fill();
            };

            // 떨어지는 아이템 그리기
            const drawFallingItems = () => {
                game.fallingItems.forEach(item => {
                    ctx.save();

                    if (item.type === 'restaurant') {
                        // 식당 똥
                        ctx.fillStyle = item.color;
                        ctx.shadowColor = item.color;
                        ctx.shadowBlur = 8;
                        
                        // 똥 모양
                        ctx.beginPath();
                        ctx.arc(item.x, item.y, item.width / 2, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.shadowBlur = 0;
                        ctx.font = 'bold 28px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(item.emoji, item.x, item.y);

                        // 식당 이름
                        ctx.fillStyle = '#fff';
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        ctx.font = 'bold 10px Pretendard, sans-serif';
                        ctx.strokeText(item.restaurant.name, item.x, item.y + 22);
                        ctx.fillText(item.restaurant.name, item.x, item.y + 22);
                    } else {
                        // 일반 아이템
                        if (item.type === 'good') {
                            ctx.shadowColor = '#fbbf24';
                            ctx.shadowBlur = 12;
                        } else if (item.type === 'bad') {
                            ctx.shadowColor = '#ef4444';
                            ctx.shadowBlur = 12;
                        }

                        ctx.font = 'bold 28px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(item.emoji, item.x, item.y);
                        ctx.shadowBlur = 0;
                    }

                    ctx.restore();
                });
            };

            // 파티클 그리기
            const drawParticles = () => {
                game.particles.forEach((particle, index) => {
                    if (particle.emoji) {
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.globalAlpha = particle.life / 40;
                        ctx.fillText(particle.emoji, particle.x, particle.y);
                        ctx.globalAlpha = 1;
                    } else {
                        ctx.fillStyle = particle.color;
                        ctx.globalAlpha = particle.life / 40;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }

                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.vy += 0.3;
                    particle.life--;

                    if (particle.life <= 0) {
                        game.particles.splice(index, 1);
                    }
                });
            };

            // UI 그리기
            const drawUI = () => {
                ctx.save();
                
                // HP
                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText('HP:', 20, 40);
                ctx.fillText('HP:', 20, 40);
                
                for (let i = 0; i < game.hp; i++) {
                    ctx.font = '28px Arial';
                    ctx.fillText('❤️', 80 + i * 35, 40);
                }

                // 점수
                ctx.font = 'bold 32px Arial';
                ctx.strokeText(`점수: ${game.score}`, canvas.width / 2, 40);
                ctx.fillText(`점수: ${game.score}`, canvas.width / 2, 40);

                // 난이도
                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = game.difficulty > 2 ? '#ef4444' : '#fff';
                ctx.strokeText(`난이도: ${game.difficulty.toFixed(1)}`, canvas.width / 2, 75);
                ctx.fillText(`난이도: ${game.difficulty.toFixed(1)}`, canvas.width / 2, 75);

                // 효과 표시
                let effectY = 40;
                if (game.effects.shield > 0) {
                    ctx.fillStyle = '#00aaff';
                    ctx.font = 'bold 20px Arial';
                    ctx.strokeText(`🛡️ ${Math.ceil(game.effects.shield / 60)}초`, canvas.width - 120, effectY);
                    ctx.fillText(`🛡️ ${Math.ceil(game.effects.shield / 60)}초`, canvas.width - 120, effectY);
                    effectY += 30;
                }
                if (game.effects.slow > 0) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 20px Arial';
                    ctx.strokeText(`⚡ ${Math.ceil(game.effects.slow / 60)}초`, canvas.width - 120, effectY);
                    ctx.fillText(`⚡ ${Math.ceil(game.effects.slow / 60)}초`, canvas.width - 120, effectY);
                }

                ctx.restore();
            };

            // 충돌 감지 (원형 충돌 - 더 정확하고 관대함)
            const checkCollision = (player, item) => {
                // 플레이어와 아이템의 중심점
                const playerCenterX = player.x + player.width / 2;
                const playerCenterY = player.y + player.height / 2;
                const itemCenterX = item.x;
                const itemCenterY = item.y;
                
                // 거리 계산
                const dx = playerCenterX - itemCenterX;
                const dy = playerCenterY - itemCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 충돌 반경 (적절하게 조정)
                const playerRadius = player.width / 2 * 0.9; // 플레이어 90%
                const itemRadius = (item.width || 30) / 2 * 0.85; // 아이템 85%
                
                const isColliding = distance < (playerRadius + itemRadius);
                return isColliding;
            };

            // 게임 업데이트
            const update = () => {
                if (!game.isRunning) return;

                game.frame++;

                // 플레이어 이동
                if (game.player.moveLeft) {
                    game.player.x = Math.max(0, game.player.x - game.player.speed);
                }
                if (game.player.moveRight) {
                    game.player.x = Math.min(canvas.width - game.player.width, game.player.x + game.player.speed);
                }

                // 화면 흔들림 효과 업데이트
                if (game.effects.shake > 0) {
                    game.effects.shake--;
                    canvas.style.transform = `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 10}px)`;
                    if (game.effects.shake === 0) {
                        canvas.style.transform = 'translate(0, 0)';
                    }
                }

                // 효과 타이머 감소
                if (game.effects.shield > 0) game.effects.shield--;
                if (game.effects.slow > 0) game.effects.slow--;
                if (game.effects.invincible > 0) game.effects.invincible--;

                setActiveEffects({
                    shield: game.effects.shield,
                    slow: game.effects.slow,
                    target: game.effects.target
                });

                // 난이도 증가 (시간에 따라) - 무제한 증가
                game.difficulty = 1 + (timeLeft / 20); // 20초마다 난이도 +1

                // 생존 점수 증가 (매 프레임마다, 난이도에 따라 증가)
                // 60프레임 = 1초, 기본적으로 초당 1점, 난이도에 따라 증가
                if (game.frame % 60 === 0) {
                    const survivalBonus = Math.floor(1 + (game.difficulty - 1) * 0.5); // 난이도에 따라 보너스
                    game.score += survivalBonus;
                    setScore(game.score);
                }

                // 아이템 생성 (난이도에 따라 빨라짐)
                game.spawnTimer++;
                const baseSpawnRate = 60;
                const spawnRate = Math.max(15, baseSpawnRate - (game.difficulty * 8));
                if (game.spawnTimer > spawnRate) {
                    createFallingItem();
                    game.spawnTimer = 0;
                }

                // 아이템 업데이트 및 충돌 체크
                game.fallingItems.forEach((item, index) => {
                    item.y += item.speed;

                    // 충돌 체크
                    if (checkCollision(game.player, item)) {
                        let shouldRemove = true;
                        
                        if (item.type === 'restaurant') {
                            // 식당 똥 맞음 - 하트 감소!
                            if (game.effects.shield > 0) {
                                // 쉴드가 있으면 보호
                                game.effects.shield = 0;
                                createParticles(item.x, item.y, '#00aaff', '🛡️');
                                if (soundManager.current) {
                                    soundManager.current.playItem();
                                }
                            } else if (game.effects.invincible > 0) {
                                // 무적 상태면 무시
                                createParticles(item.x, item.y, '#fbbf24', '✨');
                            } else {
                                // 하트 감소
                                game.hp -= 1;
                                setHp(game.hp);
                                game.effects.invincible = 60; // 1초 무적
                                
                                // 마지막으로 맞은 식당 저장
                                game.lastHitRestaurant = item.restaurant;

                                createParticles(item.x, item.y, item.color, '💩');
                                if (soundManager.current) {
                                    soundManager.current.playHit();
                                }

                                // 하트가 0이 되면 게임 종료
                                if (game.hp <= 0) {
                                    game.isRunning = false;
                                    if (timerRef.current) {
                                        clearInterval(timerRef.current);
                                    }
                                    
                                    // 마지막 맞은 식당이 당첨
                                    if (game.lastHitRestaurant) {
                                        setHitRestaurants({
                                            [game.lastHitRestaurant._id]: 1
                                        });
                                    }

                                    setTimeout(() => {
                                        setGameState('gameover');
                                        if (currentUser) {
                                            setShowNicknameInput(true);
                                        }
                                        window.removeEventListener('keydown', handleKeyDown);
                                        window.removeEventListener('keyup', handleKeyUp);
                                    }, 500);
                                    return;
                                }
                            }
                        } else if (item.type === 'good') {
                            // 좋은 아이템
                            if (item.score) {
                                game.score += item.score;
                                setScore(game.score);
                            }
                            if (item.hp && game.hp < 5) {
                                game.hp += item.hp;
                                setHp(game.hp);
                            }
                            if (item.effect === 'shield') {
                                game.effects.shield = 180; // 3초
                            }
                            if (item.effect === 'slow') {
                                game.effects.slow = 300; // 5초
                            }
                            if (item.random) {
                                // 랜덤 보너스
                                if (Math.random() > 0.5) {
                                    game.score += 50;
                                    setScore(game.score);
                                } else if (game.hp < 5) {
                                    game.hp++;
                                    setHp(game.hp);
                                }
                            }

                            createParticles(item.x, item.y, '#fbbf24', item.emoji);
                            if (soundManager.current) {
                                soundManager.current.playCoin();
                            }
                        } else if (item.type === 'bad') {
                            // 나쁜 아이템
                            if (game.effects.shield > 0) {
                                // 쉴드 상태면 데미지 무시
                                game.effects.shield = 0;
                                createParticles(item.x, item.y, '#00aaff', '🛡️');
                                if (soundManager.current) {
                                    soundManager.current.playItem();
                                }
                            } else if (game.effects.invincible > 0) {
                                // 무적 상태면 데미지 무시
                                createParticles(item.x, item.y, '#fbbf24', '✨');
                            } else {
                                // 데미지 처리
                                if (item.damage) {
                                    game.hp -= item.damage;
                                    setHp(game.hp);
                                    game.effects.invincible = 60; // 1초 무적
                                    
                                    if (game.hp <= 0) {
                                        game.isRunning = false;
                                        if (timerRef.current) {
                                            clearInterval(timerRef.current);
                                        }
                                        setTimeout(() => {
                                            setGameState('gameover');
                                            if (currentUser) {
                                                setShowNicknameInput(true);
                                            }
                                            window.removeEventListener('keydown', handleKeyDown);
                                            window.removeEventListener('keyup', handleKeyUp);
                                        }, 500);
                                        return;
                                    }
                                }
                                if (item.scoreDeduct) {
                                    game.score = Math.max(0, game.score - item.scoreDeduct);
                                    setScore(game.score);
                                }
                                if (item.effect === 'shake') {
                                    game.effects.shake = 120; // 2초
                                }

                                createParticles(item.x, item.y, '#ef4444', item.emoji);
                                if (soundManager.current) {
                                    soundManager.current.playHit();
                                }
                            }
                        }

                        if (shouldRemove) {
                            game.fallingItems.splice(index, 1);
                        }
                    }

                    // 화면 밖으로 나간 아이템 제거
                    if (item.y > canvas.height) {
                        game.fallingItems.splice(index, 1);
                    }
                });
            };

            // 게임 루프
            const gameLoop = () => {
                if (!game.isRunning) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                drawBackground();
                drawFallingItems();
                drawParticles();
                drawPlayer();
                drawUI();

                update();

                requestAnimationFrame(gameLoop);
            };

            gameLoop();

            return () => {
                game.isRunning = false;
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
            };
        }, 0);
    };

    const resetGame = () => {
        setGameState('menu');
        setScore(0);
        setHp(3);
        setTimeLeft(0);
        setHitRestaurants({});
        setActiveEffects({ shield: 0, slow: 0, target: false });
        setShowNicknameInput(false);
    };

    const handleSaveScore = async () => {
        const success = await saveScore(score, timeLeft, currentUser.name);
        if (success) {
            setShowNicknameInput(false);
            setShowSuccessModal(true);
            // 3초 후 자동으로 모달 닫기
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 3000);
        } else {
            alert('점수 저장에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 가장 많이 맞은 식당 찾기
    const getWinnerRestaurant = () => {
        if (Object.keys(hitRestaurants).length === 0) return null;
        
        let maxCount = 0;
        let winnerId = null;
        
        Object.entries(hitRestaurants).forEach(([id, count]) => {
            if (count > maxCount) {
                maxCount = count;
                winnerId = id;
            }
        });

        return restaurants.find(r => r._id === winnerId);
    };

    const winnerRestaurant = gameState === 'gameover' ? getWinnerRestaurant() : null;
    const sortedHits = Object.entries(hitRestaurants)
        .map(([id, count]) => ({
            restaurant: restaurants.find(r => r._id === id),
            count: count,
            score: count * 30
        }))
        .sort((a, b) => b.count - a.count);

    return (
        <div className={styles.container}>
            <Head>
                <title>똥피하기 게임 💩 - 점심메뉴 선택기</title>
                <meta name="description" content="식당 똥을 맞춰서 오늘의 점심을 선택하세요!" />
            </Head>

            <div className={styles.gameWrapper}>
                {gameState !== 'playing' && (
                    <div className={styles.topControls}>
                        <button 
                            className={styles.controlBtn}
                            onClick={() => router.push('/')}
                        >
                            🏠 홈
                        </button>
                        <button 
                            className={styles.controlBtn}
                            onClick={toggleSound}
                        >
                            {soundEnabled ? '🔊' : '🔇'} {soundEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                )}

                {gameState === 'menu' && (
                    <div className={styles.menu}>
                        <div className={styles.menuContent}>
                            <h1 className={styles.title}>
                                <span className={styles.emoji}>💩</span>
                                똥피하기 게임
                                <span className={styles.emoji}>🏃</span>
                            </h1>
                            <p className={styles.subtitle}>
                                식당 똥을 피하면서 아이템을 먹으세요!
                            </p>

                            <div className={styles.instructions}>
                                <h3>🎮 게임 방법</h3>
                                <div className={styles.instructionGrid}>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>⬅️➡️</span>
                                        <p>화살표 키로 좌우 이동</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>💩</span>
                                        <p>식당 똥 맞으면 -1 HP</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>⭐</span>
                                        <p>별/코인 먹으면 +10점</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>💯</span>
                                        <p>100점 아이템 +100점</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>❤️</span>
                                        <p>하트로 생명 회복</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>🛡️</span>
                                        <p>쉴드로 보호 (1회)</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>⚡</span>
                                        <p>번개로 슬로우 모션</p>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.instructionEmoji}>💣</span>
                                        <p>폭탄 피해야 함! -2 HP</p>
                                    </div>
                                </div>

                                <div className={styles.ruleBox}>
                                    <h4>🎯 게임 규칙</h4>
                                    <p>💩 <strong>식당 똥에 맞으면 하트 -1</strong></p>
                                    <p>❤️ <strong>하트가 0이 되면</strong> 마지막 맞은 식당이 당첨!</p>
                                    <p>⭐ 좋은 아이템을 먹으면 점수 획득!</p>
                                    <p>💣 나쁜 아이템도 하트 감소!</p>
                                    <p>🏆 시간 제한 없음! 난이도는 계속 올라갑니다!</p>
                                </div>
                            </div>

                            <button 
                                className={styles.startButton}
                                onClick={startGame}
                            >
                                게임 시작
                            </button>

                            {/* 메인 메뉴 순위표 */}
                            <div className={styles.menuLeaderboard}>
                                <h3 className={styles.menuLeaderboardTitle}>
                                    🏆 TOP 3 순위표
                                </h3>
                                {topScores.length > 0 ? (
                                    <div className={styles.miniScoresTable}>
                                        {topScores.slice(0, 3).map((scoreData, index) => (
                                            <div 
                                                key={scoreData._id} 
                                                className={`${styles.miniTableRow} ${styles[`miniRank${index + 1}`]}`}
                                            >
                                                <div className={styles.miniRankCol}>
                                                    {index === 0 && '🥇'}
                                                    {index === 1 && '🥈'}
                                                    {index === 2 && '🥉'}
                                                </div>
                                                <div className={styles.miniNicknameCol}>
                                                    {scoreData.nickname}
                                                </div>
                                                <div className={styles.miniScoreCol}>
                                                    {scoreData.score.toLocaleString()}점
                                                </div>
                                                <div className={styles.miniTimeCol}>
                                                    {scoreData.metadata?.survivalTime || 0}초
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.noScores}>
                                        <p>아직 기록된 점수가 없습니다</p>
                                        <p>첫 번째 기록의 주인공이 되어보세요! 🎮</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className={styles.gameArea}>
                        <div className={styles.gameHeader}>
                            <div className={styles.gameInfo}>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>경과 시간</span>
                                    <span className={styles.value}>{timeLeft}초</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>점수</span>
                                    <span className={styles.value}>{score}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>생명</span>
                                    <span className={styles.value}>
                                        {'❤️'.repeat(Math.max(0, hp))}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.gameControls}>
                                <button 
                                    className={styles.pauseBtn}
                                    onClick={toggleSound}
                                >
                                    {soundEnabled ? '🔊' : '🔇'}
                                </button>
                            </div>
                        </div>
                        <canvas ref={canvasRef} className={styles.canvas}></canvas>
                        <div className={styles.gameHint}>
                            💡 ←→ 키로 이동 | 시간 무제한! 난이도가 계속 올라갑니다! 💩 원하는 식당 똥을 마지막에 맞추세요!
                        </div>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className={styles.gameOver}>
                        <div className={styles.gameOverContent}>
                            <h2 className={styles.gameOverTitle}>🎉 게임 종료!</h2>
                            
                            <div className={styles.finalScore}>
                                <p>최종 점수</p>
                                <div className={styles.scoreDisplay}>{score}</div>
                            </div>

                            {winnerRestaurant ? (
                                <div className={styles.winnerSection}>
                                    <h3 className={styles.winnerTitle}>
                                        💩 마지막에 맞은 식당 = 오늘의 당첨! 🎉
                                    </h3>
                                    <div className={styles.winnerCard}>
                                        <img 
                                            src={winnerRestaurant.image}
                                            alt={winnerRestaurant.name}
                                            className={styles.winnerImage}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                            }}
                                        />
                                        <div className={styles.winnerInfo}>
                                            <h2>{winnerRestaurant.name}</h2>
                                            <p className={styles.category}>{winnerRestaurant.category}</p>
                                            <p className={styles.distance}>🚶‍♂️ {winnerRestaurant.distance}</p>
                                            {winnerRestaurant.description && (
                                                <p className={styles.description}>{winnerRestaurant.description}</p>
                                            )}
                                            <p className={styles.winnerMessage}>
                                                💩 하트가 0이 되는 순간 맞은 식당입니다!<br/>
                                                오늘 점심은 여기로 가세요! 🍽️
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.successSection}>
                                    <h3 className={styles.successTitle}>
                                        🎉 생존 성공! 🎉
                                    </h3>
                                    <div className={styles.successCard}>
                                        <p className={styles.successMessage}>
                                            생명이 다 소진되었습니다!<br/>
                                            하지만 식당 똥을 맞지 못했습니다!
                                        </p>
                                        <p className={styles.successScore}>
                                            생존 시간: <strong>{timeLeft}초</strong><br/>
                                            최종 점수: <strong>{score}점</strong>
                                        </p>
                                        <p className={styles.successHint}>
                                            💡 식당을 선택하려면 하트가 0될 때 원하는 식당 똥에 맞으세요!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {showNicknameInput && currentUser && (
                                <div className={styles.scoreSubmit}>
                                    <h4>🏆 점수를 기록하시겠습니까?</h4>
                                    <p className={styles.scoreInfo}>
                                        <strong>{currentUser.name}</strong>님의 점수로 저장됩니다.
                                    </p>
                                    <div className={styles.submitButtons}>
                                        <button 
                                            className={styles.saveButton}
                                            onClick={handleSaveScore}
                                        >
                                            저장하기
                                        </button>
                                        <button 
                                            className={styles.skipButton}
                                            onClick={() => setShowNicknameInput(false)}
                                        >
                                            저장 안함
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.gameOverButtons}>
                                <button 
                                    className={styles.retryButton}
                                    onClick={startGame}
                                >
                                    다시 도전
                                </button>
                                <button 
                                    className={styles.menuButton}
                                    onClick={resetGame}
                                >
                                    메뉴로
                                </button>
                                <button 
                                    className={styles.homeButton}
                                    onClick={() => router.push('/')}
                                >
                                    홈으로
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 점수 저장 성공 모달 */}
                {showSuccessModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
                        <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.successIcon}>🎉</div>
                            <h3 className={styles.successModalTitle}>점수 저장 완료!</h3>
                            <p className={styles.successModalMessage}>
                                순위표에 기록되었습니다!
                            </p>
                            <div className={styles.successModalScore}>
                                <span className={styles.modalScoreLabel}>최종 점수</span>
                                <span className={styles.modalScoreValue}>{score}점</span>
                            </div>
                            <button 
                                className={styles.successModalButton}
                                onClick={() => setShowSuccessModal(false)}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

