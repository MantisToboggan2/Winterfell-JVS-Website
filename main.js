const Winterfell = {
    settings: {
        serverIP: "193.243.190.4",
        serverPort: "27065",
        apiUrl: "https://gameserveranalytics.com/api/v2/query",
        refreshInterval: 30000
    },

    init() {
        this.initMobileNav();
        this.initServerStats();
        this.initClipboard();
        this.initScrollAnimations();
    },

    initMobileNav() {
        const hamburger = document.getElementById('hamburger');
        const mobileNav = document.getElementById('mobile-nav');
        
        if (!hamburger || !mobileNav) return;

        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileNav.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (mobileNav.classList.contains('active') && !mobileNav.contains(e.target) && e.target !== hamburger) {
                mobileNav.classList.remove('active');
            }
        });
    },

async initServerStats() {
        const playerEl = document.getElementById("player-count");
        const mapEl = document.getElementById("current-map");
        const peakEl = document.getElementById("max-players");
        const avgEl = document.getElementById("avg-players");
        const uniqueEl = document.getElementById("unique-players");
        const statusLabel = document.querySelector(".stat-value.online");

        if (!playerEl || !mapEl || !statusLabel) return;

        try {
            const response = await fetch('/api/stats');
            const data = await response.json();

            const updateWithPulse = (el, newValue) => {
                if (el && el.innerText !== String(newValue)) {
                    el.innerText = newValue;
                    el.style.transition = "none";
                    el.style.color = "#fff700";
                    el.style.textShadow = "0 0 15px #fff700";
                    
                    setTimeout(() => {
                        el.style.transition = "all 1s ease";
                        el.style.color = "";
                        el.style.textShadow = ""; 
                    }, 100);
                }
            };

            updateWithPulse(playerEl, `${data.live} / ${data.max_total}`);
            updateWithPulse(mapEl, data.map);
            updateWithPulse(peakEl, data.peak);
            updateWithPulse(avgEl, data.avg);
            const uniqueValue = data.unique || data.unique_players || data.unique_count || "0";
            updateWithPulse(uniqueEl, uniqueValue);

            statusLabel.innerText = "ONLINE";
            statusLabel.style.color = "";
            statusLabel.style.textShadow = "";
        } catch (error) {
            this.setOffline(playerEl, mapEl, statusLabel);
        }
    },

    setOffline(playerEl, mapEl, statusLabel) {
        if (playerEl) playerEl.innerText = "0 / 0";
        if (mapEl) mapEl.innerText = "OFFLINE";
        if (statusLabel) {
            statusLabel.innerText = "OFFLINE";
            statusLabel.style.cssText = "color: #ff4b4b; text-shadow: 0 0 10px #ff4b4b;";
        }
    },

    initClipboard() {
        const copyBtn = document.getElementById("copy-ip");
        const btnText = document.getElementById("btn-text");

        if (!copyBtn) return;

        copyBtn.addEventListener('click', () => {
            const fullIP = `${this.settings.serverIP}:${this.settings.serverPort}`;
            
            navigator.clipboard.writeText(fullIP).then(() => {
                const originalText = btnText.innerText;
                btnText.innerText = "IP COPIED!";
                copyBtn.classList.add("success-glow");
                
                setTimeout(() => {
                    btnText.innerText = originalText;
                    copyBtn.classList.remove("success-glow");
                }, 2000);
            }).catch(err => console.error("Could not copy text: ", err));
        });
    },

    initScrollAnimations() {
        const wrappers = document.querySelectorAll('.sticky-wrapper');
        if (wrappers.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const content = entry.target.querySelector('.sticky-content');
                if (content) {
                    content.classList.toggle('active', entry.isIntersecting);
                }
            });
        }, { threshold: 0.2 });

        wrappers.forEach(wrapper => observer.observe(wrapper));
    }
};

window.addEventListener('scroll', function() {
    const header = document.getElementById('main-header');
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouseX = 0;
let mouseY = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 2 - 1; 
        this.speedY = Math.random() * 2 - 1;
        this.color = 'rgb(255, 247, 0)';
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY += 0.05;
        this.life -= 0.02;
        if (this.size > 0.1) this.size -= 0.03;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

let lastMouseMoveTime = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMouseMoveTime = Date.now();
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
    const cursorStyle = window.getComputedStyle(elementUnderMouse || document.body).cursor;

    const isMoving = Date.now() - lastMouseMoveTime < 10;

    if (isMoving && cursorStyle !== 'pointer' && cursorStyle !== 'text') {
        for (let i = 0; i < 2; i++) {
            particles.push(new Particle(mouseX + 10, mouseY));
        }
    }

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
    requestAnimationFrame(animate);
}

animate();

setInterval(() => {
    Winterfell.initServerStats();
}, Winterfell.settings.refreshInterval);

document.addEventListener('DOMContentLoaded', () => Winterfell.init());