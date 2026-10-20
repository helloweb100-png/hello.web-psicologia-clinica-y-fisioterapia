/* ═══════════════════════════════════════════════════════════════
   LUCIANA GÓMEZ ZAMORA · Landing premium
   Interacciones: loader, scroll suave, escenas de scroll (GSAP),
   red neuronal del hero, formulario → WhatsApp.
   Todo degrada con gracia: sin GSAP/Lenis o con "reducir movimiento"
   la página sigue siendo 100% legible y funcional.
   ═══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ───── 0. CONFIGURACIÓN (edita aquí los números de WhatsApp) ───── */
    const CONFIG = {
        waAssistant: '523173897269',   // Asistente: agenda de citas
        waDirect: '523171131703',      // Contacto directo con la psicóloga
        loaderMinMs: 2300,             // duración mínima del loader
    };

    /* ───── Utilidades ───── */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = () => !!(window.gsap && window.ScrollTrigger);
    let lenis = null;

    /* ───── 1. ENLACES DE WHATSAPP (mensaje prellenado por contexto) ───── */
    function setupWhatsApp() {
        $$('[data-wa]').forEach((a) => {
            const num = a.dataset.waNum || CONFIG.waAssistant;
            a.href = `https://wa.me/${num}?text=${encodeURIComponent(a.dataset.wa)}`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
    }

    /* ───── 2. TEXTO: división en palabras para animar con máscara ───── */
    const SWASH = '<svg class="swash" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M3 9 C 40 3, 78 13, 118 7 S 178 4, 197 8" pathLength="1"/></svg>';

    function splitWords(el) {
        let i = 0;
        const unit = (child) => {
            const w = document.createElement('span');
            const inner = document.createElement('span');
            w.className = 'w';
            inner.className = 'w__in';
            inner.style.setProperty('--i', i++);
            inner.appendChild(child);
            w.appendChild(inner);
            return w;
        };
        const walk = (src, dst) => {
            src.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        dst.appendChild(/^\s+$/.test(part) ? document.createTextNode(' ') : unit(document.createTextNode(part)));
                    });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList.contains('mark')) {
                        node.insertAdjacentHTML('beforeend', SWASH);
                        dst.appendChild(unit(node.cloneNode(true)));
                    } else {
                        const clone = node.cloneNode(false);
                        walk(node, clone);
                        dst.appendChild(clone);
                    }
                }
            });
        };
        const shell = el.cloneNode(false);
        walk(el, shell);
        el.replaceChildren(...shell.childNodes);
    }

    function wrapScrubWords(el) {
        const words = [];
        const text = el.textContent.trim();
        el.textContent = '';
        text.split(/\s+/).forEach((word, idx, arr) => {
            const s = document.createElement('span');
            s.className = 'sw';
            s.textContent = word;
            el.appendChild(s);
            words.push(s);
            if (idx < arr.length - 1) el.appendChild(document.createTextNode(' '));
        });
        return words;
    }

    function setupSplit() {
        $$('[data-split]').forEach(splitWords);
    }

    /* ───── 3. REVELADO AL ENTRAR EN PANTALLA ───── */
    function setupReveal() {
        const items = $$('[data-reveal], [data-split]:not(.hero__title)');
        const show = (el) => el.classList.add(el.hasAttribute('data-split') ? 'split-in' : 'in');
        if (!('IntersectionObserver' in window) || reduceMotion) {
            items.forEach(show);
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                show(e.target);
                io.unobserve(e.target);
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
        items.forEach((el) => io.observe(el));
    }

    /* ───── 4. LOADER: spinner circular con progreso real ───── */
    function runLoader() {
        return new Promise((resolve) => {
            const loader = $('#loader');
            if (!loader) { root.classList.add('is-ready'); return resolve(); }

            const count = $('#loader-count');
            const ring = $('#loader-ring');
            const msg = $('#loader-msg');
            const min = reduceMotion ? 350 : CONFIG.loaderMinMs;
            const messages = [[0, 'Preparando un espacio seguro'], [42, 'Afinando los detalles'], [78, 'Todo listo para recibirte']];

            let loaded = document.readyState === 'complete';
            let fontsReady = !(document.fonts && document.fonts.ready);
            if (!loaded) addEventListener('load', () => { loaded = true; }, { once: true });
            if (!fontsReady) document.fonts.ready.then(() => { fontsReady = true; });
            setTimeout(() => { loaded = true; fontsReady = true; }, 6500);   // tope de espera

            const t0 = performance.now();
            let p = 0;
            let lastMsg = '';

            const render = () => {
                const v = Math.round(p);
                count.textContent = v;
                ring.style.strokeDashoffset = String(100 - p);
                const m = messages.filter(([at]) => v >= at).pop()[1];
                if (m !== lastMsg) { msg.textContent = m; lastMsg = m; }
            };

            const finish = () => {
                p = 100;
                render();
                setTimeout(() => {
                    loader.classList.add('is-done');
                    root.classList.remove('is-loading');
                    root.classList.add('is-ready');
                    resolve();
                    setTimeout(() => loader.remove(), 1400);
                }, 420);
            };

            const tick = (now) => {
                const t = now - t0;
                const ease = 1 - Math.pow(1 - clamp(t / min, 0, 1), 3);
                const ready = loaded && fontsReady && t >= min;
                const target = ready ? 100 : Math.min(92, ease * 92);
                p += (target - p) * 0.085;
                if (ready && p > 99.3) return finish();
                render();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /* ───── 5. SCROLL SUAVE (Lenis) + anclas ───── */
    function setupSmoothScroll() {
        if (reduceMotion || !window.Lenis) return;
        lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
        lenis.stop();                                   // se libera cuando termina el loader
        if (hasGSAP()) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((t) => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    function scrollToTarget(target) {
        const offset = -(parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64) - 8;
        if (lenis) lenis.scrollTo(target, { offset, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
        else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    function setupAnchors() {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.classList.contains('skip')) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = id === '#inicio' ? 0 : $(id);
            if (target === null) return;
            e.preventDefault();
            if (root.classList.contains('menu-open')) closeMenu();
            scrollToTarget(target);
            history.replaceState(null, '', id);
        });
    }

    /* ───── 6. NAVEGACIÓN ───── */
    let closeMenu = () => {};

    function setupNav() {
        const nav = $('#nav');
        const sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none';
        document.body.prepend(sentinel);
        new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

        // Enlace activo según la sección visible
        const links = $$('.nav__links a');
        const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                links.forEach((l) => l.classList.remove('is-active'));
                const link = map.get(e.target.id);
                if (link) link.classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

        // Menú móvil
        const burger = $('#burger');
        const menu = $('#menu');
        const setOpen = (open) => {
            root.classList.toggle('menu-open', open);
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.setAttribute('aria-hidden', String(!open));
            document.body.style.overflow = open ? 'hidden' : '';
            if (lenis) open ? lenis.stop() : lenis.start();
            if (open) nav.classList.remove('is-hidden');
        };
        closeMenu = () => setOpen(false);
        burger.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
        addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && root.classList.contains('menu-open')) { setOpen(false); burger.focus(); }
        });
        matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    }

    /* ───── 7. HERO: red neuronal viva (canvas) ───── */
    function setupNeural() {
        const canvas = $('#neural');
        const hero = $('.hero');
        if (!canvas || !hero) return;
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, nodes = [], raf = 0, visible = true;
        const mouse = { x: 0, y: 0, on: false };

        const build = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const r = canvas.getBoundingClientRect();
            w = r.width; h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = clamp(Math.round((w * h) / (w < 700 ? 15000 : 10500)), 26, 110);
            nodes = Array.from({ length: count }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.7 + 0.8, deep: Math.random() < 0.28,
            }));
        };

        const draw = (animate) => {
            ctx.clearRect(0, 0, w, h);
            const link = w < 700 ? 92 : 132;
            const pull = 170;
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (animate) {
                    n.x += n.vx; n.y += n.vy;
                    if (n.x < -12) n.x = w + 12; else if (n.x > w + 12) n.x = -12;
                    if (n.y < -12) n.y = h + 12; else if (n.y > h + 12) n.y = -12;
                    if (mouse.on) {                               // la red "piensa" hacia el cursor
                        const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
                        if (d < pull && d > 1) { n.x += (dx / d) * 0.35; n.y += (dy / d) * 0.35; }
                    }
                }
                for (let j = i + 1; j < nodes.length; j++) {
                    const m = nodes[j];
                    const d = Math.hypot(n.x - m.x, n.y - m.y);
                    if (d < link) {
                        ctx.strokeStyle = `rgba(23,86,112,${((1 - d / link) * 0.2).toFixed(3)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                    }
                }
                if (mouse.on) {
                    const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
                    if (d < pull) {
                        ctx.strokeStyle = `rgba(42,155,203,${((1 - d / pull) * 0.5).toFixed(3)})`;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                    }
                }
                ctx.fillStyle = n.deep ? 'rgba(14,62,84,.55)' : 'rgba(42,155,203,.75)';
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
            }
        };

        const loop = () => {
            if (visible && !document.hidden) draw(true);
            raf = requestAnimationFrame(loop);
        };

        build();
        draw(false);
        if (reduceMotion) return;                                  // un solo cuadro estático
        raf = requestAnimationFrame(loop);

        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
        let resizeT;
        addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(build, 200); });
        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = canvas.getBoundingClientRect();
                mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
            });
            hero.addEventListener('pointerleave', () => { mouse.on = false; });
        }
    }

    /* ───── 8. HERO: parallax por capas con el cursor ───── */
    function setupParallax() {
        const hero = $('.hero');
        if (!hero || !finePointer || reduceMotion) return;
        $$('[data-depth]', hero).forEach((el) => el.style.setProperty('--depth', el.dataset.depth));
        let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
        const loop = () => {
            cx = lerp(cx, tx, 0.07); cy = lerp(cy, ty, 0.07);
            hero.style.setProperty('--px', cx.toFixed(4));
            hero.style.setProperty('--py', cy.toFixed(4));
            raf = (Math.abs(cx - tx) > 0.001 || Math.abs(cy - ty) > 0.001) ? requestAnimationFrame(loop) : 0;
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            tx = ((e.clientX - r.left) / r.width) * 2 - 1;
            ty = ((e.clientY - r.top) / r.height) * 2 - 1;
            kick();
        });
        hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    }

    /* ───── 9. MICRO-INTERACCIONES ───── */
    function setupMagnetic() {
        if (!finePointer || reduceMotion) return;
        $$('.magnetic').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                const x = (e.clientX - (r.left + r.width / 2)) * 0.26;
                const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
                btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });
            btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
        });
    }

    function setupSpotlight() {
        if (!finePointer) return;
        $$('.spot').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            }, { passive: true });
        });
    }

    function setupCounters() {
        $$('[data-count]').forEach((el) => {
            const end = parseInt(el.dataset.count, 10);
            if (reduceMotion || !('IntersectionObserver' in window)) return;
            el.textContent = '0';
            const io = new IntersectionObserver(([e]) => {
                if (!e.isIntersecting) return;
                io.disconnect();
                const t0 = performance.now();
                const step = (now) => {
                    const p = clamp((now - t0) / 1700, 0, 1);
                    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }, { threshold: 0.6 });
            io.observe(el);
        });
    }

    function setupAudience() {
        const items = $$('.aud__item');
        const open = (el) => items.forEach((i) => i.classList.toggle('is-open', i === el));
        items.forEach((el) => {
            el.addEventListener('mouseenter', () => { if (finePointer) open(el); });
            el.addEventListener('focus', () => open(el));
            el.addEventListener('click', () => open(el));
        });
    }

    function setupModes() {
        const seg = $('.seg');
        const tabs = $$('.seg__btn');
        if (!seg || !tabs.length) return;
        const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
        const select = (idx, focus) => {
            tabs.forEach((t, i) => {
                const on = i === idx;
                t.classList.toggle('is-on', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                panels[i].hidden = !on;
                panels[i].classList.toggle('is-on', on);
            });
            seg.dataset.on = idx;
            if (focus) tabs[idx].focus();
            if (hasGSAP()) setTimeout(() => ScrollTrigger.refresh(), 60);
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => select(i));
            t.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    select((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
                } else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
                else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
            });
        });
    }

    function setupFaq() {
        const items = $$('.acc__item');
        const set = (item, open) => {
            item.classList.toggle('is-open', open);
            $('.acc__btn', item).setAttribute('aria-expanded', String(open));
        };
        items.forEach((item) => {
            $('.acc__btn', item).addEventListener('click', () => {
                const willOpen = !item.classList.contains('is-open');
                items.forEach((o) => { if (o !== item) set(o, false); });
                set(item, willOpen);
                if (hasGSAP()) setTimeout(() => ScrollTrigger.refresh(), 800);
            });
        });
        if (items[0]) set(items[0], true);
    }

    function setupMarquee() {
        if (reduceMotion) return;
        $$('.marquee__row').forEach((row) => {
            const originals = Array.from(row.children);
            const setW = row.scrollWidth;
            if (!setW) return;
            const copies = 2 * Math.max(1, Math.ceil((window.innerWidth * 1.15) / setW));   // par: el bucle usa -50%
            for (let c = 1; c < copies; c++) {
                originals.forEach((k) => { const clone = k.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); row.appendChild(clone); });
            }
            row.style.setProperty('--dur', `${(row.scrollWidth / 2 / 42).toFixed(1)}s`);        // ~42 px/s constantes
        });
    }

    /* ───── 10. FORMULARIO → WHATSAPP ───── */
    function setupForm() {
        const form = $('#contact-form');
        if (!form) return;
        const status = $('#form-status');
        const els = form.elements;
        const setError = (field, message) => {
            const wrap = field.closest('.field');
            const out = $(`#e-${field.name}`);
            wrap.classList.toggle('has-error', !!message);
            field.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (out) out.textContent = message;
        };
        ['nombre', 'para'].forEach((n) => {
            els[n].addEventListener('input', () => setError(els[n], ''));
            els[n].addEventListener('change', () => setError(els[n], ''));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = els.nombre.value.trim();
            const para = els.para.value;
            setError(els.nombre, nombre ? '' : 'Escribe tu nombre para poder saludarte.');
            setError(els.para, para ? '' : 'Elige para quién es la terapia.');
            if (!nombre) return els.nombre.focus();
            if (!para) return els.para.focus();

            const motivo = els.motivo.value.trim();
            const lines = [
                `Hola, soy ${nombre}.`,
                'Me gustaría agendar mi primera sesión con la Mtra. Luciana Gómez Zamora.',
                `Terapia: ${para.charAt(0).toLowerCase()}${para.slice(1)}.`,
                `Modalidad: ${els.modalidad.value}.`,
            ];
            if (motivo) lines.push(`Me gustaría trabajar: ${motivo}`);
            const url = `https://wa.me/${CONFIG.waAssistant}?text=${encodeURIComponent(lines.join('\n'))}`;

            form.classList.add('is-sent');
            status.textContent = 'Listo, abriendo WhatsApp con tu mensaje…';
            const win = window.open(url, '_blank', 'noopener');
            if (!win) location.href = url;                          // si el navegador bloquea la ventana
        });
    }

    /* ───── 11. BOTÓN FLOTANTE: aviso amable una sola vez ───── */
    function setupFab() {
        const fab = $('#fab');
        if (!fab) return;
        let seen = false;
        try { seen = sessionStorage.getItem('fabTip') === '1'; } catch (_) { /* sin storage */ }
        if (seen) return;
        setTimeout(() => {
            fab.classList.add('show-tip');
            try { sessionStorage.setItem('fabTip', '1'); } catch (_) { /* sin storage */ }
            setTimeout(() => fab.classList.remove('show-tip'), 6500);
        }, 8000);
    }

    /* ───── 12. ESCENAS DE SCROLL (GSAP + ScrollTrigger) ───── */
    function setupScrollScenes() {
        if (!hasGSAP() || reduceMotion) return;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        root.classList.add('st');

        // Barra de progreso y barra superior que se oculta al bajar
        gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.25 } });
        const nav = $('#nav');
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                if (root.classList.contains('menu-open')) return;
                nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 560);
            },
        });

        // Manifiesto: las palabras se iluminan con el scroll
        const manifesto = $('[data-scrub-words]');
        if (manifesto) {
            const words = wrapScrubWords(manifesto);
            gsap.fromTo(words, { opacity: 0.14 }, {
                opacity: 1, ease: 'none', stagger: 0.12, duration: 0.6,
                scrollTrigger: { trigger: manifesto, start: 'top 82%', end: 'bottom 55%', scrub: true },
            });
        }

        // Parallax suave de marcas de agua
        $$('[data-parallax-y]').forEach((el) => {
            gsap.to(el, {
                y: parseFloat(el.dataset.parallaxY), ease: 'none',
                scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });

        const mm = gsap.matchMedia();

        // Camino: la imagen se abre hasta ocupar toda la pantalla
        const media = $('#camino-media');
        if (media) {
            mm.add('(min-width: 0px)', () => {
                const head = $('.camino__head');
                const over = $$('.camino__over > *', media);
                gsap.set(media, { '--p': 0 });                 // recorte y zoom se derivan de --p en el CSS
                gsap.set(over, { opacity: 0, y: 40 });
                gsap.timeline({
                    defaults: { ease: 'none' },
                    scrollTrigger: { trigger: '.camino__pin', start: 'top top', end: '+=170%', pin: true, scrub: 0.7, anticipatePin: 1 },
                })
                    .to(media, { '--p': 1, duration: 1 }, 0)
                    .to(head, { opacity: 0, y: -50, duration: 0.34 }, 0)
                    .to(over, { opacity: 1, y: 0, stagger: 0.12, duration: 0.3 }, 0.62);
            });
        }

        // Especialidades: el scroll vertical recorre la galería en horizontal
        const specs = $('#especialidades');
        const track = $('#specs-track');
        if (specs && track) {
            mm.add('(min-width: 1024px)', () => {
                root.classList.add('st-h');
                const dist = () => Math.max(0, track.scrollWidth - root.clientWidth);
                gsap.to(track, {
                    x: () => -dist(), ease: 'none',
                    scrollTrigger: { trigger: specs, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
                });
                return () => { root.classList.remove('st-h'); gsap.set(track, { clearProps: 'transform' }); };
            });
        }

        // Proceso: tarjetas apiladas que se encogen al llegar la siguiente
        const steps = $$('#stack .step');
        steps.forEach((step, i) => {
            if (i === steps.length - 1) return;
            gsap.to($('.step__card', step), {
                scale: 0.94, y: -8, ease: 'none',
                scrollTrigger: { trigger: steps[i + 1], start: 'top 88%', end: 'top 22%', scrub: true },
            });
        });

        // Trayectoria: la línea se dibuja y los hitos se encienden
        const timeline = $('#timeline');
        if (timeline) {
            gsap.to('#timeline-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: timeline, start: 'top 65%', end: 'bottom 65%', scrub: 0.4 } });
            $$('.tl', timeline).forEach((item) => ScrollTrigger.create({
                trigger: item, start: 'top 62%',
                onEnter: () => item.classList.add('is-on'),
                onLeaveBack: () => item.classList.remove('is-on'),
            }));
        }

        const refresh = () => ScrollTrigger.refresh();
        addEventListener('load', refresh, { once: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        setTimeout(refresh, 1500);
    }

    /* ───── 13. ARRANQUE ───── */
    function startHero() {
        const title = $('.hero__title');
        if (title) { title.style.setProperty('--base', '.35s'); title.classList.add('split-in'); }
        if (lenis) lenis.start();
        setupFab();
    }

    async function init() {
        setupWhatsApp();
        setupSplit();
        setupReveal();
        setupSmoothScroll();
        setupAnchors();
        setupNav();
        setupScrollScenes();
        setupCounters();
        setupSpotlight();
        setupMagnetic();
        setupAudience();
        setupModes();
        setupFaq();
        setupMarquee();
        setupForm();
        setupNeural();
        setupParallax();
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        await runLoader();
        startHero();
    }

    root.classList.add('is-loading');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
