(function () {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    const STAR_COUNT = 400;
    const FOV = 400;
    const COLORS = ['#FCD34D', '#F472B6', '#A78BFA', '#6EE7B7', '#FFFFFF'];
    const stars = [];

    for (let i = 0; i < STAR_COUNT; i++) {
        const isActive = Math.random() < 0.08;
        stars.push({
            x: (Math.random() - 0.5) * 2800,
            y: (Math.random() - 0.5) * 1800,
            z: (Math.random() - 0.5) * 2800,
            baseSize: isActive ? Math.random() * 3 + 3.5 : Math.random() * 2 + 0.8,
            active: isActive,
            color: isActive ? COLORS[Math.floor(Math.random() * COLORS.length)] : '#E2E8F0',
            phase: Math.random() * Math.PI * 2
        });
    }

    let rotation = 0;

    function render() {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;
        rotation += 0.0005;

        const projectedStars = stars.map(star => {
            const x1 = star.x * Math.cos(rotation) - star.z * Math.sin(rotation);
            const z1 = star.x * Math.sin(rotation) + star.z * Math.cos(rotation);
            const y2 = star.y * Math.cos(0.1) - z1 * Math.sin(0.1);
            const z2 = star.y * Math.sin(0.1) + z1 * Math.cos(0.1);
            const scale = FOV / (FOV + z2 + 800);
            return { ...star, x2d: x1 * scale + cx, y2d: y2 * scale + cy, scale, z: z2 };
        });

        projectedStars.sort((a, b) => b.z - a.z);

        // Draw connections (subtle)
        ctx.lineWidth = 0.5;
        projectedStars.forEach((s1, i) => {
            if (s1.active && s1.z > -500) {
                projectedStars.forEach((s2, j) => {
                    if (i === j) return;
                    const dx = s1.x2d - s2.x2d;
                    const dy = s1.y2d - s2.y2d;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 100 * s1.scale;
                    if (dist < maxDist) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / maxDist) * 0.1})`;
                        ctx.beginPath();
                        ctx.moveTo(s1.x2d, s1.y2d);
                        ctx.lineTo(s2.x2d, s2.y2d);
                        ctx.stroke();
                    }
                });
            }
        });

        projectedStars.forEach(star => {
            if (star.z > -FOV && star.scale > 0) {
                const size = star.baseSize * star.scale;
                const opacity = Math.min(1, (1 + Math.sin(Date.now() * 0.002 + star.phase)) * 0.3 + 0.5);

                ctx.fillStyle = star.active ? star.color : `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(star.x2d, star.y2d, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        requestAnimationFrame(render);
    }
    render();
})();
