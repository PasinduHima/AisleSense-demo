import {useState} from 'react';
import type {State} from './types';
import {calculateSavings,DEFAULT_TARIFF} from './savings';
import './savings.css';

export function SavingsPanel({state}:{state:State|null}){
 const [tariff,setTariff]=useState(DEFAULT_TARIFF),[hours,setHours]=useState(12),[days,setDays]=useState(30);
 if(!state)return <section className="owner-savings"><p>Connect the local system to calculate the energy and cost example.</p></section>;
 const s=calculateSavings(state?.zones.map(z=>z.level)??[],state?.settings.watts_per_zone??60,state?.settings.overhead_watts??15,tariff,hours,days);
 const money=(n:number)=>Math.abs(n).toLocaleString('en-LK',{maximumFractionDigits:0});
 return <section className="owner-savings" aria-label="Store owner energy and cost example">
  <header><div><span className="eyebrow">SMART LIGHTING / OWNER BENEFIT</span><h3>Empty aisles use less. Your store spends less.</h3></div><span className="savings-example">ILLUSTRATIVE ESTIMATE · DUMMY PRICE</span></header>
  <div className="owner-metrics">
   <article><span>NET POWER {s.net<0?'INCREASE':'SAVED'} NOW</span><b>{Math.abs(s.net).toFixed(1)}<small>W</small></b><strong>{Math.abs(s.percent).toFixed(1)}% {s.net<0?'more':'less'} power</strong><p>Includes {state?.settings.overhead_watts??15} W system overhead</p></article>
   <article><span>EXAMPLE MONTHLY ENERGY {s.kwh<0?'INCREASE':'SAVING'}</span><b>{Math.abs(s.kwh).toFixed(2)}<small>kWh</small></b><strong>If this brightness pattern continued</strong><p>{hours} hours/day × {days} days/month</p></article>
   <article className="price-hero"><span>EXAMPLE MONTHLY {s.cost<0?'EXTRA COST':'COST SAVING'}</span><b><small>LKR</small>{money(s.cost)}</b><strong>LKR {money(s.cost*12)} / year {s.cost<0?'extra':'saved'}</strong><p>Same example repeated for 12 months</p></article>
  </div>
  <div className="savings-comparison"><span>Always-on example <b>LKR {money(s.baselineCost)}/month</b></span><i>→</i><span>Adaptive + system <b>LKR {money(s.adaptiveCost)}/month</b></span><span className="session-energy">This session: <b>{((state?.energy.net_saved_wh??0)/1000).toFixed(6)} kWh net saved</b></span></div>
  <details className="savings-assumptions"><summary>Adjust example price & opening hours</summary><div className="savings-inputs">{[['Example LKR per kWh',tariff,setTariff,0,1000],['Opening hours per day',hours,setHours,1,24],['Days per month',days,setDays,1,31]].map(([label,value,set,min,max])=><label key={String(label)}>{String(label)}<input type="number" min={Number(min)} max={Number(max)} value={Number(value)} onChange={e=>(set as (v:number)=>void)(Math.max(Number(min),Math.min(Number(max),Number(e.target.value))))}/></label>)}</div><p>One electricity unit = 1 kWh. Example tariff only, not a current electricity rate. {state?.zones.length??0} zones × {state?.settings.watts_per_zone??60} W at full brightness. Power is assumed proportional to brightness. Monthly net kWh = (always-on watts − adaptive lighting watts − system watts) × hours × days ÷ 1,000. Cost = net kWh × example price. Installation costs, taxes and other charges are excluded.</p></details>
  <p className="savings-disclosure">Dummy price: LKR {tariff}/kWh · {hours} hours/day · {days} days/month. Includes {state?.settings.overhead_watts??15} W system overhead. Current brightness held constant; not a measured bill reduction.</p>
 </section>;
}
