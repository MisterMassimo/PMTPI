const listaAppunti = document.getElementById("listaAppunti");

// MAPPA PROVANDO
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

const map = L.map('map').setView([45.55, 10.25], 13);

osm.addTo(map);

setTimeout(() => {
    map.invalidateSize();
    console.log("Mappa inizializzata correttamente");
}, 100);

const luoghiLayer = L.layerGroup().addTo(map);  

function caricaLuoghiDaPB() {
    // prima carica i record
    fetch('http://127.0.0.1:8090/api/collections/LUOGO/records')
      .then(r => r.json())
      .then(recordsData => {
        // poi prova a caricare gli stati (se fallisce usa array vuoto)
        fetch('http://127.0.0.1:8090/api/collections/LUOGO/stato')
          .then(r => r.json())
          .catch(() => ({ items: [] }))
          .then(statoData => {
            luoghiLayer.clearLayers();
            listaAppunti.innerHTML = '';
            if (!recordsData || !recordsData.items) return;

            const statoMap = new Map();
            if (statoData && statoData.items) {
                for (const s of statoData.items) {
                    if (s && s.luogoId) statoMap.set(s.luogoId, s.stato);
                }
            }

            const filter = document.getElementById('filterSelect');
            const currentFilter = filter ? filter.value : 'all';

            for (const item of recordsData.items) {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lng);
                const title = item.title || item.coord || 'Punto salvato';
                const stato = (statoMap.has(item.id) ? statoMap.get(item.id) : (item.stato || 'non aggiunto'));

                // applica filtro: se non corrisponde, salta
                if (currentFilter === 'raggiunti' && stato !== 'aggiunto') continue;
                if (currentFilter === 'non_raggiunti' && stato === 'aggiunto') continue;

                if (!isNaN(lat) && !isNaN(lng)) {
                    const marker = L.marker([lat, lng]).addTo(luoghiLayer).bindPopup(title);

                    const div = document.createElement('div');
                    div.className = 'appunto-item';
                    if (stato === 'aggiunto') div.style.backgroundColor = '#d4edda';
                    div.innerHTML = `<strong>${escapeHtml(title)}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    div.style.cursor = 'pointer';


                    const delBtn = document.createElement('button');
                    delBtn.textContent = 'Elimina';
                    delBtn.style.marginLeft = '8px';
                    delBtn.onclick = (ev) => { ev.stopPropagation(); if (!item.id) return; fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, { method: 'DELETE' }).then(() => caricaLuoghiDaPB()).catch(()=>{}); };
                    div.appendChild(delBtn);

                    // bottone toggle stato (usa PATCH sul record LUOGO)
                    const statoBtn = document.createElement('button');
                    statoBtn.textContent = (stato === 'aggiunto') ? 'Raggiunto' : 'Non raggiunto';
                    statoBtn.style.marginLeft = '8px';
                    statoBtn.onclick = (ev) => {
                        ev.stopPropagation();
                        if (!item.id) return;
                        const nuovo = (stato === 'aggiunto') ? 'non aggiunto' : 'aggiunto';
                        fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stato: nuovo })
                        }).then(res => { if (res.ok) caricaLuoghiDaPB(); }).catch(()=>{});
                    };
                    div.appendChild(statoBtn);

                    div.addEventListener('click', () => { map.setView([lat, lng], 13); marker.openPopup(); });

                    listaAppunti.appendChild(div);
                }
            }
          });
      })
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}


caricaLuoghiDaPB();

// applica immediatamente il filtro quando l'utente cambia selezione
const filterSelectEl = document.getElementById('filterSelect');
if (filterSelectEl) {
    filterSelectEl.addEventListener('change', () => {
        caricaLuoghiDaPB();
    });
}

//RICERCA
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchInput.value.trim().toLowerCase();
      
      fetch('http://127.0.0.1:8090/api/collections/LUOGO/records')
        .then(r => r.json())
        .then(data => {
          listaAppunti.innerHTML = '';
          luoghiLayer.clearLayers();
          if (!data || !data.items) return;
          for (const item of data.items) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lng);
            const title = (item.title || item.coord || 'Punto salvato');
            const stato = item.stato || 'non aggiunto';
            const filter = document.getElementById('filterSelect');
            const currentFilter = filter ? filter.value : 'all';
            if (currentFilter === 'raggiunti' && stato !== 'aggiunto') continue;
            if (currentFilter === 'non_raggiunti' && stato === 'aggiunto') continue;
            if (title.toLowerCase().includes(q) && !isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng]).addTo(luoghiLayer).bindPopup(title);

              const div = document.createElement('div');
              div.className = 'appunto-item';
              div.innerHTML = `<strong>${escapeHtml(title)}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`;
              div.style.cursor = 'pointer';

              const delBtn = document.createElement('button');
              delBtn.textContent = 'Elimina';
              delBtn.style.marginLeft = '8px';
              delBtn.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  if (!confirm(`Eliminare "${title}"?`)) return;
                  if (!item.id) { alert('ID record non disponibile'); return; }
                  fetch(`http://127.0.0.1:8090/api/collections/LUOGO/records/${item.id}`, { method: 'DELETE' })
                    .then(res => { if (res.ok) { caricaLuoghiDaPB(); } else { alert('Errore durante l\'eliminazione'); } })
              });

              div.appendChild(delBtn);

              div.addEventListener('click', () => {
                map.setView([lat, lng], 13);
                marker.openPopup();
              });

              listaAppunti.appendChild(div);
            }
          }
        });
    }
  });
}

function onMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const popupContent = `  
        <div>
            <div><strong>Lat:</strong> ${lat.toFixed(5)}</div>
            <div><strong>Lng:</strong> ${lng.toFixed(5)}</div>
            <div style="margin-top:6px"><input id="saveTitle" placeholder="Titolo (es: Casa, Punto 1)" style="width:100%" /></div>
            <button id="saveCoordBtn" style="margin-top:6px">Salva coordinate</button>
            <div id="saveStatus" style="margin-top:6px;font-size:90%"></div>
        </div>
    `;

    const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);

    setTimeout(() => {
        const btn = document.getElementById('saveCoordBtn');
        const status = document.getElementById('saveStatus');
        const titleInput = document.getElementById('saveTitle');
        if (!btn) return;

        // replace button with a clean clone to remove previous listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            newBtn.disabled = true;
            newBtn.textContent = 'Salvando...';
            if (status) status.textContent = '';
            const titleVal = titleInput ? titleInput.value.trim() : '';

            fetch('http://127.0.0.1:8090/api/collections/LUOGO/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lat: lat,
                    lng: lng,
                    title: titleVal,
                    coord: `${lat}|${lng}`
                })
            })
            .then(res => {
                if (!res.ok) {
                    newBtn.disabled = false;
                    newBtn.textContent = 'Salva coordinate';
                    return null;
                }
                return res.json();
            })
            .then(result => {
                if (!result) return;
                caricaLuoghiDaPB();
                map.closePopup(); 
                newBtn.disabled = false;
                newBtn.textContent = 'Salvato';
            })
        });
    }, 50);
}

map.on('click', onMapClick);




