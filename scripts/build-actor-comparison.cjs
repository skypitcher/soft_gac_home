#!/usr/bin/env node
/**
 * Native, editable vector artwork. Math labels are compiled from TeX into paths.
 * Runtime CSS/JS lives separately in assets/animation; the exported SVG is standalone.
 * Build: NODE_PATH=/path/to/mathjax/node_modules node scripts/build-actor-comparison.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const {mathjax} = require('mathjax-full/js/mathjax.js');
const {TeX} = require('mathjax-full/js/input/tex.js');
const {SVG} = require('mathjax-full/js/output/svg.js');
const {liteAdaptor} = require('mathjax-full/js/adaptors/liteAdaptor.js');
const {RegisterHTMLHandler} = require('mathjax-full/js/handlers/html.js');
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const document = mathjax.document('', {InputJax:new TeX(), OutputJax:new SVG({fontCache:'none'})});
const root = path.resolve(__dirname,'..');
const cache = new Map();
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const attrs = a => Object.entries(a).filter(([,v])=>v!==undefined).map(([k,v])=>`${k}="${escape(v)}"`).join(' ');
const el = (tag,a,body='') => `<${tag} ${attrs(a)}>${body}</${tag}>`;
const rect = (x,y,w,h,a={}) => el('rect',{x,y,width:w,height:h,...a});
const line = (d,a={}) => el('path',{d,...a});
const text = (x,y,s,cls='note',a={}) => el('text',{x,y,class:cls,...a},escape(s));
const circle = (cx,cy,r,a={}) => el('circle',{cx,cy,r,...a});
function math(tex,x,y,size=30,color='#18231f') {
  if(!cache.has(tex)) {
    const out=adaptor.outerHTML(document.convert(tex,{display:false}));
    const [,viewBox,body]=out.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
    cache.set(tex,{box:viewBox.split(' ').map(Number),body});
  }
  const {box:[bx,by,w,h],body}=cache.get(tex),scale=size/1000;
  return el('g',{class:'math',color,'aria-label':tex,transform:`translate(${x} ${y}) scale(${scale}) translate(${-bx-w/2} ${-by-h/2})`},body);
}
const defs = `<defs>
  <pattern id="opaque-hatch" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="#fffdf8"/>
    <path d="M-2 2 L2 -2 M0 7 L7 0 M5 9 L9 5" fill="none" stroke="#9aabbd" stroke-width=".7"/>
  </pattern>
  <marker id="arrow-blue" viewBox="0 0 9 8" refX="8" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#526781" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker>
  <marker id="arrow-green" viewBox="0 0 9 8" refX="8" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#007f5f" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>`;
function particle(name,color) {
  // Ink dots carry the signal; no glow, gradient, or animated decoration.
  return el('g',{'data-particle':name,opacity:0},Array.from({length:5},(_,i)=>el('g',{},
    circle(0,0,i===0?3.6:Math.max(1.2,2.8-i*.35),{fill:color}))).join(''));
}
function port(x,y,label,kind,{output=false}={}) {
  const color=kind==='bottom'?'#007f5f':'#526781';
  return (output?circle(x,y,26,{fill:'none',stroke:color,'stroke-width':2,opacity:0,'data-ready-ring':kind}):'')+
    circle(x,y,26,{fill:color,'fill-opacity':.045,stroke:color,'stroke-opacity':.45,'stroke-width':1.4,...(output?{'data-output':kind}:{})})+
    math(label,x,y,29,color)+text(x,y+47,output?'action':'noise','port-label');
}
function scene(mobile=false) {
  // A single comparison with equally sized actors: draw structure IN f_theta.
  const c=mobile
    ? {name:'mobile',W:560,H:640,topTitleX:24,topTitleY:32,topSubY:60,
       topX:116,topBoxY:114,boxW:328,boxH:112,ty:172,inputX:56,outputX:504,
       loopLeft:96,loopRight:464,loopY:88,callsY:260,callsX:[190,250,310,370],
       bottomTitleX:24,bottomTitleY:310,bottomSubY:338,
       frameX:116,frameY:365,frameW:328,frameH:138,by:454,bInputX:56,bOutputX:504,
       qX:[168,260,386],qY:454,qW:72,qH:58,ellipsisX:321,refY:571,refH:42,refLabelY:621}
    : {name:'wide',W:1040,H:414,topTitleX:26,topTitleY:32,topSubY:60,
       topX:104,topBoxY:140,boxW:312,boxH:136,ty:225,inputX:48,outputX:472,
       loopLeft:84,loopRight:436,loopY:103,callsY:351,callsX:[194,248,302,356],
       bottomTitleX:546,bottomTitleY:32,bottomSubY:60,
       frameX:624,frameY:140,frameW:312,frameH:136,by:225,bInputX:568,bOutputX:992,
       qX:[676,766,878],qY:225,qW:70,qH:58,ellipsisX:822,refY:350,refH:42,refLabelY:398};
  const {W,H,ty,by,qX,qY,qW,qH}=c;
  const left=c.topX,right=left+c.boxW,x=(left+right)/2;
  const bLeft=c.frameX,bRight=bLeft+c.frameW,bx=(bLeft+bRight)/2;
  const loop=`M${right} ${ty} H${c.loopRight-12} Q${c.loopRight} ${ty} ${c.loopRight} ${ty-12} V${c.loopY+12} Q${c.loopRight} ${c.loopY} ${c.loopRight-12} ${c.loopY} H${c.loopLeft+12} Q${c.loopLeft} ${c.loopY} ${c.loopLeft} ${c.loopY+12} V${ty-12} Q${c.loopLeft} ${ty} ${c.loopLeft+12} ${ty} H${left}`;
  const bridgeStart=bLeft+12,bridgeEnd=bRight-12,bridgeD=`M${bridgeStart} ${qY} H${bridgeEnd}`;
  let s='';
  s+=text(c.topTitleX,c.topTitleY,'Diffusion / flow','heading');
  s+=text(c.topTitleX,c.topSubY,'Shared network · repeated evaluations','subheading');
  s+=text(c.bottomTitleX,c.bottomTitleY,'SoftGAC','heading',{style:'fill:#007f5f'});
  s+=text(c.bottomTitleX,c.bottomSubY,'Structured actor · one network evaluation','subheading');
  // The shared, opaque module is repeatedly revisited by one signal.
  s+=line(`M${c.inputX+26} ${ty} H${left}`,{class:'rail','data-path':'top-entry','marker-end':'url(#arrow-blue)'});
  s+=line(`M${left} ${ty} H${right}`,{class:'rail','data-path':'top-through'});
  s+=line(`M${right} ${ty} H${c.outputX-26}`,{class:'rail','data-path':'top-exit','marker-end':'url(#arrow-blue)'});
  s+=line(loop,{class:'loop-rail','data-path':'top-loop','marker-end':'url(#arrow-blue)'});
  s+=line(`M${x+25} ${c.loopY} H${x-25}`,{class:'loop-rail','marker-end':'url(#arrow-blue)'});
  s+=rect(left-5,c.topBoxY-5,c.boxW+10,c.boxH+10,{rx:3,fill:'none',stroke:'#526781','stroke-width':2,opacity:0,'data-halo':'top'});
  s+=rect(left,c.topBoxY,c.boxW,c.boxH,{rx:2,fill:'url(#opaque-hatch)',stroke:'#526781','stroke-width':1});
  s+=rect(x-83,c.topBoxY+c.boxH/2-43,166,88,{fill:'#fffdf8'});
  s+=math('f_{\\theta}',x,c.topBoxY+c.boxH/2-13,39,'#18231f');
  s+=math('\\sim M\\;\\mathrm{params}',x,c.topBoxY+c.boxH/2+27,22,'#526781');
  s+=port(c.inputX,ty,'z_0','top');
  s+=port(c.outputX,ty,'a','top',{output:true});
  s+=text(c.callsX[0]-53,c.callsY,'call','call-label');
  ['1','2','ellipsis','N'].forEach((v,i)=>{
    const p=c.callsX[i];
    s+=el('g',{'data-call':v,opacity:i===0?1:.64},
      line('M'+(p-12)+' '+(c.callsY+8)+' H'+(p+12),{stroke:'#9aabbd','stroke-width':1})+
      (v==='ellipsis'?math('\\cdots',p,c.callsY-7,24,'#526781'):text(p,c.callsY,v,'call-step')));
    if(i<3) s+=line(`M${p+22} ${c.callsY-7} H${c.callsX[i+1]-22}`,{fill:'none',stroke:'#b9c5d2','stroke-width':1.1});
  });
  if(!mobile) s+=text(x,c.refLabelY,'Same weights, evaluated repeatedly.','note',{'text-anchor':'middle'});
  // The structured actor is open, not duplicated in a separate magnified inset.
  s+=line(`M${c.bInputX+26} ${by} H${bLeft}`,{class:'rail',style:'stroke:#258c6e','data-path':'bottom-entry','marker-end':'url(#arrow-green)'});
  s+=line(`M${bRight} ${by} H${c.bOutputX-26}`,{class:'rail',style:'stroke:#258c6e','data-path':'bottom-exit','marker-end':'url(#arrow-green)'});
  s+=rect(bLeft-5,c.frameY-5,c.frameW+10,c.frameH+10,{rx:3,fill:'none',stroke:'#007f5f','stroke-width':2,opacity:0,'data-halo':'bottom'});
  s+=rect(bLeft,c.frameY,c.frameW,c.frameH,{rx:2,fill:'#ecf8f1',stroke:'#007f5f','stroke-width':1.5});
  s+=math('f_{\\theta}',bLeft+34,c.frameY+29,30,'#007f5f');
  s+=math('\\sim M\\;\\mathrm{total\\;params}',bRight-105,c.frameY+29,20,'#007252');
  s+=line(`M${bLeft+14} ${c.frameY+52} H${bRight-14}`,{stroke:'#91c8b1','stroke-width':1});
  s+=port(c.bInputX,by,'z_0','bottom');
  s+=port(c.bOutputX,by,'a','bottom',{output:true});
  for(let i of [-1,1]) s+=line(`M${bridgeStart} ${qY} C${qX[0]} ${qY+i*20} ${qX[0]+qW/2} ${qY+i*20} ${qX[1]} ${qY} S${qX[2]-qW/2} ${qY-i*20} ${bridgeEnd} ${qY}`,{class:'trace'});
  s+=line(bridgeD,{class:'bridge-rail','data-path':'bridge','marker-end':'url(#arrow-green)'});
  s+=line(bridgeD,{fill:'none',stroke:'#007f5f','stroke-width':2.6,'stroke-linecap':'round','data-bridge-progress':'','stroke-dasharray':'0 1000'});
  qX.forEach((qx,i)=>{
    s+=rect(qx-qW/2-4,qY-qH/2-4,qW+8,qH+8,{rx:2,fill:'none',stroke:'#007f5f','stroke-width':2,opacity:.06,'data-q-halo':''});
    s+=rect(qx-qW/2,qY-qH/2,qW,qH,{rx:1,fill:'#fffdf8',stroke:'#258c6e','stroke-width':1.25});
    s+=math(['q_{\\theta,0}','q_{\\theta,1}','q_{\\theta,K-1}'][i],qx,qY-5,i===2?23:26,'#007f5f');
    const gy=qY+19;
    s+=line(`M${qx-16} ${gy} C${qx-5} ${gy} ${qx-7} ${gy-11} ${qx} ${gy-11} S${qx+5} ${gy} ${qx+16} ${gy}`,{fill:'none',stroke:'#00865f','stroke-width':1.1,'stroke-opacity':.6});
  });
  s+=rect(c.ellipsisX-11,qY-12,22,24,{rx:0,fill:'#ecf8f1'});
  s+=math('\\cdots',c.ellipsisX,qY,24,'#007f5f');
  const klTop=qY+qH/2+6,klBottom=c.refY-c.refH/2-6;
  qX.forEach((qx,i)=>{
    s+=el('g',{'data-kl':'',opacity:.7},
      line(`M${qx} ${klTop} V${klBottom}`,{class:'kl-line'})+
      line(`M${qx-4} ${klTop+5} L${qx} ${klTop} L${qx+4} ${klTop+5} M${qx-4} ${klBottom-5} L${qx} ${klBottom} L${qx+4} ${klBottom-5}`,{class:'kl-line'})+
      text(qx+9,(klTop+klBottom)/2+6,'KL','kl-label'));
    s+=rect(qx-qW/2,c.refY-c.refH/2,qW,c.refH,{rx:1,fill:'#fffdf8',stroke:'#c4432b','stroke-width':1.3,'stroke-dasharray':'4 3'});
    s+=math(['r_0','r_1','r_{K-1}'][i],qx,c.refY,26,'#c4432b');
  });
  s+=math('\\cdots',c.ellipsisX,c.refY,24,'#c4432b');
  s+=text(bx,c.refLabelY,'Fixed reference · outside the actor','reference-label',{'text-anchor':'middle'});
  s+=particle('top','#526781')+particle('bottom','#007f5f')+particle('bridge','#007f5f');
  return el('g',{'data-layout':c.name,'data-width':W,'data-height':H,'data-model-left':left,'data-model-right':right,'data-top-y':ty,'data-q-bounds':JSON.stringify(qX.map(qx=>[qx-qW/2-4,qx+qW/2+4])),'data-q-centers':JSON.stringify(qX.map(qx=>(qx-bridgeStart)/(bridgeEnd-bridgeStart))),display:mobile?'none':'inline'},s);
}
const css=fs.readFileSync(path.join(root,'assets/animation/actor-comparison.css'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/animation/actor-comparison.js'),'utf8');
const svg=`<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from scripts/build-actor-comparison.cjs. Native SVG paths, not a raster image. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1040 414" role="img" aria-labelledby="title description">
<title id="title">Same total actor budget. Different computation.</title>
<desc id="description">Diffusion and flow repeatedly evaluate one shared network. SoftGAC evaluates one structured network with its internal stochastic layers drawn inside the same actor boundary. Both have approximately M total parameters. Each actor transition is compared to a fixed reference transition outside the actor. K denotes internal depth, not repeated full-network evaluations. Animation timing is schematic, not a benchmark. Pause and replay controls are provided on the project page. Reduced-motion settings display a static overview.</desc>
<style><![CDATA[${css}]]></style>
${defs}
${scene(false)}
${scene(true)}
<script><![CDATA[${js}]]></script>
</svg>
`;
const output=path.join(root,'assets/figures/actor-comparison-animated.svg');
fs.writeFileSync(output,svg);
console.log(`${path.relative(root,output)}: ${(Buffer.byteLength(svg)/1024).toFixed(1)} KiB`);
