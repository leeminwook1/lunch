import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Game.module.css';
import getSoundManager from '../utils/sounds';

export default function RunnerGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover', 'winner', 'leaderboard'
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [topRestaurant, setTopRestaurant] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [topScores, setTopScores] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [showNicknameInput, setShowNicknameInput] = useState(false);
    const [nickname, setNickname] = useState('');
    const gameRef = useRef(null);
    const soundManager = useRef(null);

    // 최다 방문 식당 가져오기
    const fetchTopRestaurant = async () => {
        try {
            const response = await fetch('/api/stats');
            
            // 응답이 정상이 아니면 무시
            if (!response.ok) {
                console.warn('식당 데이터를 불러올 수 없습니다. 게임은 정상적으로 진행됩니다.');
                setIsLoading(false);
                return;
            }
            
            const data = await response.json();
            
            // popularRestaurants가 올바른 필드명입니다
            if (data.success && data.data.popularRestaurants && data.data.popularRestaurants.length > 0) {
                setTopRestaurant(data.data.popularRestaurants[0]);
                console.log('식당 데이터 로드 성공:', data.data.popularRestaurants[0]);
            } else {
                console.warn('식당 데이터가 없습니다.');
            }
        } catch (error) {
            console.warn('식당 데이터 로드 실패. 게임은 정상적으로 진행됩니다.', error);
            // 에러가 발생해도 게임은 계속 진행
        } finally {
            setIsLoading(false);
        }
    };

    // 게임 초기화 및 최다 방문 식당 로드
    useEffect(() => {
        // 사운드 매니저 초기화
        soundManager.current = getSoundManager();

        // 하이스코어 로드
        const savedHighScore = localStorage.getItem('runnerHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore));
        }

        // 사운드 설정 로드
        const savedSoundEnabled = localStorage.getItem('runnerSoundEnabled');
        if (savedSoundEnabled !== null) {
            const enabled = savedSoundEnabled === 'true';
            setSoundEnabled(enabled);
            if (soundManager.current) {
                soundManager.current.setEnabled(enabled);
            }
        }

        // 최다 방문 식당 가져오기
        fetchTopRestaurant();
        
        // 현재 사용자 정보 로드
        loadCurrentUser();
        
        // 상위 점수 로드
        fetchTopScores();
    }, []);

    // 현재 사용자 로드
    const loadCurrentUser = () => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setCurrentUser(user);
                setNickname(user.name || '');
            } catch (error) {
                console.error('사용자 정보 로드 실패:', error);
            }
        }
    };

    // 상위 점수 가져오기
    const fetchTopScores = async () => {
        try {
            const response = await fetch('/api/game-scores/top?limit=10');
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

    // 점수 저장
    const saveScore = async (finalScore, userNickname) => {
        if (!currentUser) {
            console.error('사용자 정보가 없습니다');
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
                    score: finalScore
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 상위 점수 새로고침
                    await fetchTopScores();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('점수 저장 실패:', error);
            return false;
        }
    };

    // 사운드 토글
    const toggleSound = () => {
        const newSoundEnabled = !soundEnabled;
        setSoundEnabled(newSoundEnabled);
        localStorage.setItem('runnerSoundEnabled', newSoundEnabled.toString());
        if (soundManager.current) {
            soundManager.current.setEnabled(newSoundEnabled);
        }
    };

    const startGame = () => {
        // AudioContext 재개 (사용자 상호작용)
        if (soundManager.current) {
            soundManager.current.resume();
        }

        setGameState('playing');
        setScore(0);
        
        // 다음 렌더링 후 캔버스 초기화
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) {
                console.error('Canvas element not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Canvas context not available');
                return;
            }

            canvas.width = 800;
            canvas.height = 500;

        // 게임 객체
        const game = {
            player: {
                x: 100,
                y: 350,
                width: 50,
                height: 50,
                velocityY: 0,
                gravity: 0.8,
                jumpPower: -15,
                doubleJumpPower: -12, // 더블 점프는 약간 낮게
                isJumping: false,
                jumpCount: 0, // 점프 횟수 (최대 2)
                maxJumps: 2, // 최대 점프 횟수
                isSliding: false,
                slideTimer: 0,
                slideHeight: 30, // 슬라이드 시 높이
                normalHeight: 50,
                hasShield: false,
                shieldTimer: 0,
                speedBoost: 0, // 속도 부스트 타이머
                rotation: 0
            },
            obstacles: [],
            coins: [],
            items: [], // 새로운 아이템 배열
            particles: [],
            background: {
                x1: 0,
                x2: canvas.width,
                speed: 3
            },
            score: 0,
            frame: 0,
            isRunning: true,
            difficulty: 1,
            obstacleTimer: 0,
            coinTimer: 0,
            itemTimer: 0
        };

        gameRef.current = game;

        // 키보드 이벤트
        const handleKeyPress = (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                // 점프 (더블 점프 포함)
                if (game.player.jumpCount < game.player.maxJumps) {
                    if (game.player.jumpCount === 0) {
                        // 첫 번째 점프
                        game.player.velocityY = game.player.jumpPower;
                        if (soundManager.current) {
                            soundManager.current.playJump();
                        }
                    } else {
                        // 더블 점프
                        game.player.velocityY = game.player.doubleJumpPower;
                        if (soundManager.current) {
                            soundManager.current.playDoubleJump();
                        }
                    }
                    game.player.jumpCount++;
                    game.player.isJumping = true;
                    createJumpParticles();
                }
            } else if (e.code === 'ArrowDown') {
                // 슬라이드 (공중에서만 가능)
                if (game.player.isJumping && game.player.jumpCount > 0) {
                    game.player.velocityY = Math.max(game.player.velocityY, 10); // 빠르게 낙하
                }
            }
        };

        // 마우스/터치 이벤트
        const handleClick = () => {
            // 점프 (더블 점프 포함)
            if (game.player.jumpCount < game.player.maxJumps) {
                if (game.player.jumpCount === 0) {
                    // 첫 번째 점프
                    game.player.velocityY = game.player.jumpPower;
                    if (soundManager.current) {
                        soundManager.current.playJump();
                    }
                } else {
                    // 더블 점프
                    game.player.velocityY = game.player.doubleJumpPower;
                    if (soundManager.current) {
                        soundManager.current.playDoubleJump();
                    }
                }
                game.player.jumpCount++;
                game.player.isJumping = true;
                createJumpParticles();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        canvas.addEventListener('click', handleClick);

        // 파티클 생성
        const createJumpParticles = () => {
            for (let i = 0; i < 10; i++) {
                game.particles.push({
                    x: game.player.x + game.player.width / 2,
                    y: game.player.y + game.player.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: Math.random() * 3,
                    radius: Math.random() * 3 + 2,
                    life: 30,
                    color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`
                });
            }
        };

        const createCollectParticles = (x, y) => {
            for (let i = 0; i < 20; i++) {
                game.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    radius: Math.random() * 4 + 2,
                    life: 40,
                    color: `hsl(${Math.random() * 60 + 40}, 80%, 60%)`
                });
            }
        };

        const createItemParticles = (x, y, color) => {
            for (let i = 0; i < 15; i++) {
                game.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    radius: Math.random() * 3 + 2,
                    life: 30,
                    color: color
                });
            }
        };

        // 장애물 생성
        const createObstacle = () => {
            const types = ['cactus', 'rock', 'spike'];
            const type = types[Math.floor(Math.random() * types.length)];
            const height = type === 'spike' ? 40 : 50 + Math.random() * 30;
            
            game.obstacles.push({
                x: canvas.width + 50,
                y: 400 - height,
                width: 40,
                height: height,
                type: type,
                color: type === 'spike' ? '#ff3366' : type === 'rock' ? '#888888' : '#22c55e'
            });
        };

        // 코인 생성
        const createCoin = () => {
            const yPositions = [300, 250, 200, 350];
            game.coins.push({
                x: canvas.width + 50,
                y: yPositions[Math.floor(Math.random() * yPositions.length)],
                radius: 15,
                collected: false,
                rotation: 0
            });
        };

        // 아이템 생성
        const createItem = () => {
            const itemTypes = ['boost', 'shield'];
            const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            const yPositions = [300, 250, 200];
            
            game.items.push({
                x: canvas.width + 50,
                y: yPositions[Math.floor(Math.random() * yPositions.length)],
                radius: 12,
                type: type,
                collected: false,
                rotation: 0,
                color: type === 'boost' ? '#00ff00' : '#00aaff'
            });
        };

        // 배경 그리기
        const drawBackground = () => {
            // 그라데이션 하늘
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#4f46e5');
            gradient.addColorStop(0.5, '#7c3aed');
            gradient.addColorStop(1, '#db2777');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 별들
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 50; i++) {
                const x = (game.frame * 0.5 + i * 30) % canvas.width;
                const y = (i * 17) % 300;
                const size = (i % 3) + 1;
                ctx.fillRect(x, y, size, size);
            }

            // 땅
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 400, canvas.width, 100);
            
            // 땅의 디테일
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            for (let i = 0; i < canvas.width; i += 50) {
                const x = (i - (game.frame * 3) % 50);
                ctx.beginPath();
                ctx.moveTo(x, 400);
                ctx.lineTo(x + 25, 410);
                ctx.lineTo(x + 50, 400);
                ctx.stroke();
            }
        };

        // 플레이어 그리기
        const drawPlayer = () => {
            ctx.save();
            ctx.translate(game.player.x + game.player.width / 2, game.player.y + game.player.height / 2);
            
            // 점프 시 회전
            if (game.player.isJumping) {
                game.player.rotation = Math.min(game.player.rotation + 0.1, Math.PI / 8);
            } else {
                game.player.rotation = Math.max(game.player.rotation - 0.1, 0);
            }
            ctx.rotate(game.player.rotation);

            // 쉴드 효과
            if (game.player.hasShield) {
                ctx.strokeStyle = '#00aaff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#00aaff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, game.player.width / 2 + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // 속도 부스트 효과
            if (game.player.speedBoost > 0) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 5;
                for (let i = 0; i < 3; i++) {
                    ctx.globalAlpha = 0.3 - i * 0.1;
                    ctx.beginPath();
                    ctx.arc(0, 0, game.player.width / 2 + i * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            }

            // 캐릭터 몸체 (음식 아이콘처럼)
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, game.player.width / 2);
            gradient.addColorStop(0, '#fbbf24');
            gradient.addColorStop(1, '#f59e0b');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, game.player.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // 눈
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-10, -8, 4, 0, Math.PI * 2);
            ctx.arc(10, -8, 4, 0, Math.PI * 2);
            ctx.fill();

            // 입
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 5, 15, 0.2, Math.PI - 0.2);
            ctx.stroke();

            ctx.restore();

            // 그림자
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(game.player.x + game.player.width / 2, 395, 25, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        };

        // 장애물 그리기
        const drawObstacles = () => {
            game.obstacles.forEach(obstacle => {
                ctx.save();
                
                if (obstacle.type === 'spike') {
                    // 가시
                    ctx.fillStyle = obstacle.color;
                    ctx.beginPath();
                    const spikes = 5;
                    for (let i = 0; i <= spikes; i++) {
                        const x = obstacle.x + (obstacle.width / spikes) * i;
                        const y = i % 2 === 0 ? obstacle.y : obstacle.y + obstacle.height;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    
                    // 그림자 효과
                    ctx.shadowColor = obstacle.color;
                    ctx.shadowBlur = 10;
                    ctx.fill();
                } else if (obstacle.type === 'rock') {
                    // 바위
                    ctx.fillStyle = obstacle.color;
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
                    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.7);
                    ctx.lineTo(obstacle.x + obstacle.width * 0.8, obstacle.y + obstacle.height);
                    ctx.lineTo(obstacle.x + obstacle.width * 0.2, obstacle.y + obstacle.height);
                    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 하이라이트
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.beginPath();
                    ctx.arc(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.3, 8, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // 선인장
                    ctx.fillStyle = obstacle.color;
                    // 몸통
                    ctx.fillRect(obstacle.x + 10, obstacle.y, 20, obstacle.height);
                    // 왼쪽 팔
                    ctx.fillRect(obstacle.x, obstacle.y + 15, 15, 20);
                    // 오른쪽 팔
                    ctx.fillRect(obstacle.x + 25, obstacle.y + 15, 15, 20);
                }
                
                ctx.restore();
            });
        };

        // 코인 그리기
        const drawCoins = () => {
            game.coins.forEach(coin => {
                if (coin.collected) return;

                ctx.save();
                ctx.translate(coin.x, coin.y);
                
                // 회전 애니메이션
                coin.rotation += 0.05;
                const scale = Math.abs(Math.sin(coin.rotation));
                ctx.scale(scale, 1);

                // 외곽 링
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
                gradient.addColorStop(0, '#fef08a');
                gradient.addColorStop(0.7, '#fbbf24');
                gradient.addColorStop(1, '#f59e0b');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
                ctx.fill();

                // 내부 원
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(0, 0, coin.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();

                // 별 모양
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);

                ctx.restore();

                // 빛나는 효과
                ctx.save();
                ctx.globalAlpha = 0.3 + Math.sin(game.frame * 0.1) * 0.2;
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, coin.radius * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        };

        // 아이템 그리기
        const drawItems = () => {
            game.items.forEach(item => {
                if (item.collected) return;

                ctx.save();
                ctx.translate(item.x, item.y);
                
                // 회전 애니메이션
                item.rotation += 0.08;
                ctx.rotate(item.rotation);

                // 아이템 타입에 따른 그리기
                if (item.type === 'boost') {
                    // 속도 부스트 - 녹색 다이아몬드
                    ctx.fillStyle = item.color;
                    ctx.beginPath();
                    ctx.moveTo(0, -item.radius);
                    ctx.lineTo(item.radius, 0);
                    ctx.lineTo(0, item.radius);
                    ctx.lineTo(-item.radius, 0);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('⚡', 0, 0);
                } else if (item.type === 'shield') {
                    // 쉴드 - 파란색 원
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, item.radius);
                    gradient.addColorStop(0, '#88ddff');
                    gradient.addColorStop(1, item.color);
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, item.radius * 0.7, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();

                // 빛나는 효과
                ctx.save();
                ctx.globalAlpha = 0.4 + Math.sin(game.frame * 0.15) * 0.3;
                ctx.fillStyle = item.color;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.radius * 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        };

        // 파티클 그리기
        const drawParticles = () => {
            game.particles.forEach((particle, index) => {
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.life / 40;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                // 파티클 업데이트
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.2; // 중력
                particle.life--;

                if (particle.life <= 0) {
                    game.particles.splice(index, 1);
                }
            });
        };

        // UI 그리기
        const drawUI = () => {
            // 점수
            ctx.save();
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(`점수: ${Math.floor(game.score)}`, 20, 50);
            ctx.fillText(`점수: ${Math.floor(game.score)}`, 20, 50);

            // 난이도
            const difficulty = 1 + Math.floor(game.score / 100);
            ctx.font = 'bold 20px Arial';
            ctx.strokeText(`난이도: ${difficulty}`, 20, 85);
            ctx.fillText(`난이도: ${difficulty}`, 20, 85);

            // 더블 점프 표시
            ctx.font = 'bold 16px Arial';
            const jumpsRemaining = game.player.maxJumps - game.player.jumpCount;
            ctx.fillStyle = jumpsRemaining > 0 ? '#fff' : '#ff6666';
            ctx.strokeText(`점프: ${jumpsRemaining}/${game.player.maxJumps}`, 20, 115);
            ctx.fillText(`점프: ${jumpsRemaining}/${game.player.maxJumps}`, 20, 115);

            // 아이템 상태 표시
            let statusY = 145;
            if (game.player.speedBoost > 0) {
                ctx.fillStyle = '#00ff00';
                const timeLeft = Math.ceil(game.player.speedBoost / 60);
                ctx.strokeText(`⚡ 속도 부스트: ${timeLeft}초`, 20, statusY);
                ctx.fillText(`⚡ 속도 부스트: ${timeLeft}초`, 20, statusY);
                statusY += 25;
            }
            if (game.player.hasShield) {
                ctx.fillStyle = '#00aaff';
                const timeLeft = Math.ceil(game.player.shieldTimer / 60);
                ctx.strokeText(`🛡️ 쉴드: ${timeLeft}초`, 20, statusY);
                ctx.fillText(`🛡️ 쉴드: ${timeLeft}초`, 20, statusY);
            }
            
            ctx.restore();
        };

        // 충돌 감지
        const checkCollision = (rect1, rect2) => {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        };

        // 게임 업데이트
        const update = () => {
            if (!game.isRunning) return;

            game.frame++;

            // 플레이어 업데이트
            game.player.velocityY += game.player.gravity;
            game.player.y += game.player.velocityY;

            // 땅 충돌
            if (game.player.y >= 350) {
                game.player.y = 350;
                game.player.velocityY = 0;
                game.player.isJumping = false;
                game.player.jumpCount = 0; // 점프 횟수 리셋
            }

            // 점수 증가
            game.score += 0.1 * game.difficulty;
            game.difficulty = 1 + game.score / 500;

            // 아이템 타이머 업데이트
            if (game.player.speedBoost > 0) {
                game.player.speedBoost--;
            }
            if (game.player.shieldTimer > 0) {
                game.player.shieldTimer--;
                if (game.player.shieldTimer === 0) {
                    game.player.hasShield = false;
                }
            }

            // 속도 설정
            const baseSpeed = 5;
            const speedMultiplier = game.player.speedBoost > 0 ? 0.7 : 1; // 부스터 활성화 시 느려짐

            // 장애물 생성
            game.obstacleTimer++;
            if (game.obstacleTimer > 100 / game.difficulty) {
                createObstacle();
                game.obstacleTimer = 0;
            }

            // 코인 생성
            game.coinTimer++;
            if (game.coinTimer > 150) {
                createCoin();
                game.coinTimer = 0;
            }

            // 아이템 생성
            game.itemTimer++;
            if (game.itemTimer > 300) {
                createItem();
                game.itemTimer = 0;
            }

            // 장애물 업데이트 (역순으로 순회하여 splice 안전하게 사용)
            for (let i = game.obstacles.length - 1; i >= 0; i--) {
                const obstacle = game.obstacles[i];
                obstacle.x -= baseSpeed * game.difficulty * speedMultiplier;

                // 화면 밖으로 나간 장애물 제거 (충돌 체크 전에 먼저 처리)
                if (obstacle.x + obstacle.width < 0) {
                    game.obstacles.splice(i, 1);
                    game.score += 10;
                    continue;
                }

                // 충돌 체크
                if (checkCollision(game.player, obstacle)) {
                    if (game.player.hasShield) {
                        // 쉴드가 있으면 한 번 무시하고 장애물 제거
                        game.player.hasShield = false;
                        game.player.shieldTimer = 0;
                        
                        // 쉴드 파괴 파티클
                        createItemParticles(
                            game.player.x + game.player.width / 2,
                            game.player.y + game.player.height / 2,
                            '#00aaff'
                        );
                        
                        // 해당 장애물 제거 (같은 프레임에서 다시 충돌 방지)
                        game.obstacles.splice(i, 1);
                        
                        // 사운드 효과
                        if (soundManager.current) {
                            soundManager.current.playItem(); // 쉴드 사용 사운드
                        }
                        
                        // 점수 보너스 (장애물 파괴 보너스)
                        game.score += 20;
                        
                        // 쉴드 사용 후 다음 프레임으로
                        continue;
                    } else {
                        // 쉴드가 없으면 게임 종료
                        game.isRunning = false;
                        if (soundManager.current) {
                            soundManager.current.playHit();
                        }
                        endGame();
                        break; // 게임 종료 시 루프 중단
                    }
                }
            }

            // 코인 업데이트
            game.coins.forEach((coin, index) => {
                coin.x -= baseSpeed * game.difficulty * speedMultiplier;

                // 코인 수집
                const dist = Math.hypot(
                    game.player.x + game.player.width / 2 - coin.x,
                    game.player.y + game.player.height / 2 - coin.y
                );
                
                if (dist < game.player.width / 2 + coin.radius && !coin.collected) {
                    coin.collected = true;
                    game.score += 50;
                    createCollectParticles(coin.x, coin.y);
                    if (soundManager.current) {
                        soundManager.current.playCoin();
                    }
                }

                // 화면 밖으로 나간 코인 제거
                if (coin.x + coin.radius < 0) {
                    game.coins.splice(index, 1);
                }
            });

            // 아이템 업데이트
            game.items.forEach((item, index) => {
                item.x -= baseSpeed * game.difficulty * speedMultiplier;

                // 아이템 수집
                const dist = Math.hypot(
                    game.player.x + game.player.width / 2 - item.x,
                    game.player.y + game.player.height / 2 - item.y
                );
                
                if (dist < game.player.width / 2 + item.radius && !item.collected) {
                    item.collected = true;
                    createItemParticles(item.x, item.y, item.color);
                    if (soundManager.current) {
                        soundManager.current.playItem();
                    }
                    
                    if (item.type === 'boost') {
                        // 속도 부스트 (장애물이 느려짐)
                        game.player.speedBoost = 300; // 5초 (60fps 기준)
                    } else if (item.type === 'shield') {
                        // 쉴드 (1회 충돌 방지)
                        game.player.hasShield = true;
                        game.player.shieldTimer = 600; // 10초
                    }
                }

                // 화면 밖으로 나간 아이템 제거
                if (item.x + item.radius < 0) {
                    game.items.splice(index, 1);
                }
            });
        };

        // 게임 루프
        const gameLoop = () => {
            if (!game.isRunning) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            drawBackground();
            drawParticles();
            drawPlayer();
            drawObstacles();
            drawCoins();
            drawItems();
            drawUI();
            
            update();
            
            requestAnimationFrame(gameLoop);
        };

        const endGame = () => {
            const finalScore = Math.floor(game.score);
            setScore(finalScore);
            
            // 하이스코어 업데이트
            if (finalScore > highScore) {
                setHighScore(finalScore);
                localStorage.setItem('runnerHighScore', finalScore.toString());
            }

            // 점수 저장 여부 확인 (사용자가 로그인되어 있으면 닉네임 입력 표시)
            if (currentUser && finalScore > 0) {
                setShowNicknameInput(true);
            }

            // 목표 점수 달성 체크 (예: 1000점 이상)
            // topRestaurant가 없어도 1000점 이상이면 승리로 처리
            if (finalScore >= 1000) {
                setGameState('winner');
                if (soundManager.current) {
                    setTimeout(() => soundManager.current.playWin(), 500);
                }
            } else {
                setGameState('gameover');
                if (soundManager.current) {
                    setTimeout(() => soundManager.current.playGameOver(), 300);
                }
            }

            // 이벤트 리스너 제거
            window.removeEventListener('keydown', handleKeyPress);
            canvas.removeEventListener('click', handleClick);
        };

        gameLoop();

        return () => {
            game.isRunning = false;
            window.removeEventListener('keydown', handleKeyPress);
            canvas.removeEventListener('click', handleClick);
        };
        }, 0); // setTimeout 종료
    };

    const resetGame = () => {
        setGameState('menu');
        setScore(0);
        setShowNicknameInput(false);
    };

    const handleSaveScore = async () => {
        if (!nickname.trim()) {
            alert('닉네임을 입력해주세요');
            return;
        }

        const success = await saveScore(score, nickname);
        if (success) {
            setShowNicknameInput(false);
            alert('점수가 저장되었습니다!');
        } else {
            alert('점수 저장에 실패했습니다');
        }
    };

    const viewLeaderboard = () => {
        setGameState('leaderboard');
        fetchTopScores();
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Head>
                    <title>점심 러너 게임 🏃‍♂️</title>
                </Head>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>게임 로딩중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>점심 러너 게임 🏃‍♂️</title>
                <meta name="description" content="장애물을 피하고 코인을 모아 당첨 식당을 확인하세요!" />
            </Head>

            <div className={styles.gameWrapper}>
                {/* 상단 컨트롤 버튼 */}
                {gameState !== 'playing' && (
                    <div className={styles.topControls}>
                        <button 
                            className={styles.controlBtn}
                            onClick={() => router.push('/')}
                            title="홈으로"
                        >
                            🏠 홈
                        </button>
                        <button 
                            className={styles.controlBtn}
                            onClick={toggleSound}
                            title={soundEnabled ? '사운드 끄기' : '사운드 켜기'}
                        >
                            {soundEnabled ? '🔊' : '🔇'} {soundEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                )}

                {gameState === 'menu' && (
                    <div className={styles.menu}>
                        <div className={styles.menuContent}>
                            <h1 className={styles.title}>
                                <span className={styles.emoji}>🍜</span>
                                점심 러너
                                <span className={styles.emoji}>🏃‍♂️</span>
                            </h1>
                            <p className={styles.subtitle}>
                                장애물을 피하고 코인을 모으세요!
                            </p>
                            
                            {topRestaurant ? (
                                <div className={styles.prizeInfo}>
                                    <div className={styles.prizeLabel}>🎁 1000점 달성 시 당첨!</div>
                                    <div className={styles.prizeRestaurant}>
                                        <img 
                                            src={topRestaurant.restaurant?.image || '/images/default-restaurant.jpg'} 
                                            alt={topRestaurant.restaurant?.name}
                                            className={styles.prizeImage}
                                        />
                                        <div className={styles.prizeDetails}>
                                            <h3>{topRestaurant.restaurant?.name}</h3>
                                            <p className={styles.visitCount}>
                                                방문 횟수: {topRestaurant.visitCount}회
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.prizeInfo} style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                                    <div className={styles.prizeLabel} style={{color: 'white'}}>
                                        🎮 목표: 1000점 달성!
                                    </div>
                                    <div className={styles.prizeRestaurant} style={{background: 'rgba(255, 255, 255, 0.95)'}}>
                                        <div className={styles.prizeDetails}>
                                            <h3>최고 점수에 도전하세요!</h3>
                                            <p className={styles.visitCount}>
                                                1000점을 달성하면 승리합니다! 🏆
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={styles.instructions}>
                                <h3>🎮 조작법</h3>
                                <p>스페이스바 / ↑ / 클릭: 점프 (더블 점프 가능!)</p>
                                <p>↓: 공중에서 빠르게 낙하</p>
                                <div className={styles.scoreInfo}>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>⭐</span>
                                        <span>코인: +50점</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>🚧</span>
                                        <span>장애물 통과: +10점</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>⚡</span>
                                        <span>속도 부스트: 장애물 속도 감소</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>🛡️</span>
                                        <span>실드: 1회 충돌 방지</span>
                                    </div>
                                </div>
                            </div>

                            {highScore > 0 && (
                                <div className={styles.highScore}>
                                    최고 기록: {highScore}점
                                </div>
                            )}

                            <button 
                                className={styles.startButton}
                                onClick={startGame}
                            >
                                게임 시작
                            </button>

                            {/* 메인 메뉴 순위표 */}
                            {topScores.length > 0 && (
                                <div className={styles.menuLeaderboard}>
                                    <h3 className={styles.menuLeaderboardTitle}>
                                        🏆 TOP 5 순위표
                                    </h3>
                                    <div className={styles.miniScoresTable}>
                                        {topScores.slice(0, 5).map((scoreData, index) => (
                                            <div 
                                                key={scoreData._id} 
                                                className={`${styles.miniTableRow} ${index < 3 ? styles[`miniRank${index + 1}`] : ''}`}
                                            >
                                                <div className={styles.miniRankCol}>
                                                    {index === 0 && '🥇'}
                                                    {index === 1 && '🥈'}
                                                    {index === 2 && '🥉'}
                                                    {index > 2 && (index + 1)}
                                                </div>
                                                <div className={styles.miniNicknameCol}>
                                                    {scoreData.nickname}
                                                </div>
                                                <div className={styles.miniScoreCol}>
                                                    {scoreData.score.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        className={styles.viewAllButton}
                                        onClick={viewLeaderboard}
                                    >
                                        전체 순위 보기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className={styles.gameArea}>
                        <div className={styles.gameControls}>
                            <button 
                                className={styles.pauseBtn}
                                onClick={() => router.push('/')}
                                title="홈으로"
                            >
                                🏠
                            </button>
                            <button 
                                className={styles.pauseBtn}
                                onClick={toggleSound}
                                title={soundEnabled ? '사운드 끄기' : '사운드 켜기'}
                            >
                                {soundEnabled ? '🔊' : '🔇'}
                            </button>
                        </div>
                        <canvas ref={canvasRef} className={styles.canvas}></canvas>
                        <div className={styles.gameHint}>
                            💡 스페이스바/클릭: 점프 (2번 가능) | ↓: 빠르게 낙하
                        </div>
                        
                        {/* 모바일용 터치 버튼 */}
                        <div className={styles.mobileControls}>
                            <button 
                                className={styles.jumpBtn}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    const game = gameRef.current;
                                    if (!game) return;
                                    
                                    if (game.player.jumpCount < game.player.maxJumps) {
                                        if (game.player.jumpCount === 0) {
                                            game.player.velocityY = game.player.jumpPower;
                                            if (soundManager.current) {
                                                soundManager.current.playJump();
                                            }
                                        } else {
                                            game.player.velocityY = game.player.doubleJumpPower;
                                            if (soundManager.current) {
                                                soundManager.current.playDoubleJump();
                                            }
                                        }
                                        game.player.jumpCount++;
                                        game.player.isJumping = true;
                                    }
                                }}
                            >
                                <div className={styles.btnIcon}>⬆️</div>
                                <div className={styles.btnLabel}>점프</div>
                            </button>
                            <button 
                                className={styles.slideBtn}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    const game = gameRef.current;
                                    if (!game) return;
                                    
                                    if (game.player.isJumping && game.player.jumpCount > 0) {
                                        game.player.velocityY = Math.max(game.player.velocityY, 10);
                                    }
                                }}
                            >
                                <div className={styles.btnIcon}>⬇️</div>
                                <div className={styles.btnLabel}>낙하</div>
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className={styles.gameOver}>
                        <div className={styles.gameOverContent}>
                            <h2 className={styles.gameOverTitle}>게임 종료!</h2>
                            <div className={styles.finalScore}>
                                <p>최종 점수</p>
                                <div className={styles.scoreDisplay}>{score}</div>
                            </div>
                            {score > highScore && (
                                <div className={styles.newRecord}>
                                    🎉 신기록 달성!
                                </div>
                            )}
                            <div className={styles.scoreTarget}>
                                <p>1000점을 달성하면 당첨 식당을 확인할 수 있어요!</p>
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill}
                                        style={{ width: `${Math.min((score / 1000) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className={styles.remaining}>
                                    {1000 - score > 0 ? `${1000 - score}점 남음` : '목표 달성!'}
                                </p>
                            </div>

                            {showNicknameInput && currentUser && (
                                <div className={styles.scoreSubmit}>
                                    <h4>🏆 점수를 기록하시겠습니까?</h4>
                                    <input
                                        type="text"
                                        className={styles.nicknameInput}
                                        placeholder="닉네임 입력"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        maxLength={20}
                                    />
                                    <div className={styles.submitButtons}>
                                        <button 
                                            className={styles.saveButton}
                                            onClick={handleSaveScore}
                                        >
                                            저장
                                        </button>
                                        <button 
                                            className={styles.skipButton}
                                            onClick={() => setShowNicknameInput(false)}
                                        >
                                            건너뛰기
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
                                    onClick={viewLeaderboard}
                                >
                                    순위표
                                </button>
                                <button 
                                    className={styles.menuButton}
                                    onClick={resetGame}
                                >
                                    메뉴로
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'winner' && (
                    <div className={styles.winner}>
                        <div className={styles.winnerContent}>
                            <div className={styles.celebration}>
                                <span className={styles.confetti}>🎊</span>
                                <span className={styles.confetti}>🎉</span>
                                <span className={styles.confetti}>🎊</span>
                            </div>
                            <h2 className={styles.winnerTitle}>축하합니다!</h2>
                            <div className={styles.winnerScore}>
                                최종 점수: {score}점
                            </div>
                            
                            {topRestaurant ? (
                                <div className={styles.winnerPrize}>
                                    <h3>🏆 당첨 식당 🏆</h3>
                                    <div className={styles.winnerRestaurant}>
                                        <img 
                                            src={topRestaurant.restaurant?.image || '/images/default-restaurant.jpg'} 
                                            alt={topRestaurant.restaurant?.name}
                                            className={styles.winnerImage}
                                        />
                                        <div className={styles.winnerDetails}>
                                            <h2>{topRestaurant.restaurant?.name}</h2>
                                            <p className={styles.winnerCategory}>
                                                {topRestaurant.restaurant?.category}
                                            </p>
                                            <p className={styles.winnerVisits}>
                                                총 방문 횟수: {topRestaurant.visitCount}회
                                            </p>
                                            <p className={styles.winnerMessage}>
                                                가장 많이 방문한 당신의 인기 맛집입니다! 🎯
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.winnerPrize}>
                                    <h3>🏆 목표 달성! 🏆</h3>
                                    <div className={styles.winnerRestaurant}>
                                        <div className={styles.winnerDetails}>
                                            <h2>🎮 완벽합니다!</h2>
                                            <p className={styles.winnerMessage}>
                                                1000점을 달성했습니다!<br/>
                                                당신은 진정한 러너입니다! 🏃‍♂️✨
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showNicknameInput && currentUser && (
                                <div className={styles.scoreSubmit}>
                                    <h4>🏆 점수를 기록하시겠습니까?</h4>
                                    <input
                                        type="text"
                                        className={styles.nicknameInput}
                                        placeholder="닉네임 입력"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        maxLength={20}
                                    />
                                    <div className={styles.submitButtons}>
                                        <button 
                                            className={styles.saveButton}
                                            onClick={handleSaveScore}
                                        >
                                            저장
                                        </button>
                                        <button 
                                            className={styles.skipButton}
                                            onClick={() => setShowNicknameInput(false)}
                                        >
                                            건너뛰기
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.winnerButtons}>
                                <button 
                                    className={styles.retryButton}
                                    onClick={startGame}
                                >
                                    다시 플레이
                                </button>
                                <button 
                                    className={styles.menuButton}
                                    onClick={viewLeaderboard}
                                >
                                    순위표
                                </button>
                                <button 
                                    className={styles.menuButton}
                                    onClick={resetGame}
                                >
                                    메뉴로
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'leaderboard' && (
                    <div className={styles.leaderboard}>
                        <div className={styles.leaderboardContent}>
                            <h2 className={styles.leaderboardTitle}>
                                🏆 순위표 🏆
                            </h2>
                            
                            <div className={styles.scoresTable}>
                                <div className={styles.tableHeader}>
                                    <div className={styles.rankCol}>순위</div>
                                    <div className={styles.nicknameCol}>닉네임</div>
                                    <div className={styles.scoreCol}>점수</div>
                                    <div className={styles.dateCol}>날짜</div>
                                </div>
                                
                                {topScores.length > 0 ? (
                                    <div className={styles.tableBody}>
                                        {topScores.map((scoreData, index) => (
                                            <div 
                                                key={scoreData._id} 
                                                className={`${styles.tableRow} ${index < 3 ? styles[`rank${index + 1}`] : ''}`}
                                            >
                                                <div className={styles.rankCol}>
                                                    {index === 0 && '🥇'}
                                                    {index === 1 && '🥈'}
                                                    {index === 2 && '🥉'}
                                                    {index > 2 && (index + 1)}
                                                </div>
                                                <div className={styles.nicknameCol}>
                                                    {scoreData.nickname}
                                                </div>
                                                <div className={styles.scoreCol}>
                                                    {scoreData.score.toLocaleString()}
                                                </div>
                                                <div className={styles.dateCol}>
                                                    {new Date(scoreData.createdAt).toLocaleDateString('ko-KR', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.noScores}>
                                        아직 기록된 점수가 없습니다
                                    </div>
                                )}
                            </div>

                            <div className={styles.leaderboardButtons}>
                                <button 
                                    className={styles.retryButton}
                                    onClick={startGame}
                                >
                                    게임 시작
                                </button>
                                <button 
                                    className={styles.menuButton}
                                    onClick={resetGame}
                                >
                                    메뉴로
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

