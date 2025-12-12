'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
    color: string;
}

export default function CanvasBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Enhanced particles setup
        const particles: Particle[] = [];
        const particleCount = 25; // More particles for visual impact
        const colors = [
            'rgba(42, 209, 231, ',    // Aqua
            'rgba(59, 222, 250, ',    // Light Aqua
            'rgba(255, 146, 68, ',    // Warm Orange
            'rgba(147, 51, 234, ',    // Purple
        ];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 4 + 2,
                opacity: Math.random() * 0.25 + 0.08,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        // Animation loop with glow effect
        let animationId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw subtle gradient overlay
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width / 1.5
            );
            gradient.addColorStop(0, 'rgba(42, 209, 231, 0.03)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw particle with glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

                // Outer glow
                const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                glowGradient.addColorStop(0, `${p.color}${p.opacity})`);
                glowGradient.addColorStop(1, `${p.color}0)`);
                ctx.fillStyle = glowGradient;
                ctx.fill();

                // Core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.opacity * 2})`;
                ctx.fill();
            });

            // Draw connection lines between nearby particles
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach((p2) => {
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(42, 209, 231, ${0.05 * (1 - distance / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    );
}
