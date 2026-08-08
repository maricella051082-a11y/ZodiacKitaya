(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const world = document.getElementById("world");
  const objectsRoot = document.getElementById("objects");
  const player = document.getElementById("player");
  const livesRoot = document.getElementById("lives");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const challengeBox = document.getElementById("challenge");
  const challengeText = document.getElementById("challengeText");
  const message = document.getElementById("message");
  const startScreen = document.getElementById("startScreen");
  const resultScreen = document.getElementById("resultScreen");
  const startButton = document.getElementById("startButton");
  const replayButton = document.getElementById("replayButton");
  const soundButton = document.getElementById("soundButton");
  const music = document.getElementById("music");

  const WORLD_END = 5650;
  const PLAYER_WORLD_X = 250;
  const LANE_COUNT = 3;
  const MAX_LIVES = 5;

  const levelObjects = [
    {type:"token", x:650, lane:1},
    {type:"token", x:730, lane:1},
    {type:"token", x:810, lane:1},
    {type:"obstacle", x:930, lane:1},
    {type:"token", x:1110, lane:0},
    {type:"token", x:1190, lane:0},
    {type:"token", x:1270, lane:0},
    {type:"obstacle", x:1450, lane:0},
    {type:"token", x:1600, lane:1},
    {type:"token", x:1680, lane:1},
    {type:"token", x:1760, lane:1},

    {type:"gate", x:2200, lane:0, hanzi:"马", challenge:0},
    {type:"gate", x:2200, lane:1, hanzi:"兔", challenge:0, correct:true},
    {type:"gate", x:2200, lane:2, hanzi:"羊", challenge:0},

    {type:"token", x:2500, lane:2},
    {type:"token", x:2580, lane:2},
    {type:"token", x:2660, lane:2},
    {type:"obstacle", x:2830, lane:2},
    {type:"token", x:3070, lane:1},
    {type:"token", x:3150, lane:1},
    {type:"token", x:3230, lane:1},
    {type:"obstacle", x:3460, lane:1},

    {type:"gate", x:4100, lane:0, hanzi:"牛", challenge:1},
    {type:"gate", x:4100, lane:1, hanzi:"狗", challenge:1},
    {type:"gate", x:4100, lane:2, hanzi:"虎", challenge:1, correct:true},

    {type:"token", x:4440, lane:0},
    {type:"token", x:4520, lane:0},
    {type:"token", x:4600, lane:0},
    {type:"obstacle", x:4780, lane:0},
    {type:"token", x:5000, lane:1},
    {type:"token", x:5080, lane:1},
    {type:"token", x:5160, lane:1}
  ];

  const challenges = [
    {at:1850, until:2320, text:'找到“兔”', correctLane:1},
    {at:3750, until:4220, text:'找到“虎”', correctLane:2}
  ];

  let state;
  let lastTime = 0;
  let raf = 0;
  let touchStartY = null;

  function freshState(){
    return {
      running:false,
      distance:0,
      speed:265,
      lane:1,
      lives:MAX_LIVES,
      jumping:false,
      jumpTime:0,
      jumpDuration:.72,
      jumpHeight:118,
      invulnerableUntil:0,
      tokens:0,
      totalTokens:levelObjects.filter(x=>x.type==="token").length,
      signs:0,
      resolvedChallenges:new Set(),
      collected:new Set(),
      hitObstacles:new Set(),
      ended:false,
      sound:true
    };
  }

  function renderLives(){
    livesRoot.innerHTML = Array.from({length:MAX_LIVES}, (_,i) =>
      `<img class="life ${i < state.lives ? "" : "is-lost"}" src="assets/ui/jade-guardian.png" alt="">`
    ).join("");
  }

  function buildLevel(){
    objectsRoot.innerHTML = "";
    levelObjects.forEach((o,index) => {
      const el = document.createElement("div");
      el.className = `object ${o.type === "gate" ? "sign-gate" : o.type}`;
      el.dataset.index = index;
      el.style.setProperty("--x", o.x);
      el.style.setProperty("--lane", o.lane);
      if(o.type === "token") el.textContent = "玉";
      if(o.type === "gate") el.innerHTML = `<b>${o.hanzi}</b>`;
      objectsRoot.appendChild(el);
    });
  }

  function reset(){
    cancelAnimationFrame(raf);
    state = freshState();
    lastTime = 0;
    world.style.transform = "translateX(0px)";
    player.style.setProperty("--lane", state.lane);
    player.style.setProperty("--jump", "0px");
    player.classList.remove("is-jumping","is-hit");
    challengeBox.hidden = true;
    message.className = "runner-message";
    resultScreen.hidden = true;
    progressFill.style.width = "0%";
    progressText.textContent = "0%";
    renderLives();
    buildLevel();
  }

  function start(){
    reset();
    startScreen.hidden = true;
    state.running = true;
    if(state.sound){
      music.volume = .11;
      music.play().catch(()=>{});
    }
    raf = requestAnimationFrame(loop);
  }

  function loop(t){
    if(!state.running) return;
    if(!lastTime) lastTime = t;
    const dt = Math.min((t-lastTime)/1000,.034);
    lastTime = t;

    state.distance += state.speed * dt;
    state.speed = Math.min(325,265 + state.distance/120);
    updateJump(dt);
    updateWorld();
    checkChallengePrompt();
    checkObjects(t);
    checkFinish();

    if(state.running) raf = requestAnimationFrame(loop);
  }

  function updateWorld(){
    const stageWidth = stage.clientWidth;
    const pxPerWorld = Math.max(.84, Math.min(1.05, stageWidth/1200));
    const scrollX = Math.max(0, state.distance - PLAYER_WORLD_X);
    world.style.transform = `translateX(${-scrollX * pxPerWorld}px)`;

    const progress = Math.min(100,Math.round((state.distance/WORLD_END)*100));
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    player.style.setProperty("--lane", state.lane);
  }

  function updateJump(dt){
    if(!state.jumping) return;
    state.jumpTime += dt;
    const p = Math.min(1,state.jumpTime/state.jumpDuration);
    const arc = Math.sin(Math.PI*p);
    player.style.setProperty("--jump", `${arc*state.jumpHeight}px`);
    if(p >= 1){
      state.jumping = false;
      state.jumpTime = 0;
      player.style.setProperty("--jump","0px");
      player.classList.remove("is-jumping");
    }
  }

  function jump(){
    if(!state.running || state.jumping) return;
    state.jumping = true;
    state.jumpTime = 0;
    player.classList.add("is-jumping");
  }

  function moveLane(delta){
    if(!state.running) return;
    state.lane = Math.max(0,Math.min(LANE_COUNT-1,state.lane+delta));
    player.style.setProperty("--lane", state.lane);
  }

  function checkChallengePrompt(){
    const active = challenges.find((c,i) =>
      !state.resolvedChallenges.has(i) &&
      state.distance >= c.at &&
      state.distance <= c.until
    );
    if(active){
      challengeText.textContent = active.text;
      challengeBox.hidden = false;
    }else{
      challengeBox.hidden = true;
    }
  }

  function checkObjects(now){
    const playerX = state.distance + PLAYER_WORLD_X;
    const jumpPx = currentJumpHeight();

    levelObjects.forEach((o,index)=>{
      const dx = Math.abs(o.x-playerX);
      if(o.type === "token"){
        if(state.collected.has(index)) return;
        if(dx < 55 && o.lane === state.lane){
          state.collected.add(index);
          state.tokens++;
          objectsRoot.querySelector(`[data-index="${index}"]`)?.classList.add("is-collected");
          flash(`Нефрит ${state.tokens}/${state.totalTokens}`);
        }
      }

      if(o.type === "obstacle"){
        if(state.hitObstacles.has(index)) return;
        if(dx < 48 && o.lane === state.lane && jumpPx < 62){
          state.hitObstacles.add(index);
          loseLife(now,"Камень!");
        }
      }

      if(o.type === "gate"){
        if(state.resolvedChallenges.has(o.challenge)) return;
        if(playerX >= o.x-12){
          const challenge = challenges[o.challenge];
          state.resolvedChallenges.add(o.challenge);
          const gates = [...objectsRoot.querySelectorAll(`.sign-gate`)].filter(el => {
            const meta = levelObjects[Number(el.dataset.index)];
            return meta.challenge === o.challenge;
          });
          if(state.lane === challenge.correctLane){
            state.signs++;
            gates.forEach(el=>{
              const meta=levelObjects[Number(el.dataset.index)];
              el.classList.toggle("is-correct",meta.lane===challenge.correctLane);
              el.classList.toggle("is-wrong",meta.lane!==challenge.correctLane);
            });
            flash("Верный знак · 正确");
          }else{
            gates.forEach(el=>{
              const meta=levelObjects[Number(el.dataset.index)];
              el.classList.toggle("is-correct",meta.lane===challenge.correctLane);
              el.classList.toggle("is-wrong",meta.lane!==challenge.correctLane);
            });
            loseLife(now,"Неверный знак");
          }
        }
      }
    });
  }

  function currentJumpHeight(){
    if(!state.jumping) return 0;
    const p = Math.min(1,state.jumpTime/state.jumpDuration);
    return Math.sin(Math.PI*p)*state.jumpHeight;
  }

  function loseLife(now, text){
    if(now < state.invulnerableUntil || state.lives <= 0) return;
    state.invulnerableUntil = now + 950;
    state.lives--;
    renderLives();
    player.classList.remove("is-hit");
    void player.offsetWidth;
    player.classList.add("is-hit");
    flash(text);
    if(state.lives <= 0){
      state.running = false;
      music.pause();
      setTimeout(()=>showResult(false),450);
    }
  }

  function flash(text){
    message.textContent = text;
    message.className = "runner-message";
    void message.offsetWidth;
    message.classList.add("is-visible");
  }

  function checkFinish(){
    if(state.distance < WORLD_END || state.ended) return;
    state.ended = true;
    state.running = false;
    music.pause();
    showResult(true);
  }

  function showResult(victory){
    resultScreen.hidden = false;
    const perfectSigns = state.signs === challenges.length;
    const tokenRate = state.tokens / state.totalTokens;
    let stars = victory ? 1 : 0;
    if(victory && state.lives >= 3) stars = 2;
    if(victory && state.lives === 5 && perfectSigns && tokenRate >= .8) stars = 3;

    const starRoot = document.getElementById("resultStars");
    starRoot.innerHTML = Array.from({length:3},(_,i)=>`<span class="${i<stars?"":"off"}">★</span>`).join("");
    document.getElementById("resultLives").textContent = `${state.lives} / ${MAX_LIVES}`;
    document.getElementById("resultSigns").textContent = `${state.signs} / ${challenges.length}`;
    document.getElementById("resultTokens").textContent = `${state.tokens} / ${state.totalTokens}`;

    const title = resultScreen.querySelector("h2");
    const small = resultScreen.querySelector("small");
    if(victory){
      small.textContent = "胜 · ПУТЬ ЗАВЕРШЁН";
      title.textContent = "山间古道";
    }else{
      small.textContent = "ХРАНИТЕЛИ ПОТЕРЯНЫ";
      title.textContent = "Путь прерван";
    }
  }

  function setSound(on){
    state.sound = on;
    soundButton.setAttribute("aria-pressed",String(on));
    soundButton.setAttribute("aria-label",on?"Выключить звук":"Включить звук");
    soundButton.querySelector("img").src = `assets/ui/${on?"sound-button":"sound-off"}.png?v=4`;
    if(!on) music.pause();
    else if(state.running) music.play().catch(()=>{});
  }

  document.addEventListener("keydown", e=>{
    if(["ArrowUp","ArrowDown","Space","KeyW","KeyS"].includes(e.code)) e.preventDefault();
    if(e.code==="ArrowUp" || e.code==="KeyW") moveLane(-1);
    if(e.code==="ArrowDown" || e.code==="KeyS") moveLane(1);
    if(e.code==="Space") jump();
  }, {passive:false});

  document.querySelectorAll("[data-control]").forEach(btn=>{
    btn.addEventListener("pointerdown", e=>{
      e.preventDefault();
      const c=btn.dataset.control;
      if(c==="up") moveLane(-1);
      if(c==="down") moveLane(1);
      if(c==="jump") jump();
    });
  });

  stage.addEventListener("pointerdown", e=>{
    if(e.target.closest("button") || !state.running) return;
    touchStartY = e.clientY;
  });
  stage.addEventListener("pointerup", e=>{
    if(e.target.closest("button") || !state.running || touchStartY===null) return;
    const dy=e.clientY-touchStartY;
    touchStartY=null;
    if(Math.abs(dy)>42) moveLane(dy<0?-1:1);
    else jump();
  });

  soundButton.addEventListener("click",()=>setSound(!state.sound));
  startButton.addEventListener("click",start);
  replayButton.addEventListener("click",start);

  reset();
})();
