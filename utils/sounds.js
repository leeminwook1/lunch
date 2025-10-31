// 웹 오디오 API를 사용한 게임 사운드 효과
// 외부 파일 없이 프로그래밍 방식으로 사운드 생성

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3; // 기본 볼륨 (0.0 ~ 1.0)
        this.enabled = true;
        
        // 사용자 상호작용 후 AudioContext 초기화
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            // AudioContext는 사용자 제스처 후에만 생성 가능
            if (typeof window !== 'undefined') {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    // AudioContext 재개 (사용자 상호작용 필요)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 점프 사운드 (짧고 경쾌한 사운드)
    playJump() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 주파수: 400Hz -> 600Hz로 빠르게 상승
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            600,
            this.audioContext.currentTime + 0.1
        );

        // 볼륨: 시작 -> 페이드아웃
        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.1
        );

        oscillator.type = 'sine';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 코인 수집 사운드 (맑고 높은 사운드)
    playCoin() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 두 음을 연속으로: 800Hz -> 1200Hz
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            1200,
            this.audioContext.currentTime + 0.05
        );
        oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(
            1600,
            this.audioContext.currentTime + 0.1
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.15
        );

        oscillator.type = 'square';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    // 게임 오버 사운드 (하강하는 슬픈 사운드)
    playGameOver() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 주파수: 400Hz -> 100Hz로 하강
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            100,
            this.audioContext.currentTime + 0.5
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.5
        );

        oscillator.type = 'sawtooth';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    // 승리 사운드 (상승하는 화려한 사운드)
    playWin() {
        if (!this.enabled || !this.audioContext) return;

        // 3개의 음을 연속으로 연주
        const notes = [523.25, 659.25, 783.99]; // C, E, G (도, 미, 솔)
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

                gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01,
                    this.audioContext.currentTime + 0.3
                );

                oscillator.type = 'sine';
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }, index * 100);
        });
    }

    // 더블 점프 사운드 (더 높은 주파수)
    playDoubleJump() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 주파수: 600Hz -> 800Hz로 빠르게 상승
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            800,
            this.audioContext.currentTime + 0.1
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.1
        );

        oscillator.type = 'sine';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 아이템 획득 사운드
    playItem() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 상승하는 멜로디: 600Hz -> 800Hz -> 1000Hz
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            800,
            this.audioContext.currentTime + 0.05
        );
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(
            1000,
            this.audioContext.currentTime + 0.1
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.15
        );

        oscillator.type = 'sine';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    // 충돌 사운드 (짧고 낮은 충격음)
    playHit() {
        if (!this.enabled || !this.audioContext) return;

        // 노이즈 기반의 충격음
        const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1초
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // 화이트 노이즈 생성
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.1
        );

        source.start(this.audioContext.currentTime);
    }

    // 배경음악 대신 부드러운 주변 음
    playAmbient() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(this.masterVolume * 0.05, this.audioContext.currentTime);

        oscillator.start(this.audioContext.currentTime);
        
        return () => {
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + 0.5
            );
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    // 볼륨 설정
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    // 사운드 활성화/비활성화
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// 싱글톤 인스턴스 생성
let soundManager = null;

export const getSoundManager = () => {
    if (typeof window !== 'undefined' && !soundManager) {
        soundManager = new SoundManager();
    }
    return soundManager;
};

export default getSoundManager;

