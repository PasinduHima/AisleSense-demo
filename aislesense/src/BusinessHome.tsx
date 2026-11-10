import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,BadgeCheck,Bell,Box,Camera,CheckCircle2,ChevronDown,Clock,Eye,HelpCircle,Leaf,Lightbulb,Lock,PiggyBank,ScanLine,ShieldCheck,TrendingDown,UserCheck,Users,Wrench,Zap} from 'lucide-react';
import {SavingsPanel} from './SavingsPanel';
import {calculateSavings,DEFAULT_TARIFF} from './savings';
import type {State,Event} from './types';
import './business-home.css';

/**
 * Details that are not decided yet. Fill these in to replace the marked placeholders on the page.
 * Leave a value empty to keep its placeholder visible.
 */
const PLACEHOLDERS={
 contactEmail:'',                 // e.g. 'hello@yourcompany.lk'
 contactPhone:'',                 // e.g. '+94 7X XXX XXXX'
 prices:{security:'',complete:'',lighting:''},   // e.g. 'LKR 000,000 setup + LKR 00,000 / month'
 installTime:'',                  // e.g. 'Two days for a three-aisle store'
 support:'',                      // e.g. 'Phone and on-site support, 8am–8pm'
};
/** Example inputs for the calculator. They are starting points for the owner to overwrite, not market data. */
const ROI_EXAMPLE={loss:100000,reduction:20,bill:150000,lightingShare:30,cost:600000,fee:0};

const lkr=(n:number)=>Math.round(Math.abs(n)).toLocaleString('en-LK');
const LEVELS=[['1','Watch','Normal activity. Cameras keep watching.'],['2','Assist','Floor staff offer help.'],['3','Verify','A guard reviews the footage.'],['4','Escalate','A manager follows your store protocol.']];

/** Number that counts up the first time it scrolls into view. */
function CountUp({value,decimals=0}:{value:number;decimals?:number}){
 const el=useRef<HTMLSpanElement>(null),[shown,setShown]=useState(value),started=useRef(false),latest=useRef(value);latest.current=value;
 useEffect(()=>{
  const node=el.current;
  if(!node||started.current){setShown(value);return;}
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){started.current=true;setShown(value);return;}
  setShown(0);
  let raf=0;
  const io=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting))return;
   io.disconnect();started.current=true;
   const t0=performance.now(),tick=(now:number)=>{const f=Math.min(1,(now-t0)/900),eased=1-Math.pow(1-f,3);setShown(latest.current*eased);if(f<1)raf=requestAnimationFrame(tick);else setShown(latest.current);};
   raf=requestAnimationFrame(tick);
  },{threshold:.4});
  io.observe(node);
  return()=>{io.disconnect();cancelAnimationFrame(raf);};
 },[value]);
 return <span ref={el}>{shown.toLocaleString('en-LK',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}</span>;
}
const Placeholder=({children}:{children:ReactNode})=><span className="bh-placeholder" title="Placeholder: this detail has not been decided yet">{children}</span>;

export function BusinessHome({state,events,onOpen}:{state:State|null;events:Event[];onOpen:(tab:string)=>void}){
 const root=useRef<HTMLElement>(null);
 const open=events.filter(e=>['open','need_more'].includes(e.status)).length;
 const zones=state?.zones.length??3,occupied=state?.zones.filter(z=>z.count>0).length??0;
 const watts=state?.settings.watts_per_zone??60,overhead=state?.settings.overhead_watts??15,dim=state?.settings.dim_level??30;
 // The headline example: one aisle in use at full brightness, the others at the dim level.
 const example=calculateSavings(Array.from({length:zones},(_,i)=>i===0?100:dim),watts,overhead,DEFAULT_TARIFF,12,30);
 const [roi,setRoi]=useState({...ROI_EXAMPLE,lightingCut:Math.round(example.percent)}),[faq,setFaq]=useState<number|null>(0);
 const lossSaved=roi.loss*roi.reduction/100,lightSaved=roi.bill*roi.lightingShare/100*roi.lightingCut/100,monthly=lossSaved+lightSaved-roi.fee,payback=monthly>0?roi.cost/monthly:null;
 const field=(key:keyof typeof roi,label:string,hint:string,max:number,suffix:string)=><label className="bh-field" key={key}><span>{label}</span><div><input type="number" inputMode="numeric" min={0} max={max} value={roi[key]} onChange={e=>setRoi({...roi,[key]:Math.max(0,Math.min(max,Number(e.target.value)||0))})}/><i>{suffix}</i></div><small>{hint}</small></label>;
 const go=(id:string)=>root.current?.querySelector(`#${id}`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});

 // Sections fade up as they enter the viewport. Without the observer everything is simply visible.
 useEffect(()=>{
  const node=root.current;if(!node||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  node.classList.add('bh-animate');
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('bh-in');io.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -40px'});
  node.querySelectorAll('.bh-reveal').forEach(el=>io.observe(el));
  return()=>{io.disconnect();node.classList.remove('bh-animate');};
 },[]);

 const contact=PLACEHOLDERS.contactEmail||PLACEHOLDERS.contactPhone;
 const faqs:[string,ReactNode][]=[
  ['Is my customers’ privacy protected?',<>Yes, by design. Video is processed on a computer inside your store (<b>local processing</b>). AisleSense does not recognise faces or identities. It looks at body movement and position, then shows staff a clear reason for each alert.</>],
  ['What if the AI is wrong?',<>The AI never accuses anyone. Every alert goes to your staff with the footage and a reason, and a person makes the decision (<b>human review</b>). Staff can mark an alert as a false alarm, and that decision is saved. Response levels describe what staff should do next; they are not a verdict.</>],
  ['Will it work with the cameras I already have?',<>That is the idea: one <b>shared camera input</b> feeds both services, so you reuse a compatible CCTV feed and your shop network. We check your cameras during the free store assessment. Live camera integration is still being built; today’s edition analyses recorded video.</>],
  ['How long does installation take?',PLACEHOLDERS.installTime||<>We confirm this after looking at your store. <Placeholder>Installation time to be confirmed</Placeholder></>],
  ['What support do I get?',PLACEHOLDERS.support||<>You manage security and lighting from one dashboard, with saved evidence and energy estimates. <Placeholder>Support hours and channels to be confirmed</Placeholder></>],
  ['Can I try it before I commit?',<>Start with a free store assessment and the live demonstration. <Placeholder>Pilot offer to be confirmed</Placeholder></>],
 ];
 const plans:{id:keyof typeof PLACEHOLDERS.prices;name:string;line:string;icon:typeof ShieldCheck;items:string[];best?:boolean}[]=[
  {id:'security',name:'Security',line:'See the event. Support the decision.',icon:ShieldCheck,items:['Connect: existing camera input → local analysis','Protect: event review → saved staff decisions','Four response levels, from Watch to Escalate']},
  {id:'complete',name:'Complete store',line:'One camera network. Two smarter store services.',icon:BadgeCheck,best:true,items:['Connect: existing camera input → local analysis','Protect: event review → saved staff decisions','Adapt: zone occupancy → individual light control','Manage: one dashboard → evidence and energy estimates']},
  {id:'lighting',name:'Smart Lighting',line:'Light the aisle. Follow the customer.',icon:Lightbulb,items:['Connect: existing camera input → local analysis','Adapt: zone occupancy → individual light control','Independent brightness for every aisle']},
 ];

 return <section className="business-home bh" ref={root}>
  {/* 1 · Hero */}
  <header className="bh-hero">
   <div className="bh-hero-copy">
    <span className="eyebrow">AISLESENSE FOR RETAIL / BY EVERGUARD</span>
    <h2>You can’t watch every aisle.<br/><em>Your cameras can.</em></h2>
    <p className="bh-lead">AisleSense turns the CCTV you already own into a second pair of eyes for your staff, and dims the lights over empty aisles to cut your electricity bill.</p>
    <p className="bh-sub"><b>One camera network. Two smarter store services.</b> Help staff review security events. Keep occupied aisles comfortable and empty aisles dim. Manage both from one local workspace.</p>
    <div className="bh-cta"><button className="bh-button bh-primary" onClick={()=>go('bh-assessment')}>Book a free store assessment <ArrowRight size={17}/></button><button className="bh-button bh-ghost" onClick={()=>onOpen('explore')}><Eye size={17}/>See the live demo</button></div>
    <ul className="bh-tags" aria-label="How AisleSense works"><li><Camera size={15}/>Shared camera input</li><li><CheckCircle2 size={15}/>Human review</li><li><Lock size={15}/>Local processing</li></ul>
   </div>
   <aside className="bh-hero-side">
    <div className="bh-stat"><span>LIGHTING POWER SAVED IN OUR EXAMPLE</span><b><CountUp value={Math.max(0,example.percent)} decimals={1}/><small>%</small></b><p>One aisle in use at 100%, the other {zones-1} at {dim}%. Example saving: <strong>LKR {lkr(example.cost)} a month</strong>.</p><small>Illustrative estimate at a dummy price of LKR {DEFAULT_TARIFF}/kWh. Not a measured bill reduction.</small></div>
    <div className="bh-diagram" role="img" aria-label="Store cameras feed AisleSense, which powers two services: Security and Lighting"><div><Camera size={18}/><b>Store cameras</b></div><i aria-hidden="true">↓</i><div className="bh-engine">AisleSense</div><div className="bh-branches"><span><ShieldCheck size={17}/>Security</span><span><Lightbulb size={17}/>Lighting</span></div></div>
   </aside>
  </header>

  {/* 2 · The problem */}
  <section className="bh-section bh-reveal" aria-labelledby="bh-problem">
   <span className="eyebrow">THE PROBLEM</span><h3 id="bh-problem">Stock walks out. Lights burn over empty aisles.</h3>
   <p className="bh-intro">Both losses are quiet. You usually see them only at stock-take or when the electricity bill arrives.</p>
   <div className="bh-grid three">
    <article className="bh-card pain"><span className="bh-icon"><Users size={20}/></span><h4>Your guard can’t be everywhere</h4><p>One person can watch one aisle at a time. A concealed item takes a few seconds and happens where nobody is looking.</p></article>
    <article className="bh-card pain"><span className="bh-icon"><TrendingDown size={20}/></span><h4>Loss you only find later</h4><p>CCTV records everything, but nobody has time to watch it. By the time stock is counted, the moment has passed and there is nothing to review.</p></article>
    <article className="bh-card pain"><span className="bh-icon"><Zap size={20}/></span><h4>Full lighting, all day</h4><p>Every aisle is lit at full power from opening to closing, whether a customer is standing in it or not.</p></article>
   </div>
   <p className="bh-note">How much is this costing your store each month? <button className="bh-link" onClick={()=>go('bh-roi')}>Put in your own numbers <ArrowRight size={14}/></button></p>
  </section>

  {/* 3 · The solution */}
  <section className="bh-section bh-reveal" aria-labelledby="bh-solution">
   <span className="eyebrow">THE SOLUTION</span><h3 id="bh-solution">How AisleSense works, in four steps</h3>
   <ol className="bh-steps">
    {([[Camera,'Your existing CCTV','The cameras you already have send their video to a computer in your store.'],[ScanLine,'AI watches every aisle','AisleSense follows body movement and where people are. No face or identity recognition.'],[Bell,'Alert with footage','Suspicious behaviour is ranked by response level and sent to staff with the clip and a clear reason.'],[UserCheck,'A person decides','Your staff review the evidence and record the decision. The system never accuses anyone.']] as const).map(([Icon,title,text],i)=><li key={title}><span className="bh-step-icon"><Icon size={22}/></span><b><i>{i+1}</i>{title}</b><p>{text}</p></li>)}
   </ol>
   <div className="bh-levels" aria-label="Response levels">{LEVELS.map(([n,name,text])=><div key={n} className={`bh-level l${n}`}><b>{n}</b><span><strong>{name}</strong>{text}</span></div>)}</div>
   <div className="bh-grid two bh-services">
    <button onClick={()=>onOpen('security')} className="bh-service security"><span className="bh-service-number">01 / SECURITY</span><ShieldCheck size={32}/><h4>See the event.<br/>Support the decision.</h4><p>Follow the action sequence, response levels, evidence and staff review.</p><div className="bh-metric"><b>{open}</b><span>saved events awaiting review<br/>all sessions · includes demo scenarios</span></div><footer>Open Security workspace <ArrowRight size={18}/></footer></button>
    <button onClick={()=>onOpen('lighting')} className="bh-service lighting"><span className="bh-service-number">02 / SMART LIGHTING</span><Lightbulb size={32}/><h4>Light the aisle.<br/>Follow the customer.</h4><p>See how camera occupancy brightens one aisle while empty aisles stay dim.</p><div className="bh-metric"><b>{occupied}/{zones}</b><span>occupied zones in the current input<br/>independent brightness per zone</span></div><footer>Open Lighting workspace <ArrowRight size={18}/></footer></button>
   </div>
   <div className="bh-route"><div><Box size={24}/><span><b>Explore the complete installation</b><small>Interactive store, 12 component cutaways and the animated 2D architecture.</small></span></div><button className="button secondary" onClick={()=>onOpen('explore')}>Open 3D simulator <ArrowRight size={16}/></button></div>
  </section>

  {/* 4 · Key benefits */}
  <section className="bh-section bh-reveal" aria-labelledby="bh-benefits">
   <span className="eyebrow">WHAT YOU GET</span><h3 id="bh-benefits">Built around the store owner</h3>
   <div className="bh-grid three">
    {([[TrendingDown,'Less stock loss','Staff are told while the shopper is still in the store, with footage to check, instead of finding out at stock-take.'],[Camera,'Use the cameras you have','One shared camera input runs both services. You reuse your CCTV and network instead of buying a second system.'],[PiggyBank,'Lower electricity bills','Each aisle has its own brightness. Occupied aisles stay comfortable; empty aisles dim.'],[Clock,'Faster response','A ranked alert tells staff where to look and what to do next: watch, assist, verify or escalate.'],[Lock,'Private by design','Video is analysed locally in your store. Nobody is identified by face.'],[UserCheck,'No false accusations','A person reviews every alert and can mark it as a false alarm. The decision and its reason are saved.']] as const).map(([Icon,title,text])=><article className="bh-card" key={title}><span className="bh-icon"><Icon size={20}/></span><h4>{title}</h4><p>{text}</p></article>)}
   </div>
  </section>

  {/* 5 · ROI */}
  <section className="bh-section bh-roi bh-reveal" id="bh-roi" aria-labelledby="bh-roi-title">
   <div className="bh-roi-head"><div><span className="eyebrow">YOUR RETURN</span><h3 id="bh-roi-title">When does it pay for itself?</h3><p className="bh-intro">Enter your own figures. The answer changes as you type.</p></div><span className="bh-chip">YOUR ESTIMATE · EXAMPLE STARTING VALUES</span></div>
   <div className="bh-roi-body">
    <form className="bh-roi-form" onSubmit={e=>e.preventDefault()} aria-label="Savings calculator inputs">
     {field('loss','Stock lost to theft each month','Your own estimate from stock-takes',100000000,'LKR')}
     {field('reduction','Loss you expect to prevent','Your assumption. AisleSense has not been measured in a live store yet',100,'%')}
     {field('bill','Monthly electricity bill','From your latest bill',100000000,'LKR')}
     {field('lightingShare','Share of the bill that is lighting','Your estimate',100,'%')}
     {field('lightingCut','Lighting energy saved','Starts at our example pattern; change it to match your store',100,'%')}
     {field('cost','System and installation cost','From your quotation',1000000000,'LKR')}
     {field('fee','Monthly service fee','From your quotation, if any',100000000,'LKR')}
    </form>
    <div className="bh-roi-result" aria-live="polite">
     <span>ESTIMATED PAYBACK</span>
     <b>{payback===null?'—':payback<1?'< 1':payback>120?'120+':Math.round(payback)}<small>{payback===null?'':' months'}</small></b>
     <p className="bh-roi-line">{payback===null?'With these figures the savings do not cover the monthly fee.':<>Pays for itself in about <strong>{payback<1?'under a month':payback>120?'more than 10 years':`${Math.round(payback)} month${Math.round(payback)===1?'':'s'}`}</strong>.</>}</p>
     <dl><div><dt>Stock loss prevented</dt><dd>LKR {lkr(lossSaved)}</dd></div><div><dt>Lighting saved</dt><dd>LKR {lkr(lightSaved)}</dd></div>{roi.fee>0&&<div><dt>Service fee</dt><dd>− LKR {lkr(roi.fee)}</dd></div>}<div className="total"><dt>Net saving per month</dt><dd>{monthly<0?'− ':''}LKR {lkr(monthly)}</dd></div><div><dt>Per year</dt><dd>{monthly<0?'− ':''}LKR {lkr(monthly*12)}</dd></div></dl>
     <small>An estimate from the numbers you entered, not a promise or a measured result. Payback = cost ÷ net monthly saving.</small>
    </div>
   </div>
  </section>

  {/* 6 · Sustainability */}
  <section className="bh-section bh-green bh-reveal" aria-labelledby="bh-green-title">
   <span className="eyebrow"><Leaf size={13}/> GREENER BY DEFAULT</span><h3 id="bh-green-title">Less wasted light. A smaller footprint.</h3>
   <p className="bh-intro">The same cameras that protect your stock tell the lights where customers are. Energy you do not use is the cleanest saving you can make.</p>
   <div className="bh-grid three bh-green-stats">
    <article><b><CountUp value={Math.max(0,example.net)}/><small>W</small></b><span>less lighting power in the example</span><p>{zones} aisles × {watts} W, after {overhead} W for the system itself.</p></article>
    <article><b><CountUp value={Math.max(0,example.kwh)} decimals={2}/><small>kWh</small></b><span>example energy saved each month</span><p>12 hours a day × 30 days, if that pattern continued.</p></article>
    <article><b><small>LKR</small><CountUp value={Math.max(0,example.cost*12)}/></b><span>example saving each year</span><p>Same example repeated for 12 months at a dummy LKR {DEFAULT_TARIFF}/kWh.</p></article>
   </div>
   <p className="bh-live"><i aria-hidden="true"/>Live from the running demonstration: the figures below follow the current aisle brightness, so they change as the scene plays.</p>
   <SavingsPanel state={state}/>
  </section>

  {/* 7 · Pricing */}
  <section className="bh-section bh-reveal" aria-labelledby="bh-plans">
   <span className="eyebrow">PLANS</span><h3 id="bh-plans">The AisleSense package</h3>
   <p className="bh-intro">Start with the service you need most, or take both on one camera network.</p>
   <div className="bh-package">{[['Connect','Existing camera input → local analysis'],['Protect','Event review → saved staff decisions'],['Adapt','Zone occupancy → individual light control'],['Manage','One dashboard → evidence and energy estimates']].map(([a,b])=><article key={a}><b>{a}</b><p>{b}</p></article>)}</div>
   <div className="bh-grid three bh-plans">
    {plans.map(p=><article key={p.id} className={`bh-plan ${p.best?'best':''}`}>{p.best&&<span className="bh-ribbon">RECOMMENDED</span>}<p.icon size={26}/><h4>{p.name}</h4><p>{p.line}</p><div className="bh-price">{PLACEHOLDERS.prices[p.id]||<Placeholder>Price to be confirmed</Placeholder>}</div><ul>{p.items.map(i=><li key={i}><CheckCircle2 size={15}/>{i}</li>)}</ul><button className={`bh-button ${p.best?'bh-primary':'bh-outline'}`} onClick={()=>go('bh-assessment')}>Get a quotation</button></article>)}
   </div>
   <p className="fine-print bh-status"><Wrench size={14}/>Local demonstration edition. Recorded video analysis and saved review are working. Live camera integration, physical lighting hardware and commercial deployment remain future integration work.</p>
  </section>

  {/* 8 · Trust */}
  <section className="bh-section bh-reveal" aria-labelledby="bh-faq">
   <span className="eyebrow">YOUR QUESTIONS</span><h3 id="bh-faq">Straight answers</h3>
   <div className="bh-faq">{faqs.map(([q,a],i)=><div key={q} className={faq===i?'open':''}><h4><button aria-expanded={faq===i} aria-controls={`bh-faq-${i}`} onClick={()=>setFaq(faq===i?null:i)}><HelpCircle size={17}/>{q}<ChevronDown size={18}/></button></h4><div id={`bh-faq-${i}`} role="region" hidden={faq!==i}><p>{a}</p></div></div>)}</div>
  </section>

  {/* 9 · Final call to action */}
  <section className="bh-final bh-reveal" id="bh-assessment" aria-labelledby="bh-final-title">
   <Leaf size={30}/>
   <h3 id="bh-final-title">See what AisleSense would do in your store.</h3>
   <p>A free store assessment looks at your cameras, your aisles and your lighting, and gives you your own numbers.</p>
   {PLACEHOLDERS.contactEmail?<a className="bh-button bh-primary large" href={`mailto:${PLACEHOLDERS.contactEmail}?subject=${encodeURIComponent('Free AisleSense store assessment')}`}>Book a free store assessment <ArrowRight size={18}/></a>:<button className="bh-button bh-primary large" onClick={()=>onOpen('explore')}>See the live demo <ArrowRight size={18}/></button>}
   <p className="bh-contact">{contact?<>Book a free store assessment: {[PLACEHOLDERS.contactEmail,PLACEHOLDERS.contactPhone].filter(Boolean).join(' · ')}</>:<>To book a free store assessment: <Placeholder>contact email and phone to be added</Placeholder></>}</p>
  </section>
 </section>;
}
