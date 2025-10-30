import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Game.module.css';
import getSoundManager from '../utils/sounds';

export default function RunnerGame() {
    const router = useRouter();
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameover', 'winner'
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [topRestaurant, setTopRestaurant] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
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
    }, []);

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
                isJumping: false,
                rotation: 0
            },
            obstacles: [],
            coins: [],
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
            coinTimer: 0
        };

        gameRef.current = game;

        // 키보드 이벤트
        const handleKeyPress = (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && !game.player.isJumping) {
                game.player.velocityY = game.player.jumpPower;
                game.player.isJumping = true;
                createJumpParticles();
                if (soundManager.current) {
                    soundManager.current.playJump();
                }
            }
        };

        // 마우스/터치 이벤트
        const handleClick = () => {
            if (!game.player.isJumping) {
                game.player.velocityY = game.player.jumpPower;
                game.player.isJumping = true;
                createJumpParticles();
                if (soundManager.current) {
                    soundManager.current.playJump();
                }
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
            }

            // 점수 증가
            game.score += 0.1 * game.difficulty;
            game.difficulty = 1 + game.score / 500;

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

            // 장애물 업데이트
            game.obstacles.forEach((obstacle, index) => {
                obstacle.x -= 5 * game.difficulty;

                // 충돌 체크
                if (checkCollision(game.player, obstacle)) {
                    game.isRunning = false;
                    if (soundManager.current) {
                        soundManager.current.playHit();
                    }
                    endGame();
                }

                // 화면 밖으로 나간 장애물 제거
                if (obstacle.x + obstacle.width < 0) {
                    game.obstacles.splice(index, 1);
                    game.score += 10;
                }
            });

            // 코인 업데이트
            game.coins.forEach((coin, index) => {
                coin.x -= 5 * game.difficulty;

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
                                <p>스페이스바 / ↑ / 클릭으로 점프</p>
                                <div className={styles.scoreInfo}>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>⭐</span>
                                        <span>코인: +50점</span>
                                    </div>
                                    <div className={styles.scoreItem}>
                                        <span className={styles.emoji}>🚧</span>
                                        <span>장애물 통과: +10점</span>
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
                            💡 스페이스바 또는 화면을 클릭하여 점프하세요!
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

                            <div className={styles.winnerButtons}>
                                <button 
                                    className={styles.retryButton}
                                    onClick={startGame}
                                >
                                    다시 플레이
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

