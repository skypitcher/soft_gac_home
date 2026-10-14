// Unit tests for the standalone SVG's lifecycle. No browser or network required.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../assets/animation/actor-comparison.js'),'utf8');
class Node {
  constructor(dataset={}) { this.dataset=dataset; this.attrs={}; this.children=[]; this.one={}; this.many={}; }
  setAttribute(k,v) { this.attrs[k]=String(v); }
  querySelector(s) { return this.one[s]; }
  querySelectorAll(s) { return this.many[s]||[]; }
  getTotalLength() { return 600; }
  getPointAtLength(d) { return {x:d+100,y:166}; }
}
function setup({reduced=false,mobile=false,embedded=true}={}) {
  const root=new Node();
  const scene=name=>{
    const g=new Node({layout:name,width:name==='wide'?'1040':'560',height:name==='wide'?'414':'640',modelLeft:'420',modelRight:'620',topY:'166',qBounds:'[[210,330],[410,530],[710,830]]'});
    g.many['[data-path]']=['top-entry','top-through','top-loop','top-exit','bottom-entry','bottom-exit','bridge'].map(v=>new Node({path:v}));
    g.many['[data-particle]']=['top','bottom','bridge'].map(p=>{const n=new Node({particle:p});n.children=Array.from({length:6},()=>new Node());return n;});
    for(const s of ['[data-halo="top"]','[data-halo="bottom"]','[data-ready-ring="top"]','[data-ready-ring="bottom"]','[data-output="top"]','[data-output="bottom"]','[data-bridge-progress]']) g.one[s]=new Node();
    g.many['[data-call]']=['1','2','ellipsis','N'].map(v=>new Node({call:v}));
    g.many['[data-q-halo]']=Array.from({length:3},()=>new Node());
    g.many['[data-kl]']=Array.from({length:3},()=>new Node());
    g.many['[data-led]']=[new Node()];
    return g;
  };
  const scenes=[scene('wide'),scene('mobile')];root.many['[data-layout]']=scenes;
  const handlers={},docHandlers={},messages=[],frames=new Map();
  let frameId=0,now=0;
  const query=matches=>({matches,addEventListener(_,fn){this.listener=fn;}});
  const media={small:query(mobile),reduced:query(reduced)};
  const parent={postMessage:d=>messages.push(d)};
  const win={parent,addEventListener:(k,f)=>handlers[k]=f};
  if(!embedded) win.parent=win;
  const doc={documentElement:root,hidden:false,addEventListener:(k,f)=>docHandlers[k]=f};
  vm.runInNewContext(source,{
    window:win,document:doc,
    matchMedia:q=>q.includes('max-width')?media.small:media.reduced,
    requestAnimationFrame:f=>{frames.set(++frameId,f);return frameId;},
    cancelAnimationFrame:id=>frames.delete(id)
  });
  const control=(command,detail={},from=win.parent)=>handlers.message({source:from,data:{type:'softgac-actor-control',command,...detail}});
  const advance=seconds=>{for(let i=0;i<seconds*20;i++){const work=[...frames.values()];frames.clear();now+=50;work.forEach(f=>f(now));}};
  return {root,scenes,frames,messages,media,control,advance,doc,docHandlers,handlers};
}
test('embedded motion waits until visible; packets and call counter advance',()=>{
  const s=setup();assert.equal(s.frames.size,0);
  s.control('visibility',{visible:true});assert.equal(s.frames.size,1);
  s.advance(.7);assert.equal(s.root.dataset.phase,'input');
  assert.equal(s.scenes[0].many['[data-particle]'][0].attrs.opacity,'1.000');
  s.advance(1);assert.equal(s.root.dataset.phase,'bridge');
  assert.ok(+s.scenes[0].one['[data-halo="bottom"]'].attrs.opacity>.18);
  s.advance(4);assert.equal(s.root.dataset.phase,'repeat');
  assert.equal(s.scenes[0].many['[data-call]'][2].attrs.opacity,'1');
  s.advance(3);assert.equal(s.root.dataset.phase,'complete');
});
test('pause freezes, replay restarts, and offscreen does not erase manual pause',()=>{
  const s=setup();s.control('visibility',{visible:true});s.advance(2);
  s.control('pause');const phase=s.root.dataset.phase;
  assert.equal(s.frames.size,0);s.advance(10);assert.equal(s.root.dataset.phase,phase);
  s.control('visibility',{visible:false});s.control('visibility',{visible:true});assert.equal(s.frames.size,0);
  s.control('play');assert.equal(s.frames.size,1);
  s.control('replay');assert.equal(s.root.dataset.phase,'input');
  s.control('visibility',{visible:false});assert.equal(s.frames.size,0);
});
test('reduced motion shows static overview until explicit play',()=>{
  const s=setup({reduced:true});s.control('visibility',{visible:true});
  assert.equal(s.root.dataset.phase,'static');assert.equal(s.frames.size,0);
  assert.ok(s.messages.some(m=>m.type==='softgac-actor-state'&&m.reduced&&m.paused));
  s.control('play');assert.equal(s.frames.size,1);s.advance(1);assert.notEqual(s.root.dataset.phase,'static');
});
test('layout selection and resize notify the embedding page',()=>{
  const s=setup({mobile:true});assert.equal(s.root.dataset.layout,'mobile');
  assert.equal(s.root.attrs.viewBox,'0 0 560 640');
  s.media.small.matches=false;s.media.small.listener();
  assert.equal(s.root.attrs.viewBox,'0 0 1040 414');
  assert.ok(s.messages.some(m=>m.type==='softgac-actor-size'&&m.width===1040));
});
test('hidden documents pause, spoofed messages are ignored, printing is static',()=>{
  const s=setup();s.control('visibility',{visible:true},{});assert.equal(s.frames.size,0);
  s.control('visibility',{visible:true});s.doc.hidden=true;s.docHandlers.visibilitychange();assert.equal(s.frames.size,0);
  s.doc.hidden=false;s.docHandlers.visibilitychange();assert.equal(s.frames.size,1);
  s.control('print');assert.equal(s.root.dataset.phase,'static');assert.equal(s.frames.size,0);
  s.control('state');assert.equal(s.frames.size,1);
});
test('standalone SVG animates; ordinary image embeds retain a static diagram',()=>{
  const s=setup({embedded:false});assert.equal(s.frames.size,1);
  const svg=fs.readFileSync(path.join(__dirname,'../assets/figures/actor-comparison-animated.svg'),'utf8');
  assert.ok(svg.includes('data-layout="wide"'));
  assert.ok(svg.includes('aria-label="f_{\\theta}"'));
  assert.ok(!svg.includes('data-mml-node="merror"'));
  assert.ok(!svg.includes('<image'));
  assert.ok(!svg.includes('foreignObject'));
  assert.ok(!svg.includes('src="http'));
});
