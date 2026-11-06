// 保留原站的动态变色粒子、鼠标光晕与神经网络连线。
(() => {
const canvas = document.getElementById('cyber-canvas');
        const ctx = canvas.getContext('2d');
        let width, height, particles;
        let hue = 185; // 初始青色色相

        const mouse = { x: -1000, y: -1000, radius: 160 };

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
        }

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.1;
                this.vy = (Math.random() - 0.5) * 1.1;
                this.size = Math.random() * 2 + 1;
                this.colorOffset = Math.random() * 60;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // 鼠标交互：引力吸附 + 能量高亮
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x += (dx / dist) * force * 2.2;
                    this.y += (dy / dist) * force * 2.2;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${(hue + this.colorOffset) % 360}, 100%, 65%)`;
                ctx.fill();
            }
        }

        function initParticles() {
            const count = Math.min(Math.floor((width * height) / 11000), 130);
            particles = Array.from({ length: count }, () => new Particle());
        }

        function animate() {
            // 制造轻微拖尾流光感
            ctx.fillStyle = 'rgba(7, 9, 14, 0.28)';
            ctx.fillRect(0, 0, width, height);

            hue = (hue + 0.35) % 360; // 动态流光变色

            // 鼠标光晕中心
            if (mouse.x > 0) {
                const grad = ctx.createRadialGradient(mouse.x, mouse.y, 2, mouse.x, mouse.y, 180);
                grad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.18)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2);
                ctx.fill();
            }

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                // 粒子间神经网络连线
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 125) {
                        const alpha = (1 - dist / 125) * 0.45;
                        ctx.strokeStyle = `hsla(${(hue + particles[i].colorOffset) % 360}, 100%, 65%, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                // 粒子与鼠标的激光连线
                const mDx = particles[i].x - mouse.x;
                const mDy = particles[i].y - mouse.y;
                const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
                if (mDist < mouse.radius) {
                    const alpha = (1 - mDist / mouse.radius) * 0.85;
                    ctx.strokeStyle = `hsla(${(hue + 40) % 360}, 100%, 70%, ${alpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        animate();

})();
