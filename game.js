(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const W = 960, H = 540, ground = 444;
  const $ = id => document.getElementById(id);
  const overlay = $('overlay'), startBtn = $('startBtn'), toast = $('toast');
  let state = 'title', last = 0, time = 0, camera = 0, toastTimer = 0;
  let muted = true, audio;
  const keys = new Set(), shots = [], hazards = [], particles = [];
  const bosses = [
    {name:'БОЛОТНЫЙ БАРОН', title:'БОЛОТНЫЙ БАРОН', x:720, hp:9, max:9, type:0, color:'#78a861'},
    {name:'КАМЕННЫЙ ГРОМЫХ', title:'КАМЕННЫЙ ГРОМЫХ', x:1720, hp:12, max:12, type:1, color:'#d08154'},
    {name:'КОРОЛЕВА НОЧИ', title:'КОРОЛЕВА НОЧИ', x:2720, hp:15, max:15, type:2, color:'#9c78bd'}
  ];
  let player, bossIndex, attackTimer, bossFlash, gameTime, shake;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function fresh(){
    player={x:90,y:ground-64,vx:0,vy:0,w:40,h:64,face:1,hp:3,inv:0,onGround:true,anim:0,shootCD:0};
    bossIndex=0; attackTimer=1; bossFlash=0; gameTime=0; camera=0; shake=0; shots.length=hazards.length=particles.length=0;
    bosses.forEach((b,i)=>b.hp=b.max);
    state='play'; overlay.classList.add('hidden'); $('bossName').textContent=bosses[0].name; updateHud();
  }
  startBtn.addEventListener('click',()=>{fresh();sound('start')});
  $('soundBtn').addEventListener('click', e=>{muted=!muted;e.currentTarget.innerHTML=(muted?'♫':'♪')+' <span>'+(muted?'ЗВУК':'ЗВУК ВКЛ')+'</span>';if(!muted)sound('start')});
  function sound(type){if(muted)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=type==='hurt'?'sawtooth':'triangle';osc.frequency.value=type==='shoot'?540:type==='hit'?180:type==='hurt'?110:380;gain.gain.value=.035;osc.start();osc.stop(audio.currentTime+.09)}catch(_){}}
  function setKey(code,on){if(on)keys.add(code);else keys.delete(code)}
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code))e.preventDefault();setKey(e.code,true);if((state==='title'||state==='over'||state==='win')&&(e.code==='Enter'||e.code==='Space'))fresh()});
  window.addEventListener('keyup',e=>setKey(e.code,false));
  document.querySelectorAll('.mobile-controls button').forEach(btn=>{const code={left:'ArrowLeft',right:'ArrowRight',jump:'Space',shoot:'KeyX'}[btn.dataset.key];btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);setKey(code,true)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>setKey(code,false))});
  const rand=(a,b)=>a+Math.random()*(b-a);
  function puff(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-120,120),vy:rand(-170,40),life:rand(.25,.65),max:.65,r:rand(2,6),color})}
  function updateHud(){ $('hearts').textContent='♥ '.repeat(Math.max(0,player.hp)).trim()||'—';let b=bosses[bossIndex];$('bossName').textContent=b?b.name:'ПОБЕДА!';$('bossBar').style.width=b?`${Math.max(0,b.hp/b.max*100)}%`:'0%';$('progress').style.width=`${Math.min(100,Math.round((bossIndex/3)*100))}%`;$('stageName').textContent=['ГЛУХОЙ ЛЕС','КАМЕННЫЙ ПЕРЕВАЛ','ЛУННАЯ ДОЛИНА'][Math.min(2,bossIndex)]||'СЧАСТЛИВЫЙ ФИНИШ'}
  function showToast(text){toast.textContent=text;toast.classList.add('show');toastTimer=1.7}
  function hurt(){if(player.inv>0||state!=='play')return;player.hp--;player.inv=1.35;shake=9;puff(player.x+20,player.y+30,'#ffb169',12);sound('hurt');updateHud();if(player.hp<=0){state='over';endCard('ПУТЬ ПРЕРВАН','Чашкоголовый не сдаётся! Попробуй ещё раз.','ПОПРОБОВАТЬ СНОВА')}}
  function endCard(title,desc,button){overlay.innerHTML=`<div class="overlay-card"><div class="eyebrow"><span>✦</span> ДОРОГА ЧУДЕС <span>✦</span></div><h1>${title}</h1><p>${desc}</p><button id="startBtn" class="start-btn">${button} <b>➜</b></button><div class="control-hint">← → БЕЖАТЬ <span>SPACE</span> ПРЫЖОК <span>X</span> СТРЕЛЯТЬ</div></div>`;overlay.classList.remove('hidden');$('startBtn').addEventListener('click',fresh)}
  function update(dt){time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show')}if(state!=='play')return;gameTime+=dt;if(shake>0)shake=Math.max(0,shake-30*dt);
    const left=keys.has('ArrowLeft')||keys.has('KeyA'),right=keys.has('ArrowRight')||keys.has('KeyD'),jump=keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),shoot=keys.has('KeyX')||keys.has('KeyZ')||keys.has('ControlLeft');
    player.vx=(right?1:0)-(left?1:0);if(player.vx)player.face=Math.sign(player.vx);player.x=clamp(player.x+player.vx*245*dt,12,3100);player.anim+=dt*(player.vx?11:3);player.shootCD-=dt;player.inv-=dt;
    if(jump&&player.onGround){player.vy=-520;player.onGround=false;sound('jump')}
    player.vy+=1250*dt;player.y+=player.vy*dt;if(player.y+player.h>=ground){player.y=ground-player.h;player.vy=0;player.onGround=true}
    if(shoot&&player.shootCD<=0){shots.push({x:player.x+(player.face>0?39:0),y:player.y+29,vx:player.face*510,life:1.55});player.shootCD=.22;sound('shoot');puff(player.x+(player.face>0?40:0),player.y+30,'#fff0a5',2)}
    let boss=bosses[bossIndex];if(boss){let dist=boss.x-player.x; if(dist<620){player.x=Math.min(player.x,boss.x-100);dist=boss.x-player.x;if(dist>110)player.x+=58*dt;attackTimer-=dt;if(attackTimer<=0){hazards.push({x:boss.x-18,y:ground-48,vx:-rand(190,260),vy:rand(-90,-25),r:14,life:4,type:boss.type});attackTimer=rand(.95,1.5)-(bossIndex*.1)} }
      for(let i=shots.length-1;i>=0;i--){let s=shots[i];s.x+=s.vx*dt;s.life-=dt;if(Math.abs(s.x-boss.x)<48&&Math.abs(s.y-(ground-105))<90){boss.hp--;bossFlash=.12;puff(s.x,s.y,'#ffe58f',5);shots.splice(i,1);sound('hit');if(boss.hp<=0){puff(boss.x,ground-100,boss.color,30);bossIndex++;shots.length=hazards.length=0;if(bossIndex>=3){state='win';updateHud();endCard('ЗВЕЗДА НАЙДЕНА!','Все чудища побеждены — и волшебная звезда снова сияет!','СЫГРАТЬ ЕЩЁ');return}updateHud();showToast(['БАРОН ПОБЕЖДЁН!','ГРОМЫХ ПОВЕРЖЕН!',''][bossIndex-1]||'ВПЕРЁД!');bosses[bossIndex].x=player.x+460;attackTimer=1.4}break}if(s.life<=0||s.x<camera-30||s.x>camera+W+30)shots.splice(i,1)}
      bossFlash=Math.max(0,bossFlash-dt);
    }else if(player.x>3100){state='win';endCard('ЗВЕЗДА НАЙДЕНА!','Все чудища побеждены — и волшебная звезда снова сияет!','СЫГРАТЬ ЕЩЁ')}
    for(let i=hazards.length-1;i>=0;i--){let h=hazards[i];h.x+=h.vx*dt;h.y+=h.vy*dt;h.vy+=280*dt;h.life-=dt;if(h.y+h.r>ground){h.y=ground-h.r;h.vy*=-.58}if(player.inv<=0&&h.x>player.x-12&&h.x<player.x+player.w+12&&h.y>player.y+5&&h.y<player.y+player.h){hazards.splice(i,1);hurt();continue}if(h.life<=0||h.x<camera-60)hazards.splice(i,1)}
    for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
    camera=clamp(player.x-300,0,3100-W);updateHud();
  }
  function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#83bdc8');sky.addColorStop(.58,'#b7d5c9');sky.addColorStop(1,'#e9d7a8');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(755,128,52,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0c1';ctx.beginPath();ctx.arc(755,128,38,0,Math.PI*2);ctx.fill();
    for(let i=0;i<7;i++){let x=((i*203-camera*.16)%(W+260)+W+260)%(W+260)-80,y=80+(i%3)*48;ctx.fillStyle='#e7f0d7aa';ctx.beginPath();ctx.ellipse(x,y,47,15,0,0,7);ctx.ellipse(x+25,y-8,30,18,0,0,7);ctx.ellipse(x+53,y,38,13,0,0,7);ctx.fill()}
    ctx.fillStyle='#8bb9a8';ctx.beginPath();ctx.moveTo(0,322);for(let x=0;x<=W;x+=40)ctx.lineTo(x,300+Math.sin((x+camera*.12)/115)*32+Math.cos((x-camera*.07)/61)*12);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle='#729d86';ctx.beginPath();ctx.moveTo(0,382);for(let x=0;x<=W;x+=32)ctx.lineTo(x,362+Math.sin((x+camera*.24)/79)*22);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    for(let i=0;i<14;i++){let wx=i*220+70,x=wx-camera*.55;if(x<-100||x>W+100)continue;let h=90+(i*37%75),y=ground-h;ctx.fillStyle=i%3?'#496f59':'#597e61';ctx.fillRect(x-8,y+30,17,h-30);ctx.fillStyle=i%2?'#638b62':'#6d9669';ctx.beginPath();ctx.arc(x,y+24,39,0,7);ctx.arc(x-25,y+42,30,0,7);ctx.arc(x+26,y+43,29,0,7);ctx.fill();ctx.fillStyle='#a5b66d';ctx.beginPath();ctx.arc(x-13,y+4,4,0,7);ctx.arc(x+18,y+28,3,0,7);ctx.fill()}
    ctx.fillStyle='#dbb977';ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle='#edcf8e';ctx.fillRect(0,ground,W,12);ctx.fillStyle='#96764f';for(let i=0;i<28;i++){let x=((i*71-camera*.8)%(W+40)+W+40)%(W+40);ctx.fillRect(x,ground+25+(i*13%65),22+(i*17%30),3);ctx.fillStyle='#c19a62';ctx.fillRect(x+8,ground+49+(i*19%45),8,3);ctx.fillStyle='#96764f'}
    for(let i=0;i<22;i++){let x=((i*53-camera*.9)%(W+30)+W+30)%(W+30),y=ground-10-(i*17%28);ctx.fillStyle=i%2?'#708d55':'#84975a';ctx.beginPath();ctx.ellipse(x,y,8,3,-.4,0,7);ctx.fill()}
  }
  function drawPlayer(){if(!player)return;let x=player.x-camera,y=player.y;if(player.inv>0&&Math.floor(time*15)%2===0)return;let bob=player.onGround&&player.vx?Math.sin(player.anim)*3:0;ctx.save();ctx.translate(x+20,y+20+bob);if(player.face<0)ctx.scale(-1,1);
    // saucer, ceramic head, straw and jaunty red suit
    ctx.fillStyle='#c9a477';ctx.beginPath();ctx.ellipse(0,15,25,6,0,0,7);ctx.fill();ctx.fillStyle='#f8edd8';ctx.beginPath();ctx.moveTo(-20,5);ctx.lineTo(-17,-17);ctx.quadraticCurveTo(0,-24,17,-17);ctx.lineTo(20,5);ctx.quadraticCurveTo(0,12,-20,5);ctx.fill();ctx.strokeStyle='#d9c8a9';ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle='#e85a4e';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(3,-22);ctx.lineTo(5,-44);ctx.lineTo(15,-49);ctx.stroke();ctx.strokeStyle='#ffe9c9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(2,-23);ctx.lineTo(4,-43);ctx.stroke();
    ctx.fillStyle='#262e32';ctx.beginPath();ctx.ellipse(-6,-7,2.4,4,0,0,7);ctx.ellipse(7,-7,2.4,4,0,0,7);ctx.fill();ctx.strokeStyle='#9e6053';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(1,0,5,.2,2.5);ctx.stroke();
    ctx.fillStyle='#e45047';ctx.beginPath();ctx.moveTo(-14,12);ctx.quadraticCurveTo(-20,18,-19,30);ctx.lineTo(17,30);ctx.quadraticCurveTo(18,18,12,12);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe3be';ctx.beginPath();ctx.moveTo(-5,12);ctx.lineTo(0,20);ctx.lineTo(5,12);ctx.lineTo(3,27);ctx.lineTo(-2,27);ctx.closePath();ctx.fill();ctx.fillStyle='#e9cfaa';ctx.fillRect(-18,28,37,4);
    let step=player.onGround&&player.vx?Math.sin(player.anim)*4:0;ctx.strokeStyle='#39434a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,32);ctx.lineTo(-8+step,40);ctx.moveTo(8,32);ctx.lineTo(8-step,40);ctx.stroke();ctx.fillStyle='#eee0c6';ctx.beginPath();ctx.ellipse(-8+step,42,7,3,0,0,7);ctx.ellipse(8-step,42,7,3,0,0,7);ctx.fill();ctx.restore()}
  function drawBoss(b){if(!b)return;let x=b.x-camera;if(x<-100||x>W+100)return;let y=ground-70+Math.sin(time*2.7)*5;ctx.save();ctx.translate(x,y);if(bossFlash>0)ctx.globalAlpha=.55+.45*Math.sin(time*80);ctx.fillStyle='#22354338';ctx.beginPath();ctx.ellipse(0,66,59,12,0,0,7);ctx.fill();
    if(b.type===0){ctx.fillStyle='#647d55';ctx.beginPath();ctx.ellipse(0,10,46,45,0,0,7);ctx.fill();ctx.fillStyle='#86a869';ctx.beginPath();ctx.ellipse(-5,-1,35,34,0,0,7);ctx.fill();ctx.fillStyle='#617d51';ctx.beginPath();ctx.moveTo(-24,-35);ctx.lineTo(-18,-56);ctx.lineTo(-6,-39);ctx.lineTo(3,-60);ctx.lineTo(13,-38);ctx.lineTo(30,-48);ctx.lineTo(25,-25);ctx.fill();ctx.fillStyle='#fff0d3';ctx.beginPath();ctx.ellipse(-12,0,8,11,0,0,7);ctx.ellipse(12,0,8,11,0,0,7);ctx.fill();ctx.fillStyle='#283333';ctx.beginPath();ctx.arc(-10,1,3,0,7);ctx.arc(14,1,3,0,7);ctx.fill();ctx.strokeStyle='#394938';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,11,11,.2,2.8);ctx.stroke();ctx.fillStyle='#a9bc70';ctx.beginPath();ctx.arc(-38,18,8,0,7);ctx.arc(39,26,10,0,7);ctx.fill();}
    else if(b.type===1){ctx.fillStyle='#8e6655';ctx.beginPath();ctx.moveTo(-44,52);ctx.lineTo(-40,-20);ctx.lineTo(-18,-38);ctx.lineTo(-5,-63);ctx.lineTo(15,-40);ctx.lineTo(39,-24);ctx.lineTo(46,52);ctx.closePath();ctx.fill();ctx.fillStyle='#b98161';ctx.beginPath();ctx.moveTo(-29,-22);ctx.lineTo(-4,-50);ctx.lineTo(7,-31);ctx.lineTo(28,-18);ctx.lineTo(27,30);ctx.lineTo(-30,34);ctx.closePath();ctx.fill();ctx.fillStyle='#f6d79d';ctx.beginPath();ctx.ellipse(-12,-5,8,10,0,0,7);ctx.ellipse(14,-5,8,10,0,0,7);ctx.fill();ctx.fillStyle='#382e32';ctx.beginPath();ctx.arc(-11,-4,3,0,7);ctx.arc(15,-4,3,0,7);ctx.fill();ctx.fillStyle='#e5b678';ctx.fillRect(-7,15,15,7);ctx.fillStyle='#745244';ctx.fillRect(-34,47,24,17);ctx.fillRect(12,47,24,17);}
    else{ctx.fillStyle='#674e87';ctx.beginPath();ctx.ellipse(0,8,42,53,0,0,7);ctx.fill();ctx.fillStyle='#a283c0';ctx.beginPath();ctx.arc(0,-24,31,0,7);ctx.fill();ctx.fillStyle='#e4c4a4';ctx.beginPath();ctx.moveTo(-27,-39);ctx.lineTo(-36,-62);ctx.lineTo(-10,-47);ctx.lineTo(0,-69);ctx.lineTo(11,-47);ctx.lineTo(36,-62);ctx.lineTo(27,-37);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0d4';ctx.beginPath();ctx.ellipse(-11,-24,7,9,0,0,7);ctx.ellipse(11,-24,7,9,0,0,7);ctx.fill();ctx.fillStyle='#594364';ctx.beginPath();ctx.arc(-11,-23,3,0,7);ctx.arc(11,-23,3,0,7);ctx.fill();ctx.fillStyle='#eebf74';ctx.beginPath();ctx.arc(0,6,9,0,7);ctx.fill();ctx.fillStyle='#71588b';ctx.fillRect(-36,46,-0+22,19);ctx.fillRect(12,46,24,19);ctx.fillStyle='#ffdc8c';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-22+i*22,24,3,0,7);ctx.fill()}}
    ctx.restore();}
  function draw(){ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));background();let b=bosses[bossIndex];drawBoss(b);drawPlayer();for(const s of shots){ctx.fillStyle='#fff0a5';ctx.shadowColor='#fff0a5';ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(s.x-camera,s.y,7,4,0,0,7);ctx.fill();ctx.shadowBlur=0}for(const h of hazards){ctx.fillStyle=['#a6ce70','#ed9b63','#ce9ce0'][h.type];ctx.strokeStyle='#573f51';ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x-camera,h.y,h.r,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0cc';ctx.beginPath();ctx.arc(h.x-camera-4,h.y-4,2,0,7);ctx.fill()}for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-camera,p.y,p.r,0,7);ctx.fill()}ctx.globalAlpha=1;ctx.restore();}
  function loop(now){let dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop)}
  requestAnimationFrame(loop);
})();
