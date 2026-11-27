// src/scripts/efeitos.js
// Todas as animações e interações com o mouse do site.

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------
   1. Scroll: barra de progresso, header e botão "voltar ao topo"
   ------------------------------------------------------------ */
const cabecalho = document.querySelector('.cabecalho');
const botaoTopo = document.querySelector('.btn-topo');

function aoRolar() {
  const el = document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  const progresso = max > 0 ? el.scrollTop / max : 0;
  el.style.setProperty('--progresso', progresso.toFixed(4));
  cabecalho?.classList.toggle('rolado', el.scrollTop > 10);
  botaoTopo?.classList.toggle('visivel', el.scrollTop > 600);
}
window.addEventListener('scroll', aoRolar, { passive: true });
aoRolar();

botaoTopo?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduzirMovimento ? 'auto' : 'smooth' });
});

/* ------------------------------------------------------------
   2. Menu mobile
   ------------------------------------------------------------ */
const botaoMenu = document.querySelector('.menu-toggle');
const navegacao = document.querySelector('.navegacao');

botaoMenu?.addEventListener('click', () => {
  const aberto = navegacao.classList.toggle('aberto');
  botaoMenu.classList.toggle('aberto', aberto);
  botaoMenu.setAttribute('aria-expanded', String(aberto));
});
navegacao?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    navegacao.classList.remove('aberto');
    botaoMenu?.classList.remove('aberto');
    botaoMenu?.setAttribute('aria-expanded', 'false');
  })
);

/* ------------------------------------------------------------
   3. Revelar elementos ao rolar (com atraso em cascata)
   ------------------------------------------------------------ */
const itensReveal = document.querySelectorAll('[data-reveal]');

// Atraso escalonado entre irmãos (cartões de um mesmo grid, por exemplo)
const contadorPorPai = new Map();
itensReveal.forEach((el) => {
  const pai = el.parentElement;
  const n = contadorPorPai.get(pai) ?? 0;
  el.style.setProperty('--atraso', `${Math.min(n, 6) * 90}ms`);
  contadorPorPai.set(pai, n + 1);
});

if ('IntersectionObserver' in window && !reduzirMovimento) {
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visivel');
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  itensReveal.forEach((el) => observador.observe(el));
} else {
  itensReveal.forEach((el) => el.classList.add('visivel'));
}

/* ------------------------------------------------------------
   4. Brilho que segue o cursor (com suavização)
   ------------------------------------------------------------ */
const brilho = document.querySelector('.cursor-brilho');

if (brilho && temMouse && !reduzirMovimento) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let alvoX = x;
  let alvoY = y;

  window.addEventListener(
    'pointermove',
    (e) => {
      alvoX = e.clientX;
      alvoY = e.clientY;
      brilho.classList.add('ativo');
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => brilho.classList.remove('ativo'));

  (function animar() {
    x += (alvoX - x) * 0.14;
    y += (alvoY - y) * 0.14;
    brilho.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animar);
  })();
}

/* ------------------------------------------------------------
   5. Cartões: luz que segue o mouse + inclinação 3D
   ------------------------------------------------------------ */
if (temMouse && !reduzirMovimento) {
  document.querySelectorAll('.cartao').forEach((cartao) => {
    cartao.addEventListener('pointermove', (e) => {
      const r = cartao.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cartao.style.setProperty('--x', `${px * 100}%`);
      cartao.style.setProperty('--y', `${py * 100}%`);
      cartao.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
      cartao.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    });
    cartao.addEventListener('pointerleave', () => {
      cartao.style.setProperty('--rx', '0deg');
      cartao.style.setProperty('--ry', '0deg');
    });
  });

  /* ----------------------------------------------------------
     6. Botões magnéticos
     ---------------------------------------------------------- */
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.translate = `${dx * 0.18}px ${dy * 0.3}px`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.translate = '';
    });
  });
}

/* ------------------------------------------------------------
   7. Hero / banners: luz do mouse + parallax
   ------------------------------------------------------------ */
document.querySelectorAll('[data-hero]').forEach((hero) => {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    hero.style.setProperty('--mx', `${x}px`);
    hero.style.setProperty('--my', `${y}px`);
    hero.style.setProperty('--px', ((x / r.width - 0.5) * 2).toFixed(3));
    hero.style.setProperty('--py', ((y / r.height - 0.5) * 2).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0');
    hero.style.setProperty('--py', '0');
  });
});

/* ------------------------------------------------------------
   8. Rede de partículas (canvas) que reage ao mouse
   ------------------------------------------------------------ */
function iniciarParticulas(canvas) {
  const ctx = canvas.getContext('2d');
  const pai = canvas.parentElement;
  const divisor = canvas.dataset.densidade === 'baixa' ? 20000 : 11000;
  const raioLigacao = 125;
  const raioMouse = 170;
  const mouse = { x: -9999, y: -9999 };

  let w = 0;
  let h = 0;
  let particulas = [];
  let visivel = true;
  let rodando = false;

  function ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const total = Math.min(110, Math.floor((w * h) / divisor));
    particulas = Array.from({ length: total }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.8,
    }));
    if (reduzirMovimento) desenhar();
  }

  function desenhar() {
    ctx.clearRect(0, 0, w, h);

    for (const p of particulas) {
      if (!reduzirMovimento) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // atração suave pelo mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < raioMouse && d > 30) {
          const forca = (1 - d / raioMouse) * 0.7;
          p.x += (dx / d) * forca;
          p.y += (dy / d) * forca;
        }
      }
    }

    // ligações entre partículas próximas
    for (let i = 0; i < particulas.length; i++) {
      const a = particulas[i];
      for (let j = i + 1; j < particulas.length; j++) {
        const b = particulas[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < raioLigacao) {
          ctx.strokeStyle = `rgba(31, 176, 232, ${(1 - d / raioLigacao) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // ligação com o mouse
      const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (dm < raioMouse) {
        ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - dm / raioMouse) * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }

    // pontos
    for (const p of particulas) {
      ctx.fillStyle = 'rgba(140, 210, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ciclo() {
    if (!visivel || document.hidden) {
      rodando = false;
      return;
    }
    rodando = true;
    desenhar();
    requestAnimationFrame(ciclo);
  }

  pai.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  pai.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  new ResizeObserver(ajustar).observe(canvas);

  // pausa quando sai da tela (economiza bateria)
  new IntersectionObserver(([entrada]) => {
    visivel = entrada.isIntersecting;
    if (visivel && !rodando && !reduzirMovimento) ciclo();
  }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visivel && !rodando && !reduzirMovimento) ciclo();
  });

  ajustar();
  if (!reduzirMovimento) ciclo();
}

document.querySelectorAll('canvas[data-particulas]').forEach(iniciarParticulas);
