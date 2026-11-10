import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSavings,DEFAULT_TARIFF} from '../src/savings.ts';
test('one occupied aisle includes overhead and converts W to monthly kWh and LKR',()=>{
 const s=calculateSavings([30,100,30],60,15,50,12,30);
 assert.equal(s.baseline,180);assert.equal(s.adaptive,111);assert.equal(s.net,69);
 assert.equal(s.kwh,24.84);assert.equal(s.cost,1242);assert.equal(s.baselineCost-s.adaptiveCost,s.cost);
});
test('all lights full shows extra cost rather than fabricated savings',()=>{
 const s=calculateSavings([100,100,100],60,15,50,12,30);
 assert.equal(s.net,-15);assert.equal(s.cost,-270);
});
test('tariff and opening hours scale cost without changing power',()=>{
 const s=calculateSavings([30,100,30],60,15,100,6,30);
 assert.equal(s.net,69);assert.equal(s.kwh,12.42);assert.equal(s.cost,1242);
});

test('user-selected 300 rupee unit rate gives the final demonstration costs',()=>{
 assert.equal(DEFAULT_TARIFF,300);
 const s=calculateSavings([30,100,30],60,15,DEFAULT_TARIFF,12,30);
 assert.equal(s.baselineCost,19440);assert.equal(s.adaptiveCost,11988);
 assert.equal(s.cost,7452);assert.equal(s.cost*12,89424);
});
