export const JOG_MULTIPLIERS=Object.freeze([1,10,100,1000]);
const BASE_INCREMENT=0.001;

export function normalizeJogMultiplier(value){
  const n=Number(value);
  return JOG_MULTIPLIERS.includes(n)?n:1;
}

export function jogStepForMultiplier(value){
  return BASE_INCREMENT*normalizeJogMultiplier(value);
}

export function renderJogMultiplierControls(value=1){
  const active=normalizeJogMultiplier(value);
  return `<div class="mpg-control" data-mpg-control><span class="mpg-label">MPG</span><div class="mpg-options">${JOG_MULTIPLIERS.map(mult=>`<button type="button" data-jog-multiplier="${mult}" class="mpg-btn${mult===active?' active':''}">×${mult}</button>`).join('')}</div><span class="mpg-readout" data-mpg-readout>倍率 ×${active}</span></div>`;
}
