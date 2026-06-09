// Ported from Home Island's dynamic background
interface Star {
    x: number;
    y: number;
    radius: number;
    glowRadius: number;
    glowAlpha: number;
    phase: number;
    speed: number;
}

interface ShootingStar {
    x: number;
    y: number;
    delay: number;
    period: number;
    angle: number;
    length: number;
    travel: number;
    visibleFraction: number;
    lineWidth: number;
    opacity: number;
}

export class StarField {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private stars: Star[] = [];
    private shootingStars: ShootingStar[] = [];
    private opacity = 0;
    private animId: number | null = null;
    private lastTime = 0;
    private readonly resizeHandler: () => void;
    private resizeTimer: number | undefined;

    constructor(container: HTMLElement) {
        container.innerHTML = "";
        this.canvas = document.createElement("canvas");
        this.canvas.id = "stars-canvas";
        container.appendChild(this.canvas);

        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("2D canvas context unavailable");
        this.ctx = ctx;

        this.resize();
        this.resizeHandler = () => {
            window.clearTimeout(this.resizeTimer);
            this.resizeTimer = window.setTimeout(() => this.resize(), 150);
        };
        window.addEventListener("resize", this.resizeHandler, {passive: true});

        this.generate();
        this.lastTime = performance.now();
    }

    setOpacity(v: number) {
        this.opacity = v;
    }

    start() {
        if (this.animId !== null) return;
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        if (this.animId !== null) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    destroy() {
        this.stop();
        window.removeEventListener("resize", this.resizeHandler);
        window.clearTimeout(this.resizeTimer);
        this.canvas.remove();
    }

    private resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(window.innerWidth * dpr);
        this.canvas.height = Math.floor(window.innerHeight * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    private generate() {
        const starCount = 88;
        const sizeRadii = [0.5, 1, 1.5];
        const glowRadii = [2, 4, 6];
        const glowAlphas = [0.3, 0.4, 0.5];
        const weights = [0.7, 0.25, 0.05];

        this.stars = [];
        for (let i = 0; i < starCount; i++) {
            const rand = Math.random();
            let sizeIndex = 0;
            let cumulative = 0;
            for (let j = 0; j < weights.length; j++) {
                cumulative += weights[j];
                if (rand < cumulative) {
                    sizeIndex = j;
                    break;
                }
            }
            this.stars.push({
                x: Math.random(), y: Math.random(),
                radius: sizeRadii[sizeIndex], glowRadius: glowRadii[sizeIndex], glowAlpha: glowAlphas[sizeIndex],
                phase: Math.random() * Math.PI * 2, speed: 2.8 + Math.random() * 3.2,
            });
        }

        this.shootingStars = [];
        for (let i = 0; i < 3; i++) {
            const angle = (24 + Math.random() * 10) * (Math.PI / 180);
            this.shootingStars.push({
                x: 0.1 + Math.random() * 0.55, y: 0.03 + Math.random() * 0.32,
                delay: 4 + i * 6 + Math.random() * 5, period: 18 + Math.random() * 12, angle,
                length: 120 + Math.random() * 50, travel: 250 + Math.random() * 60,
                visibleFraction: 0.13 + Math.random() * 0.06, lineWidth: 0.75 + Math.random() * 0.45,
                opacity: 0.55 + Math.random() * 0.2,
            });
        }
    }

    private loop = () => {
        this.animId = requestAnimationFrame(this.loop);
        const now = performance.now();
        if (now - this.lastTime < 33) return; // ~30fps
        this.lastTime = now;

        const w = window.innerWidth, h = window.innerHeight, ctx = this.ctx, timeSec = now / 1000;
        ctx.clearRect(0, 0, w, h);

        for (const s of this.stars) {
            const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(timeSec * (Math.PI * 2 / s.speed) + s.phase));
            const scale = 1 + 0.2 * (twinkle - 0.3) / 0.7;
            const px = s.x * w, py = s.y * h, r = s.radius * scale;

            ctx.globalAlpha = this.opacity * twinkle * s.glowAlpha;
            ctx.beginPath();
            ctx.arc(px, py, s.glowRadius * scale, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();

            ctx.globalAlpha = this.opacity * twinkle;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
        }

        let active = 0;
        for (const ss of this.shootingStars) {
            const cycleTime = (timeSec - ss.delay) % ss.period;
            if (cycleTime < 0) continue;
            const visibleWindow = ss.period * ss.visibleFraction;
            if (cycleTime > visibleWindow) continue;
            const progress = cycleTime / visibleWindow;
            const opacity = Math.sin(Math.min(1, progress * 1.03) * Math.PI);
            if (opacity <= 0 || active >= 1) continue;
            active++;

            const dx = Math.cos(ss.angle), dy = Math.sin(ss.angle);
            const px = ss.x * w + dx * ss.travel * progress;
            const py = ss.y * h + dy * ss.travel * progress;
            const tailX = px - dx * ss.length, tailY = py - dy * ss.length;

            ctx.globalAlpha = this.opacity * Math.max(0, opacity) * ss.opacity;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(px, py);
            const grad = ctx.createLinearGradient(tailX, tailY, px, py);
            grad.addColorStop(0, "rgba(255,255,255,0)");
            grad.addColorStop(1, "rgba(255,255,255,1)");
            ctx.strokeStyle = grad;
            ctx.lineWidth = ss.lineWidth;
            ctx.stroke();

            ctx.globalAlpha = this.opacity * opacity * ss.opacity * 0.55;
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    };
}