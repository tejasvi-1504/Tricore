/* ═══════════════════════════════════════════════════════════════════
   KREVOL — site behaviour
   No animation libraries. Hero carousel, clients carousel, scroll
   reveals, counters, mobile nav, plus the booking + contact forms.
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══ HEADER ══════════════════════════════════════════════════════ */
  const hdr = document.getElementById('hdr');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('stuck', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ══ MOBILE NAV ══════════════════════════════════════════════════ */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  function closeNav() {
    nav.classList.remove('open');
    burger.classList.remove('on');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('lock');
  }
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('lock', open);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { closeNav(); burger.focus(); }
    });
  }

  /* ══ HERO CAROUSEL ═══════════════════════════════════════════════ */
  const slidesWrap = document.getElementById('slides');
  if (slidesWrap) {
    const slides = Array.from(slidesWrap.querySelectorAll('.slide'));
    const dots   = Array.from(document.querySelectorAll('#dots .dot'));
    const prevBt = document.getElementById('slidePrev');
    const nextBt = document.getElementById('slideNext');
    const DURATION = 6000;

    let index = 0;
    let timer = null;
    let paused = false;

    function show(next) {
      const to = (next + slides.length) % slides.length;
      if (to === index && slides[to].classList.contains('is-active')) return;

      slides.forEach((s, i) => {
        const on = i === to;
        // Re-trigger the CSS entrance animation by removing then re-adding.
        s.classList.remove('is-active');
        s.hidden = !on;
        if (on) {
          void s.offsetWidth;          // force reflow so the animation replays
          s.classList.add('is-active');
        }
      });

      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === to);
        d.setAttribute('aria-selected', String(i === to));
      });

      index = to;
      restart();
    }

    function restart() {
      clearTimeout(timer);
      if (reduce || paused) return;
      // Keep the dot's fill animation in step with the timer.
      const dot = dots[index];
      if (dot) {
        const bar = dot.querySelector('i');
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      }
      timer = setTimeout(() => show(index + 1), DURATION);
    }

    function setPaused(state) {
      paused = state;
      dots.forEach(d => d.classList.toggle('is-paused', state));
      if (state) clearTimeout(timer); else restart();
    }

    prevBt?.addEventListener('click', () => show(index - 1));
    nextBt?.addEventListener('click', () => show(index + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));

    // Pause while the pointer is over the hero, or the tab is hidden.
    const hero = slidesWrap.closest('.hero');
    hero?.addEventListener('mouseenter', () => setPaused(true));
    hero?.addEventListener('mouseleave', () => setPaused(false));
    hero?.addEventListener('focusin', () => setPaused(true));
    hero?.addEventListener('focusout', () => setPaused(false));
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));

    // Keyboard
    slidesWrap.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { show(index - 1); }
      if (e.key === 'ArrowRight') { show(index + 1); }
    });

    // Touch swipe
    let tx = null;
    slidesWrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    slidesWrap.addEventListener('touchend', e => {
      if (tx === null) return;
      const dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 45) show(index + (dx > 0 ? 1 : -1));
      tx = null;
    }, { passive: true });

    if (!reduce) restart();
  }

  /* ══ CLIENTS CAROUSEL ════════════════════════════════════════════ */
  const clTrack = document.getElementById('clTrack');
  if (clTrack) {
    const cards = Array.from(clTrack.children);
    const dotsBox = document.getElementById('clDots');
    let page = 0;

    const perPage = () => {
      const w = window.innerWidth;
      if (w <= 768) return 1;
      if (w <= 1100) return 2;
      return 3;
    };
    const pages = () => Math.max(1, Math.ceil(cards.length / perPage()));

    function buildDots() {
      dotsBox.innerHTML = '';
      for (let i = 0; i < pages(); i++) {
        const b = document.createElement('button');
        b.className = 'dot' + (i === page ? ' is-active' : '');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', 'Client page ' + (i + 1));
        b.setAttribute('aria-selected', String(i === page));
        b.innerHTML = '<i></i>';
        b.addEventListener('click', () => go(i));
        dotsBox.appendChild(b);
      }
    }

    function go(p) {
      page = Math.max(0, Math.min(p, pages() - 1));
      // Shift by whole pages using the real card width + gap.
      const style = getComputedStyle(clTrack);
      const gap = parseFloat(style.columnGap || style.gap) || 24;
      const cardW = cards[0].getBoundingClientRect().width;
      clTrack.style.transform = `translateX(-${page * perPage() * (cardW + gap)}px)`;
      dotsBox.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === page);
        d.setAttribute('aria-selected', String(i === page));
      });
    }

    document.getElementById('clPrev')?.addEventListener('click', () => go(page - 1));
    document.getElementById('clNext')?.addEventListener('click', () => go(page + 1));

    let ctx = null;
    clTrack.addEventListener('touchstart', e => { ctx = e.touches[0].clientX; }, { passive: true });
    clTrack.addEventListener('touchend', e => {
      if (ctx === null) return;
      const dx = ctx - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 45) go(page + (dx > 0 ? 1 : -1));
      ctx = null;
    }, { passive: true });

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { buildDots(); go(Math.min(page, pages() - 1)); }, 150);
    });

    buildDots();
    go(0);
  }

  /* ══ MENTOR PHOTO ════════════════════════════════════════════════
     Show an initials avatar if assets/mentor.jpg isn't there yet, so the
     page never renders a broken image. ══════════════════════════════ */
  const mentorImg = document.getElementById('mentorImg');
  const mentorFb  = document.getElementById('mentorFallback');
  if (mentorImg && mentorFb) {
    // Try the common extensions before falling back, so dropping in a .jpg
    // when the markup says .jpeg (or vice versa) still works.
    const CANDIDATES = ['assets/mentor.jpeg', 'assets/mentor.jpg',
                        'assets/mentor.png', 'assets/mentor.webp'];
    let attempt = CANDIDATES.indexOf(mentorImg.getAttribute('src'));
    if (attempt < 0) attempt = 0;

    function nextSource() {
      attempt += 1;
      if (attempt < CANDIDATES.length) {
        mentorImg.src = CANDIDATES[attempt];
        return;
      }
      mentorImg.hidden = true;
      mentorFb.hidden = false;
    }
    mentorImg.addEventListener('error', nextSource);
    // A cached 404 can resolve before this script runs.
    if (mentorImg.complete && mentorImg.naturalWidth === 0) nextSource();
  }

  /* ══ FAQ ACCORDION ═══════════════════════════════════════════════
     <details> gives us the semantics and keyboard support for free; this
     only adds the height transition and closes the other panels. ══════ */
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  faqItems.forEach(item => {
    const panel = item.querySelector('.faq-a');
    const summary = item.querySelector('summary');
    if (!panel || !summary) return;

    if (!reduce) panel.style.height = item.open ? 'auto' : '0px';

    summary.addEventListener('click', (e) => {
      if (reduce) return;                 // let the browser just toggle it
      e.preventDefault();

      const opening = !item.open;

      // Close any other open panel first.
      faqItems.forEach(other => {
        if (other === item || !other.open) return;
        const op = other.querySelector('.faq-a');
        op.style.height = op.scrollHeight + 'px';
        requestAnimationFrame(() => { op.style.height = '0px'; });
        op.addEventListener('transitionend', function done() {
          other.open = false;
          op.removeEventListener('transitionend', done);
        }, { once: true });
      });

      if (opening) {
        item.open = true;                 // must be open to measure
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = panel.scrollHeight + 'px'; });
        panel.addEventListener('transitionend', function done() {
          panel.style.height = 'auto';    // let it reflow with the text
          panel.removeEventListener('transitionend', done);
        }, { once: true });
      } else {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        panel.addEventListener('transitionend', function done() {
          item.open = false;
          panel.removeEventListener('transitionend', done);
        }, { once: true });
      }
    });
  });

  /* ══ SCROLL REVEALS ══════════════════════════════════════════════ */
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    // Stagger siblings so grids arrive in sequence.
    const seen = new Map();
    reveals.forEach(el => {
      const parent = el.parentElement;
      const i = seen.get(parent) || 0;
      seen.set(parent, i + 1);
      el.style.transitionDelay = Math.min(i, 6) * 80 + 'ms';
      io.observe(el);
    });
  }

  /* ══ COUNTERS ════════════════════════════════════════════════════ */
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';

    const target = Number(el.dataset.target) || 0;
    const decimals = Number(el.dataset.decimals) || 0;   // e.g. 8.7 CGPA
    const grouped = el.dataset.fmt === 'in';             // e.g. 9,000

    const fmt = (n) => {
      const v = decimals ? Number(n.toFixed(decimals)) : Math.round(n);
      return grouped
        ? v.toLocaleString('en-IN', { minimumFractionDigits: decimals })
        : v.toFixed(decimals);
    };

    if (reduce) { el.textContent = fmt(target); return; }

    const DUR = 1600;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / DUR, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCounter);
    } else {
      const co = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          runCounter(e.target);
          obs.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(c => co.observe(c));
    }
  }


  /* ══ CONTACT FORM ════════════════════════════════════════════════ */
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        const statusEl = document.getElementById('contactStatus');

        function setStatus(msg, kind) {
            if (!statusEl) return;
            statusEl.textContent = msg || '';
            statusEl.hidden = !msg;
            statusEl.className = 'alert' + (kind ? ' ' + kind : '');
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            if (btn.disabled) return;
            const original = btn.innerHTML;

            const payload = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                service: document.getElementById('service').selectedOptions[0]?.text || '',
                budget: document.getElementById('budget').selectedOptions[0]?.text || '',
                message: document.getElementById('message').value.trim(),
                website: document.getElementById('cwebsite')?.value || ''  // honeypot
            };

            if (payload.message.length < 10) {
                setStatus('Please tell us a little more about your project.', 'error');
                return;
            }

            setStatus('');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-circle-notch spin"></i> Sending…';

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Could not send your message.');

                btn.innerHTML = '<i class="ph ph-check-circle"></i> Message Sent!';
                btn.style.background = 'linear-gradient(135deg, #22c55e, #10b981)';
                setStatus('Thanks! We will get back to you within 24 hours.', 'success');
                contactForm.reset();
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3500);
            } catch (err) {
                setStatus(
                    (err.message || 'Something went wrong.') +
                    ' You can also reach us on WhatsApp at +91 94108 91738.',
                    'error'
                );
                btn.innerHTML = original;
                btn.disabled = false;
            }
        });
    }


  /* ══ ENROLMENT ═══════════════════════════════════════════════════
     One-month weekend programme: Saturday learning + Sunday 1:1.
     Batches start on a Saturday, so the calendar only offers Saturdays.

     Rules mirrored from api/_lib/availability.js so the calendar renders
     without a round-trip — the server re-validates every enrolment, so this
     copy can only ever show a wrong date briefly, never accept one.
     ═══════════════════════════════════════════════════════════════ */
  const calDaysEl = document.getElementById('calDays');
  if (calDaysEl) {
    const WA_NUMBER = '919410891738';

    const RULES = {
      windowDays: 60,
      startDow: 6,          // Saturday
      weeks: 4,
      minLeadHours: 12,
      startHour: 10,
      sessionMins: 60,
      plans: {
        trial:   { label: '1-Day Trial',       price: 200,  needsTime: true  },
        monthly: { label: 'Monthly Programme', price: 2000, needsTime: false }
      },
      modes: {
        online: { label: 'Online', scheduling: 'daily' },
        meerut: { label: 'In person · Meerut', scheduling: 'weekend' }
      },
      // Online hours — mirrored from DAILY_WINDOWS in availability.js
      dailyWindows: [
        { days: [1,2,3,4,5], start: '20:00', end: '22:00', step: 30 },
        { days: [0,6],       start: '10:00', end: '22:00', step: 60 }
      ]
    };
    const scheduling = () => RULES.modes[modeKey].scheduling;
    /** A trial is always a specific hour; monthly only when online. */
    const timed = () => RULES.plans[planKey].needsTime || scheduling() === 'daily';

    const form        = document.getElementById('bookingForm');
    const calMonthEl  = document.getElementById('calMonth');
    const calPrevBtn  = document.getElementById('calPrev');
    const calNextBtn  = document.getElementById('calNext');
    const weekendsEl  = document.getElementById('timeSlots');
    const weekendsMsg = document.getElementById('slotsMsg');
    const typeBtns    = document.querySelectorAll('.type[data-session]');
    const planBtns    = document.querySelectorAll('.type[data-plan]');
    const sumPlan     = document.getElementById('sumPlan');
    const sumSession  = document.getElementById('sumSession');
    const sumStart    = document.getElementById('sumDate');
    const sumEnd      = document.getElementById('sumTime');
    const sumPrice    = document.getElementById('sumPrice');
    const errorEl     = document.getElementById('bkError');
    const confirmBtn  = document.getElementById('bkConfirm');
    const confirmText = document.getElementById('bkConfirmText');
    const successEl   = document.getElementById('bkSuccess');
    const successMsg  = document.getElementById('bkSuccessMsg');
    const successCard = document.getElementById('bkSuccessCard');
    const resetBtn    = document.getElementById('bkReset');
    const waLink      = document.getElementById('bkWhatsapp');

    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    /* ── date helpers (plain YYYY-MM-DD, IST wall clock) ─────────────── */
    const pad = n => String(n).padStart(2, '0');
    const toKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    function nowIST() {
      const n = new Date();
      return new Date(n.getTime() + n.getTimezoneOffset() * 60000 + 330 * 60000);
    }
    function addDays(key, days) {
      const d = new Date(key + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    const dayOfWeek = key => new Date(key + 'T00:00:00Z').getUTCDay();
    function fmt(key) {
      const d = new Date(key + 'T00:00:00Z');
      return DAYS[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' +
             MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    }
    const fmtShort = key => {
      const d = new Date(key + 'T00:00:00Z');
      return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()].slice(0, 3);
    };

    const todayKey = toKey(nowIST());
    const lastKey  = addDays(todayKey, RULES.windowDays);

    /** Same-day enrolment closes MIN_LEAD_HOURS before the session starts. */
    function tooLate(key) {
      if (key < todayKey) return true;
      if (key > todayKey) return false;
      const n = nowIST();
      return (RULES.startHour * 60) - (n.getHours() * 60 + n.getMinutes()) < RULES.minLeadHours * 60;
    }
    const toMins = t => Number(t.slice(0,2)) * 60 + Number(t.slice(3,5));
    const toTimeLabel = t => {
      const m = toMins(t), h24 = Math.floor(m/60), mm = m%60;
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return h12 + ':' + pad(mm) + ' ' + (h24 >= 12 ? 'PM' : 'AM');
    };
    function slotPast(key, time) {
      if (key < todayKey) return true;
      if (key > todayKey) return false;
      const n = nowIST();
      return toMins(time) < n.getHours() * 60 + n.getMinutes() + 60;
    }
    /** Local mirror of the server's daily slot generation. */
    function localSlots(key) {
      const win = RULES.dailyWindows.find(w => w.days.includes(dayOfWeek(key)));
      if (!win) return [];
      const out = [];
      for (let t = toMins(win.start); t + RULES.sessionMins <= toMins(win.end); t += win.step) {
        const time = pad(Math.floor(t/60)) + ':' + pad(t%60);
        out.push({ time, label: toTimeLabel(time), available: !slotPast(key, time) });
      }
      return out;
    }

    /** Is this day selectable in the calendar for the current mode? */
    function isStart(key) {
      if (key < todayKey || key > lastKey) return false;
      return timed()
        ? localSlots(key).some(s => s.available)
        : dayOfWeek(key) === RULES.startDow && !tooLate(key);
    }

    /* ── state ───────────────────────────────────────────────────────── */
    let viewYear   = nowIST().getFullYear();
    let viewMonth  = nowIST().getMonth();
    let startDate  = null;
    let chosenTime = null;
    let modeKey    = 'online';
    let planKey    = 'trial';
    let price      = 200;
    let listPrice  = 3000;
    let seatsByDate = new Map();
    let request    = 0;
    let submitting = false;

    const rupees = n => '₹' + Number(n).toLocaleString('en-IN');

    const stepDateEl = document.querySelector('.bk-cal .stp');
    const stepSlotEl = document.querySelector('.bk-time .stp');
    const calNoteEl  = document.querySelector('.cal-note');

    /** Step 2 and 3 mean different things per mode, so relabel them. */
    function updateStepLabels() {
      const weekend = !timed();
      if (stepDateEl) {
        stepDateEl.innerHTML = '<span class="stp-n">2</span> ' +
          (weekend ? 'Pick your start Saturday' : 'Pick your start date');
      }
      if (stepSlotEl) {
        stepSlotEl.innerHTML = '<span class="stp-n">3</span> ' +
          (weekend ? 'Your four weekends' : 'Pick your weekly time');
      }
      if (calNoteEl) {
        calNoteEl.lastChild.textContent = weekend
          ? " Only Saturdays — that's when each in-person batch begins."
          : ' Online runs every day: weeknights 8–10 PM, weekends 10 AM–10 PM.';
      }
    }

    /* ── calendar ────────────────────────────────────────────────────── */
    function renderCalendar() {
      const daysIn = new Date(viewYear, viewMonth + 1, 0).getDate();
      const offset = new Date(viewYear, viewMonth, 1).getDay();

      calMonthEl.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      calDaysEl.innerHTML = '';

      for (let i = 0; i < offset; i++) {
        const blank = document.createElement('div');
        blank.className = 'cal-day empty';
        calDaysEl.appendChild(blank);
      }

      for (let d = 1; d <= daysIn; d++) {
        const key = viewYear + '-' + pad(viewMonth + 1) + '-' + pad(d);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-day';
        btn.textContent = d;

        if (key === todayKey) btn.classList.add('today');

        const seat = seatsByDate.get(key);
        const full = seat && seat.available === false;

        if (isStart(key) && !full) {
          btn.classList.add('available');
          if (key === startDate) btn.classList.add('selected');
          btn.setAttribute('aria-label', 'Batch starting ' + fmt(key));
          if (seat && seat.seatsLeft != null && seat.seatsLeft <= 5) {
            btn.classList.add('few');
            btn.title = seat.seatsLeft + ' seats left';
          }
          btn.addEventListener('click', () => {
            startDate = key;
            chosenTime = null;
            slotData = [];
            renderCalendar();
            renderStep3();
            updateSummary();
            if (timed()) loadBatches();   // live times for this day
          });
        } else {
          btn.classList.add('off');
          btn.disabled = true;
          if (full) btn.title = 'This batch is full';
        }
        calDaysEl.appendChild(btn);
      }

      calPrevBtn.disabled = (viewYear === nowIST().getFullYear() && viewMonth === nowIST().getMonth());
      const last = new Date(lastKey + 'T00:00:00Z');
      calNextBtn.disabled = (viewYear === last.getUTCFullYear() && viewMonth === last.getUTCMonth());
    }

    /* ── step 3: weekends (Meerut) or time slots (online) ────────────── */
    let slotData = [];   // live slots for the chosen online date

    function renderStep3() {
      weekendsEl.innerHTML = '';

      if (!startDate) {
        weekendsMsg.textContent = timed()
          ? 'Pick a date to see available times.'
          : 'Pick a start Saturday to see your weekend dates.';
        weekendsMsg.hidden = false;
        return;
      }

      /* Meerut — show the four weekends the batch covers */
      if (!timed()) {
        weekendsEl.classList.remove('slots-time');
        for (let w = 0; w < RULES.weeks; w++) {
          const sat = addDays(startDate, w * 7);
          const sun = addDays(sat, 1);
          const card = document.createElement('div');
          card.className = 'weekend';
          card.innerHTML =
            '<span class="wk-n">Weekend ' + (w + 1) + '</span>' +
            '<span class="wk-d"><b>Sat</b> ' + fmtShort(sat) + ' · Learning</span>' +
            '<span class="wk-d"><b>Sun</b> ' + fmtShort(sun) + ' · 1:1</span>';
          weekendsEl.appendChild(card);
        }
        const seat = seatsByDate.get(startDate);
        weekendsMsg.textContent = seat && seat.seatsLeft != null
          ? seat.seatsLeft + ' seat' + (seat.seatsLeft === 1 ? '' : 's') + ' left in this batch.'
          : '';
        weekendsMsg.hidden = !weekendsMsg.textContent;
        return;
      }

      /* Online — pick the time you will hold each week */
      weekendsEl.classList.add('slots-time');
      const list = slotData.length ? slotData : localSlots(startDate);
      if (!list.length) {
        weekendsMsg.textContent = 'No times left on this date. Please pick another day.';
        weekendsMsg.hidden = false;
        return;
      }
      list.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-slot';
        btn.textContent = slot.label;
        btn.disabled = !slot.available;
        if (!slot.available) {
          btn.title = slot.reason === 'full' ? 'This time is full' : 'This time has passed';
        }
        if (slot.time === chosenTime) btn.classList.add('active');
        if (slot.available && slot.seatsLeft != null && slot.seatsLeft <= 5) {
          btn.classList.add('few-left');
          btn.title = slot.seatsLeft + ' seats left';
        }
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          chosenTime = slot.time;
          weekendsEl.querySelectorAll('.time-slot').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateSummary();
        });
        weekendsEl.appendChild(btn);
      });
      const open = list.filter(s => s.available).length;
      weekendsMsg.textContent = open ? 'This is the time you hold each week for four weeks.' : '';
      weekendsMsg.hidden = !weekendsMsg.textContent;
    }
    const renderWeekends = renderStep3;   // keep the old call sites working

    /* ── live batch availability ─────────────────────────────────────── */
    async function loadBatches() {
      const ticket = ++request;
      try {
        const qs = '/api/slots?mode=' + encodeURIComponent(modeKey) +
                   '&plan=' + encodeURIComponent(planKey) +
                   (timed() && startDate ? '&date=' + encodeURIComponent(startDate) : '');
        const res = await fetch(qs);
        if (ticket !== request) return;
        if (!res.ok) throw new Error('unavailable');
        const data = await res.json();
        if (ticket !== request) return;

        price = data.price != null ? data.price : price;
        listPrice = data.listPrice != null ? data.listPrice : listPrice;
        if (data.slots) slotData = data.slots;
        if (data.batches) seatsByDate = new Map(data.batches.map(b => [b.date, b]));

        // A batch chosen earlier may have filled up under a different mode.
        if (startDate) {
          const seat = seatsByDate.get(startDate);
          if (seat && seat.available === false) startDate = null;
        }
        renderCalendar();
        renderWeekends();
        updateSummary();
      } catch {
        // API unreachable — the local rules still give a usable calendar and
        // the server rejects anything invalid on submit.
        if (ticket !== request) return;
      }
    }

    /* ── summary ─────────────────────────────────────────────────────── */
    function updateSummary() {
      if (sumPlan) sumPlan.textContent = RULES.plans[planKey].label;
      sumSession.textContent = RULES.modes[modeKey].label;
      const endLabel = document.querySelector('.sum div:nth-child(4) dt');
      if (endLabel) endLabel.textContent = timed() ? 'Your time' : 'Ends';

      if (startDate) {
        sumStart.textContent = fmt(startDate);
        sumStart.classList.remove('pending');
        sumEnd.textContent = planKey === 'trial'
          ? '1 hour, one session'
          : fmt(addDays(startDate, RULES.weeks * 7 - 1));
        sumEnd.classList.remove('pending');
      } else {
        sumStart.textContent = 'Select a Saturday';
        sumStart.classList.add('pending');
        sumEnd.textContent = '—';
        sumEnd.classList.add('pending');
      }

      // Online holds a weekly time; Meerut ends after the fourth weekend.
      if (timed()) {
        sumEnd.textContent = chosenTime ? toTimeLabel(chosenTime) + ' IST, weekly' : 'Select a time';
        sumEnd.classList.toggle('pending', !chosenTime);
      }

      sumPrice.innerHTML = price < listPrice
        ? '<s>' + rupees(listPrice) + '</s> ' + rupees(price)
        : rupees(price);

      confirmText.textContent = 'Book on WhatsApp · ' + rupees(price);
      confirmBtn.disabled = submitting || !startDate ||
                            (timed() && !chosenTime);
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = !msg;
      if (msg) errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ── plan ────────────────────────────────────────────────────────── */
    function setPlan(next) {
      if (!RULES.plans[next]) return;
      planKey = next;
      planBtns.forEach(b => b.classList.toggle('is-on', b.dataset.plan === next));
      // The valid days differ between a trial and the monthly batch.
      startDate = null;
      chosenTime = null;
      slotData = [];
      price = RULES.plans[next].price;
      updateStepLabels();
      renderCalendar();
      renderStep3();
      updateSummary();
      loadBatches();
    }
    planBtns.forEach(btn => btn.addEventListener('click', () => setPlan(btn.dataset.plan)));

    /* The pricing panel above mirrors the same choice. */
    const ppTabs = document.querySelectorAll('.pp-tab');
    const ppPanels = document.querySelectorAll('.pp-panel');
    function showPlanPanel(next) {
      ppTabs.forEach(t => {
        const on = t.dataset.plan === next;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      });
      ppPanels.forEach(pnl => { pnl.hidden = pnl.dataset.panel !== next; });
    }
    ppTabs.forEach(t => t.addEventListener('click', () => {
      showPlanPanel(t.dataset.plan);
      setPlan(t.dataset.plan);
    }));
    document.querySelectorAll('[data-plan-cta]').forEach(a =>
      a.addEventListener('click', () => {
        showPlanPanel(a.dataset.planCta);
        setPlan(a.dataset.planCta);
      }));

    /* ── mode ────────────────────────────────────────────────────────── */
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        modeKey = btn.dataset.session;
        // The two modes allow different days, so start the pick again.
        startDate = null;
        chosenTime = null;
        slotData = [];
        updateStepLabels();
        renderCalendar();
        renderStep3();
        updateSummary();
        loadBatches();
      });
    });

    /* ── month navigation ────────────────────────────────────────────── */
    calPrevBtn.addEventListener('click', () => {
      if (--viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderCalendar();
    });
    calNextBtn.addEventListener('click', () => {
      if (++viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar();
    });

    /* ── submit ──────────────────────────────────────────────────────── */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting || !startDate) return;
      if (timed() && !chosenTime) return showError('Please pick a time slot.');

      const val = id => (document.getElementById(id).value || '').trim();
      const payload = {
        mode: modeKey,
        date: startDate,
        plan: planKey,
        time: timed() ? chosenTime : undefined,
        name: val('bkName'),
        email: val('bkEmail'),
        phone: val('bkPhone'),
        college: val('bkCollege'),
        year: document.getElementById('bkYear').value,
        topic: val('bkTopic')
      };

      if (payload.name.length < 2) return showError('Please enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email))
        return showError('Please enter a valid email address.');
      if (payload.phone.replace(/\D/g, '').length < 10)
        return showError('Please enter a valid 10-digit mobile number.');

      showError('');
      submitting = true;
      confirmBtn.disabled = true;
      const original = confirmBtn.innerHTML;
      confirmBtn.innerHTML = 'Reserving your slot…';

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (data.code === 'SLOT_TAKEN') {
            if (timed()) chosenTime = null; else startDate = null;
            loadBatches();
          }
          throw new Error(data.error || 'We could not complete your enrolment.');
        }

        // Manual mode: open WhatsApp with the booking pre-filled, then show
        // the confirmation panel so the student keeps their reference.
        if (data.whatsappUrl) {
          confirmBtn.innerHTML = 'Opening WhatsApp…';
          window.open(data.whatsappUrl, '_blank', 'noopener');
          showSuccess(data.booking || {}, data.whatsappUrl);
          return;
        }
        if (data.requiresPayment && data.paymentUrl) {
          confirmBtn.innerHTML = 'Redirecting to payment…';
          window.location.href = data.paymentUrl;
          return;
        }
        showSuccess(data.booking || {});
      } catch (err) {
        showError(err.message || 'Something went wrong. Please try again or message us on WhatsApp.');
        confirmBtn.innerHTML = original;
      } finally {
        submitting = false;
        updateSummary();
      }
    });

    function showSuccess(booking, waUrl) {
      form.hidden = true;
      successEl.hidden = false;

      const title = document.getElementById('bkSuccessTitle');
      if (title) title.textContent = waUrl
        ? 'Almost there — send us the message'
        : 'You’re booked in';
      successMsg.textContent = waUrl
        ? 'We’ve opened WhatsApp with your booking details. Send that message and Kanishka will confirm your slot and share payment details.'
        : 'We’ve emailed your confirmation, and we’ll send joining details before the session.';

      const isTrial = booking.kind === 'trial';
      successCard.innerHTML =
        '<div><dt>Reference</dt><dd>' + (booking.bookingId || '—') + '</dd></div>' +
        '<div><dt>Plan</dt><dd>' + (booking.planLabel || '') + '</dd></div>' +
        '<div><dt>Attending</dt><dd>' + (booking.modeLabel || '') + '</dd></div>' +
        '<div><dt>' + (isTrial ? 'Date' : 'Starts') + '</dt><dd>' + (booking.dateLabel || '') + '</dd></div>' +
        (booking.needsTime
          ? '<div><dt>Time</dt><dd>' + (booking.timeLabel || '') + ' IST</dd></div>'
          : '') +
        (!isTrial && !booking.needsTime
          ? '<div><dt>Ends</dt><dd>' + (booking.endDateLabel || '') + '</dd></div>'
          : '') +
        '<div><dt>Amount</dt><dd>₹' + Number(booking.amount || 0).toLocaleString('en-IN') + '</dd></div>';

      // If the popup was blocked, give them a link they can click instead.
      const again = document.getElementById('bkWaAgain');
      if (again) {
        again.hidden = !waUrl;
        if (waUrl) again.href = waUrl;
      }
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    resetBtn.addEventListener('click', () => {
      form.reset();
      startDate = null;
      chosenTime = null;
      slotData = [];
      successEl.hidden = true;
      form.hidden = false;
      showError('');
      loadBatches();
      renderCalendar();
      renderWeekends();
      updateSummary();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Keep the WhatsApp fallback in step with the current selection.
    form.addEventListener('change', () => {
      if (!startDate) return;
      const when = timed() && chosenTime
        ? ' at ' + toTimeLabel(chosenTime) + ' weekly'
        : '';
      const msg = 'Hi Krevol, I want to enrol in the programme (' +
                  RULES.modes[modeKey].label + ') starting ' + fmt(startDate) + when + '.';
      waLink.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
    });

    setPlan('trial');
    updateStepLabels();
    renderCalendar();
    renderStep3();
    updateSummary();
    loadBatches();
  }

});
