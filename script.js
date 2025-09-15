// Frontend-only SAW app (no backend) - stores data in localStorage and computes SAW
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tabpanel');
  const criteriaList = document.getElementById('criteria-list');
  const addCritBtn = document.getElementById('add-crit');
  const totalWeightEl = document.getElementById('total-weight');
  const altHead = document.getElementById('alt-head');
  const altBody = document.getElementById('alt-body');
  const addAltBtn = document.getElementById('add-alt');
  const calcBtn = document.getElementById('calc');
  const resultTbody = document.querySelector('#rank-table tbody');
  const detail = document.getElementById('detail');
  const importCsv = document.getElementById('import-csv');
  const saveLocal = document.getElementById('save-local');
  const loadLocal = document.getElementById('load-local');
  const exportCsv = document.getElementById('export-csv');
  const clearLocal = document.getElementById('clear-local');

  // Tab switch
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  }));

  // Utilities
  const uid = () => 'id'+Math.random().toString(36).slice(2,9);
  const round4 = v => Number.parseFloat(v).toFixed(4);

  // Default sample data
  const sampleCriteria = [
    {id: uid(), name:'Penghasilan Bulanan', weight:0.2, type:'cost'},
    {id: uid(), name:'Tanggungan Keluarga', weight:0.2, type:'benefit'},
    {id: uid(), name:'Kondisi Rumah', weight:0.25, type:'benefit'},
    {id: uid(), name:'Pekerjaan', weight:0.15, type:'benefit'},
    {id: uid(), name:'Usia', weight:0.1, type:'benefit'},
    {id: uid(), name:'Status Tempat Tinggal', weight:0.1, type:'benefit'}
  ];
  const sampleAlts = [
    {id: uid(), name:'UPIN', vals:[3500000,1,3,1,55,2]},
    {id: uid(), name:'IPIN', vals:[3000000,3,2,2,55,2]},
    {id: uid(), name:'AFIK', vals:[2500000,5,5,5,50,5]},
    {id: uid(), name:'IMSAR', vals:[750000,5,5,5,57,4]}
  ];

  // State (load from localStorage if present)
  let state = { criteria: [], alternatives: [] };
  function loadState(){
    const raw = localStorage.getItem('saw_state_v1');
    if(raw){ try{ state = JSON.parse(raw); }catch(e){ state = {criteria:[],alternatives:[]} } }
    if(state.criteria.length===0 && state.alternatives.length===0){
      state.criteria = sampleCriteria;
      state.alternatives = sampleAlts;
    }
  }
  function saveState(){ localStorage.setItem('saw_state_v1', JSON.stringify(state)); }

  // Rendering
  function renderCriteria(){
    criteriaList.innerHTML = '';
    state.criteria.forEach(c => {
      const row = document.createElement('div'); row.className='crit-row'; row.dataset.id=c.id;
      row.innerHTML = `
        <div class="label"><input class="crit-name" type="text" value="${escapeHtml(c.name)}" /></div>
        <select class="crit-type">
          <option value="benefit"${c.type==='benefit'?' selected':''}>Benefit</option>
          <option value="cost"${c.type==='cost'?' selected':''}>Cost</option>
        </select>
        <input class="crit-weight" type="number" step="any" value="${c.weight}" />
        <button class="btn secondary remove-crit">Hapus</button>
      `;
      criteriaList.appendChild(row);
      row.querySelector('.remove-crit').addEventListener('click', ()=>{
        state.criteria = state.criteria.filter(x=>x.id!==c.id);
        syncAfterChange();
      });
      row.querySelectorAll('input,select').forEach(el=>el.addEventListener('input', ()=>{
        const id = row.dataset.id;
        const idx = state.criteria.findIndex(x=>x.id===id);
        if(idx>-1){
          state.criteria[idx].name = row.querySelector('.crit-name').value;
          state.criteria[idx].type = row.querySelector('.crit-type').value;
          state.criteria[idx].weight = parseFloat(row.querySelector('.crit-weight').value) || 0;
          updateTotalWeight();
          syncTableHeaders();
        }
      }));
    });
    updateTotalWeight();
    syncTableHeaders();
  }

  function updateTotalWeight(){
    const total = state.criteria.reduce((s,c)=>s + (isFinite(c.weight)?c.weight:0),0);
    totalWeightEl.textContent = total.toFixed(2);
  }

  function syncTableHeaders(){
    // build table header based on criteria
    const tr = document.createElement('tr');
    tr.innerHTML = '<th>Alternatif</th>' + state.criteria.map(c=>`<th>${escapeHtml(c.name)}<div class="small">(${c.type})</div></th>`).join('') + '<th class="actions-col">Aksi</th>';
    altHead.innerHTML = ''; altHead.appendChild(tr);
    // ensure each alt row has same number of inputs
    altBody.querySelectorAll('tr').forEach(tr=>{
      const inputs = tr.querySelectorAll('.alt-val');
      const need = state.criteria.length;
      const nameCell = tr.querySelector('.alt-name');
      const actionCell = tr.querySelector('.alt-action');
      // remove extra
      while(inputs.length > need){
        inputs[inputs.length-1].closest('td').remove();
        inputs = tr.querySelectorAll('.alt-val');
      }
      // add missing
      while(tr.querySelectorAll('.alt-val').length < need){
        const td = document.createElement('td');
        td.innerHTML = `<input class="alt-val" type="number" step="any" value="0">`;
        actionCell.before(td);
      }
    });
    renderAlts(); // rebind values
  }

  function renderAlts(){
    altBody.innerHTML = '';
    state.alternatives.forEach(alt => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="alt-name"><input class="alt-name-in" value="${escapeHtml(alt.name)}"></td>` +
        state.criteria.map((c,idx)=>`<td><input class="alt-val" type="number" step="any" value="${alt.vals[idx]!==undefined?alt.vals[idx]:0}"></td>`).join('') +
        `<td class="alt-action"><button class="btn secondary remove-alt">Hapus</button></td>`;
      altBody.appendChild(tr);
      tr.querySelector('.remove-alt').addEventListener('click', ()=>{
        state.alternatives = state.alternatives.filter(a=>a.id!==alt.id);
        syncAfterChange();
      });
      tr.querySelector('.alt-name-in').addEventListener('input', (e)=>{
        alt.name = e.target.value;
        saveState();
      });
      tr.querySelectorAll('.alt-val').forEach((inp,idx)=>inp.addEventListener('input', (e)=>{
        alt.vals[idx] = parseFloat(e.target.value) || 0;
        saveState();
      }));
    });
  }

  // Actions
  addCritBtn.addEventListener('click', ()=>{
    state.criteria.push({id: uid(), name:'Kriteria', weight:1, type:'benefit'});
    syncAfterChange();
  });

  addAltBtn.addEventListener('click', ()=>{
    const vals = state.criteria.map(_=>0);
    state.alternatives.push({id: uid(), name:'Alternatif', vals});
    syncAfterChange();
  });

  function syncAfterChange(){ saveState(); renderCriteria(); renderAlts(); }

  calcBtn.addEventListener('click', ()=>{
    const res = computeSAW();
    renderResults(res);
    // switch to results tab
    document.querySelector('.tab[data-tab="results"]').click();
  });

  function computeSAW(){
    const criteria = state.criteria;
    const alts = state.alternatives;
    const critCount = criteria.length;
    const altCount = alts.length;
    const totalWeight = criteria.reduce((s,c)=>s + (isFinite(c.weight)?c.weight:0),0) || 1;
    const weights = criteria.map(c => (isFinite(c.weight)?c.weight:0)/totalWeight);

    // build matrix
    const matrix = alts.map(a => a.vals.slice(0,critCount));
    // normalized
    const normalized = Array.from({length:altCount}, ()=>Array(critCount).fill(0));
    for(let j=0;j<critCount;j++){
      const col = matrix.map(r=> isFinite(r[j])?r[j]:0 );
      const max = Math.max(...col);
      const min = Math.min(...col);
      for(let i=0;i<altCount;i++){
        const val = matrix[i][j] || 0;
        if(criteria[j].type === 'benefit'){
          normalized[i][j] = (max === 0) ? 0 : (val / max);
        } else {
          normalized[i][j] = (val === 0) ? 0 : (min / val);
        }
      }
    }
    const weighted = normalized.map(row => row.map((v,j)=> v * weights[j]));
    const scores = weighted.map(row => row.reduce((s,x)=>s+x,0));
    const ranked = alts.map((a,idx)=>({name:a.name, score:scores[idx]})).sort((a,b)=>b.score - a.score);
    return {criteria, alts, weights, normalized, weighted, scores, ranked};
  }

  function renderResults(res){
    resultTbody.innerHTML = '';
    res.ranked.forEach((r,idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>#${idx+1}</td><td>${escapeHtml(r.name)}</td><td>${round4(r.score)}</td>`;
      resultTbody.appendChild(tr);
    });
    detail.innerHTML = `Alternatif: ${state.alternatives.length} • Kriteria: ${state.criteria.length} • Alternatif terbaik: ${res.ranked[0]?.name || '-'}`;
  }

  // CSV import (simple)
  importCsv.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = function(evt){ parseCSV(evt.target.result); };
    reader.readAsText(f,'utf-8');
  });

  function parseCSV(text){
    const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(r=>r.length>0);
    if(rows.length < 2){ alert('CSV minimal header + 1 baris data'); return; }
    const headers = rows[0].split(',').map(h=>h.trim());
    const second = rows[1].split(',').map(c=>c.trim());
    // clear
    state.criteria = []; state.alternatives = [];
    // criteria from headers (skip first column)
    for(let i=1;i<headers.length;i++){
      let name = headers[i] || `K${i}`; let type='benefit'; let weight=1;
      if(second[i]){
        const parts = second[i].split('|').map(p=>p.trim());
        parts.forEach(p=>{
          if(p==='benefit' || p==='cost') type=p; else if(!isNaN(parseFloat(p))) weight=parseFloat(p);
        });
      }
      state.criteria.push({id:uid(), name, type, weight});
    }
    // alternatives rows
    for(let r=1;r<rows.length;r++){
      const cols = rows[r].split(',').map(c=>c.trim());
      const name = cols[0] || `Alt${r}`;
      const vals = [];
      for(let i=1;i<headers.length;i++) vals.push(parseFloat(cols[i]) || 0);
      state.alternatives.push({id:uid(), name, vals});
    }
    syncAfterChange();
  }

  // export CSV ranking
  exportCsv.addEventListener('click', ()=>{
    const res = computeSAW();
    let csv = 'Peringkat,Alternatif,Skor\n';
    res.ranked.forEach((r,idx)=> csv += `${idx+1},${escapeCsv(r.name)},${r.score}\n`);
    downloadText('hasil_saw.csv', csv);
  });

  // local save / load / clear
  saveLocal.addEventListener('click', ()=>{ saveState(); alert('Disimpan ke localStorage'); });
  loadLocal.addEventListener('click', ()=>{ loadState(); renderCriteria(); renderAlts(); alert('Data dimuat dari localStorage'); });
  clearLocal.addEventListener('click', ()=>{ localStorage.removeItem('saw_state_v1'); state={criteria:[],alternatives:[]}; loadState(); renderCriteria(); renderAlts(); alert('Local storage dibersihkan'); });

  function downloadText(filename, text){
    const blob = new Blob([text], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // helpers
  function escapeHtml(s){ if(s==null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
  function escapeCsv(s){ const st = String(s); if(st.includes(',')||st.includes('"')||st.includes('\n')) return '"' + st.replaceAll('"','""') + '"'; return st; }

  // init
  loadState();
  renderCriteria();
  renderAlts();
});
