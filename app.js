/* Agora Konzept Website. Technik wie Bam Bird und Ma'Loa: GSAP ScrollSmoother, ScrollTrigger mit pin und scrub.
   Herzstück: die Agora Platte setzt sich beim Scrollen zusammen (Video wird vor und zurück gespult, komplett als Blob geladen).
   Dazu Wort für Wort, horizontale Meze Reihe, Parallax in den Bögen, Stern dreht sich mit dem Scrollen. */
(function(){
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  var mobile = window.matchMedia("(max-width:820px)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* Videos komplett als Blob laden, mit Fortschritt im Loader */
  var vids = [].slice.call(document.querySelectorAll("video[data-src]"));
  var loaded = vids.map(function(){return 0;}), totals = vids.map(function(){return 1;});
  var bar = document.querySelector(".ld-bar i"), num = document.querySelector(".ld-num span");
  function progress(){
    var a = 0, b = 0;
    for (var i = 0; i < vids.length; i++){ a += loaded[i]; b += totals[i]; }
    var p = Math.min(100, Math.round(a / b * 100)); bar.style.width = p + "%"; num.textContent = p;
  }
  function loadVideo(v, i){
    var url = v.getAttribute("data-src") + (mobile ? "_m.mp4" : ".mp4");
    return fetch(url).then(function(r){
      if (!r.ok || !r.body) throw new Error("http");
      totals[i] = +r.headers.get("content-length") || 3e6;
      var reader = r.body.getReader(), chunks = [];
      function pump(){ return reader.read().then(function(res){
        if (res.done) return new Blob(chunks, {type:"video/mp4"});
        chunks.push(res.value); loaded[i] += res.value.length; progress(); return pump(); }); }
      return pump();
    }).then(function(blob){
      v.preload = "auto"; v.src = URL.createObjectURL(blob); v.load(); loaded[i] = totals[i]; progress();
      return new Promise(function(res){
        function ok(){ try { v.currentTime = 0.001; } catch(e){} res(); }
        if (v.readyState >= 1) return ok();
        v.addEventListener("loadedmetadata", ok, {once:true}); setTimeout(res, 4000);
      });
    }).catch(function(){ v.src = url; loaded[i] = totals[i]; progress(); });
  }
  var timeout = new Promise(function(res){ setTimeout(res, 20000); });
  var pinImgs = [].slice.call(document.querySelectorAll(".mz-track img, .hero-arch img, .par img")).map(function(im){
    var d = (im.decode ? im.decode() : Promise.resolve()).catch(function(){});
    return Promise.race([d, new Promise(function(r){ setTimeout(r, 2500); })]);
  });
  var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function(){}) : Promise.resolve();
  Promise.race([Promise.all(vids.map(loadVideo).concat([fonts], pinImgs)), timeout]).then(start);

  function scrubber(v){
    var target = 0, cur = 0;
    gsap.ticker.add(function(){
      if (!v.duration) return;
      cur += (target - cur) * 0.35;
      if (Math.abs(v.currentTime - cur) > 0.012) { try { v.currentTime = cur; } catch(e){} }
    });
    return function(p){ if (v.duration) target = Math.max(0, Math.min(v.duration - 0.05, p * v.duration)); };
  }

  function start(){
    document.getElementById("loader").classList.add("done");
    document.body.classList.remove("loading");
    if (!reduce) ScrollSmoother.create({ wrapper:"#smooth-wrapper", content:"#smooth-content", smooth:1.2, smoothTouch:0.1, effects:true });

    /* 1 Hero: Zeilen fahren ein, Bogen öffnet sich, Stern dreht mit dem Scrollen */
    gsap.from(".hero h1 span", {yPercent:70, opacity:0, stagger:.15, duration:1.3, ease:"power3.out", delay:.3});
    gsap.from(".kicker, .lead", {opacity:0, y:14, stagger:.15, duration:1, delay:.5});
    gsap.from(".hero-arch", {clipPath:"inset(100% 0 0 0)", duration:1.6, ease:"power3.inOut", delay:.1});
    var heroTl = gsap.timeline({ scrollTrigger:{ trigger:".hero", start:"top top", end:"+=1400", pin:true, scrub:true } });
    heroTl.to(".hero-star", {rotate:135, ease:"none", duration:1}, 0)
          .to(".hero-arch img", {scale:1, ease:"none", duration:1}, 0)
          .to(".hero-type", {yPercent:-14, opacity:.2, ease:"none", duration:1}, 0)
          .to(".scroll-hint", {opacity:0, duration:.1}, 0);

    /* 2 Wort für Wort */
    document.querySelectorAll(".reveal").forEach(function(el){
      el.innerHTML = el.textContent.trim().split(/\s+/).map(function(w){ return '<span class="w">' + w + '</span>'; }).join(" ");
      gsap.to(el.querySelectorAll(".w"), { opacity:1, stagger:.1, ease:"none",
        scrollTrigger:{ trigger:el, start:"top 80%", end:"bottom 50%", scrub:true } });
    });
    gsap.from(".facts li", { y:70, opacity:0, stagger:.12, scrollTrigger:{ trigger:".facts", start:"top 92%", end:"top 58%", scrub:true } });

    /* 3 Herzstück: Labels erscheinen, dann wandert alles auf die Platte */
    var v = document.getElementById("v-build"), setV = scrubber(v);
    var labels = gsap.utils.toArray(".labels li");
    var VS = .34, VE = .94;
    var bdTl = gsap.timeline({ scrollTrigger:{ trigger:".bd-pin", start:"top top", end:"+=3200", pin:true, scrub:true,
      onUpdate:function(s){ setV(Math.max(0, Math.min(1, (s.progress - VS) / (VE - VS)))); } } });
    bdTl.to({}, {duration:1}, 0);
    labels.forEach(function(l, i){
      bdTl.fromTo(l, {opacity:0, x:30}, {opacity:1, x:0, duration:.035, ease:"power2.out"}, .04 + i * .045);
      var out = parseFloat(l.getAttribute("data-out"));
      bdTl.to(l, {opacity:.28, duration:.03}, VS + out * (VE - VS) - .03);
    });
    bdTl.fromTo(".bd-done", {opacity:0, y:16}, {opacity:1, y:0, duration:.04}, VE - .02);
    gsap.from(".bd-head > *", { y:50, opacity:0, stagger:.1, scrollTrigger:{ trigger:".build", start:"top 70%", end:"top 15%", scrub:true } });

    /* 4 Meze fahren horizontal durch */
    var tr = document.querySelector(".mz-track");
    function dist(){ return Math.max(0, tr.scrollWidth - window.innerWidth + 40); }
    gsap.to(tr, { x:function(){ return -dist(); }, ease:"none",
      scrollTrigger:{ trigger:".mz-pin", start:"top top", end:function(){ return "+=" + (dist() + 300); }, pin:true, scrub:true, invalidateOnRefresh:true } });
    gsap.from(".mz-track .card", { y:90, opacity:0, stagger:.07, scrollTrigger:{ trigger:".meze", start:"top 88%", end:"top 25%", scrub:true } });

    /* 5 Grill: Kreise drehen leicht ein, Text kommt */
    gsap.utils.toArray(".gr").forEach(function(g){
      gsap.from(g.querySelector("figure"), { scale:.8, rotate:-12, opacity:0, ease:"power2.out", scrollTrigger:{ trigger:g, start:"top 92%", end:"top 45%", scrub:true } });
      gsap.from(g.querySelector("div"), { y:60, opacity:0, scrollTrigger:{ trigger:g, start:"top 85%", end:"top 50%", scrub:true } });
    });

    /* 6 Parallax in den Bögen */
    gsap.utils.toArray(".par img").forEach(function(img){
      gsap.fromTo(img, {yPercent:-8}, {yPercent:0, ease:"none", scrollTrigger:{ trigger:img.parentNode, start:"top bottom", end:"bottom top", scrub:true } });
    });
    gsap.utils.toArray(".rm-txt, .ev-txt, .sw-txt, .bs-col").forEach(function(t){
      gsap.from(t, { y:60, opacity:0, scrollTrigger:{ trigger:t, start:"top 92%", end:"top 60%", scrub:true } });
    });
    gsap.from(".sw-img .arch", { clipPath:"inset(100% 0 0 0)", scrollTrigger:{ trigger:".sweet", start:"top 80%", end:"top 30%", scrub:true } });
    gsap.from(".end-logo", { scale:.75, opacity:0, scrollTrigger:{ trigger:".end", start:"top 80%", end:"top 35%", scrub:true } });

    /* Menüleiste: auf dunklen Flächen Kalk, sonst Terrakotta */
    var barEl = document.querySelector(".bar"), darks = [].slice.call(document.querySelectorAll(".build,.grill,.events,.end"));
    gsap.ticker.add(function(){
      var on = false;
      for (var k = 0; k < darks.length; k++){ var r = darks[k].getBoundingClientRect(); if (r.top < 46 && r.bottom > 46){ on = true; break; } }
      barEl.classList.toggle("on-dark", on);
    });

    document.querySelectorAll('.bar a[href^="#"]').forEach(function(a){
      a.addEventListener("click", function(e){
        var t = document.querySelector(a.getAttribute("href")); if (!t) return;
        e.preventDefault(); var sm = ScrollSmoother.get();
        if (sm) sm.scrollTo(t, true, "top top"); else t.scrollIntoView({behavior:"smooth"});
      });
    });
    ScrollTrigger.refresh();
    window.addEventListener("load", function(){ ScrollTrigger.refresh(); });
  }
})();
