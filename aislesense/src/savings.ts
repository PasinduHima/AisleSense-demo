export const DEFAULT_TARIFF = 300; // User-selected illustrative LKR per kWh.
export function calculateSavings(levels:number[],watts:number,overhead:number,tariff:number,hours:number,days:number){
 const baseline=levels.length*watts;
 const lighting=levels.reduce((sum,level)=>sum+watts*Math.max(0,Math.min(100,level))/100,0);
 const adaptive=lighting+overhead,net=baseline-adaptive;
 const kwh=net*hours*days/1000;
 return {baseline,lighting,adaptive,net,percent:baseline?net/baseline*100:0,kwh,
  baselineCost:baseline*hours*days/1000*tariff,adaptiveCost:adaptive*hours*days/1000*tariff,cost:kwh*tariff};
}
