/* ===== State ===== */
const state = {
    responses: [],
    words: { anshin: [], kashika: [], design: [] },
    controlScores: [],
    currentFilter: 'all',
    causalData: {
        design: {
            label: '未来的デザイン', emoji: '💡',
            desc: '街灯による温かい光の帯',
            keywords: ['プロジェクションマッピング', '温かい光の帯', 'ルート投影', '街灯デザイン']
        },
        perception: {
            label: '知覚', emoji: '👁',
            desc: '光の見え方・色・明るさ',
            keywords: ['ぼんやりした光', '電球色', '境界の柔らかさ', '温かい色', '淡いオレンジ']
        },
        cognition: {
            label: '認知', emoji: '🧠',
            desc: '状況判断・管理感の有無',
            keywords: ['安全な場所の把握', '押し付けがましくない', '選択肢がある', 'さりげない誘導', '自然な存在']
        },
        emotion: {
            label: '感情', emoji: '❤️',
            desc: '安心感・コントロール感',
            keywords: ['安心', 'リラックス', 'コントロール感の回復', '穏やか', '見守られている']
        },
        behavior: {
            label: '行動', emoji: '🚶',
            desc: '歩行・視線の変化',
            keywords: ['視線を上げる', '歩幅が広がる', '迷わず進む', 'リラックスした歩行', '周囲を見る余裕']
        }
    }
};

/* ===== Column-to-Category Mapping ===== */
// Maps column header keywords to categories for auto-classification
const COLUMN_RULES = [
    { patterns: ['タイムスタンプ', 'timestamp', '日時'], category: '_skip' },
    { patterns: ['学籍', '氏名', 'name', '名前', 'Student'], category: '_respondent' },
    { patterns: ['怖い', '嫌だ', '不安', 'scared', 'disliked', '現状'], category: 'cognition', label: '現状の不安' },
    { patterns: ['注意', '考え', 'attention', 'thinking', 'どこに'], category: 'cognition', label: '認知的負荷' },
    { patterns: ['色', '明るさ', 'color', 'brightness', '見え'], category: 'perception', label: '知覚（光の見え方）' },
    { patterns: ['管理', '監視', 'managed', 'monitored', 'コントロール'], category: '_control_score' },
    { patterns: ['さりげなさ', 'subtlety', '自分で道', '選んで'], category: 'emotion', label: '技術デザイン感' },
    { patterns: ['歩き方', '視線', 'walking', 'gaze', '行動', '変わ'], category: 'behavior', label: '行動変容' }
];

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
    renderCausalFlow();
    renderAllWords();
    updateMeter();
    bindEvents();
    loadState();
});

/* ===== Causal Flow Rendering ===== */
function renderCausalFlow() {
    const container = document.getElementById('causal-flow');
    const keys = ['design', 'perception', 'cognition', 'emotion', 'behavior'];
    container.innerHTML = '';
    keys.forEach((key, i) => {
        const d = state.causalData[key];
        const count = key === 'design' ? '' : state.responses.filter(r => r.category === key).length;
        const node = document.createElement('div');
        node.className = `causal-node node-${key}`;
        node.dataset.key = key;
        node.innerHTML = `
            <div class="causal-node-icon">${d.emoji}</div>
            <h4>${d.label}</h4>
            <p>${d.desc}</p>
            ${count !== '' ? `<span class="node-badge">${count}</span>` : ''}
        `;
        node.addEventListener('click', () => showDetail(key));
        container.appendChild(node);
        if (i < keys.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'causal-arrow';
            arrow.innerHTML = '→';
            container.appendChild(arrow);
        }
    });
}

function showDetail(key) {
    const panel = document.getElementById('causal-detail');
    const title = document.getElementById('detail-title');
    const body = document.getElementById('detail-body');
    const d = state.causalData[key];

    document.querySelectorAll('.causal-node').forEach(n => n.classList.remove('active'));
    document.querySelector(`.node-${key}`).classList.add('active');

    title.textContent = `${d.emoji} ${d.label} — ${d.desc}`;
    
    let html = '<div style="margin-bottom:12px"><strong style="font-size:0.8rem;color:var(--text-secondary)">初期キーワード:</strong></div>';
    d.keywords.forEach(kw => {
        html += `<span class="detail-keyword">${kw}</span>`;
    });

    const relatedResponses = state.responses.filter(r => r.category === key);
    if (relatedResponses.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)"><strong style="font-size:0.8rem;color:var(--text-secondary)">収集した回答 (' + relatedResponses.length + '件):</strong></div>';
        html += '<div style="margin-top:8px">';
        relatedResponses.forEach(r => {
            const sourceLabel = r.sourceColumn ? `<span style="color:var(--accent-warm);font-size:0.68rem;margin-left:6px">${r.sourceColumn}</span>` : '';
            html += `<div style="padding:8px 12px;margin:4px 0;background:var(--bg-card);border-radius:var(--radius-sm);font-size:0.82rem;line-height:1.6"><span style="color:var(--text-muted);font-size:0.72rem">[${r.respondent}]</span> ${escapeHtml(r.text)}${sourceLabel}</div>`;
        });
        html += '</div>';
    }

    body.innerHTML = html;
    panel.classList.remove('hidden');
}

/* ===== Event Binding ===== */
function bindEvents() {
    document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('causal-detail').classList.add('hidden');
        document.querySelectorAll('.causal-node').forEach(n => n.classList.remove('active'));
    });

    document.getElementById('add-response').addEventListener('click', addResponse);

    // Spreadsheet import
    document.getElementById('import-btn').addEventListener('click', importSpreadsheet);
    document.getElementById('clear-import').addEventListener('click', clearAllData);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            renderResponses();
        });
    });

    // Word panel add buttons
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.target;
            const input = document.getElementById(`${type}-input`);
            if (input.value.trim()) {
                state.words[type].push(input.value.trim());
                input.value = '';
                renderWords(type);
                saveState();
            }
        });
    });

    // Word panel enter keys
    ['anshin', 'kashika', 'design'].forEach(type => {
        document.getElementById(`${type}-input`).addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.querySelector(`.btn-add[data-target="${type}"]`).click();
            }
        });
    });

    // Control sense
    const rangeInput = document.getElementById('control-score-input');
    const scoreDisplay = document.getElementById('control-score-display');
    rangeInput.addEventListener('input', () => { scoreDisplay.textContent = rangeInput.value; });
    document.getElementById('add-control-score').addEventListener('click', addControlScore);

    // Export
    document.getElementById('export-btn').addEventListener('click', exportData);

    // Enter key for response
    document.getElementById('response-text').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.metaKey) { addResponse(); }
    });
}

/* ===== Spreadsheet Import ===== */
function importSpreadsheet() {
    const raw = document.getElementById('tsv-input').value.trim();
    if (!raw) return;

    // Detect delimiter (tab or comma)
    const firstLine = raw.split('\n')[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    // Parse rows
    const rows = parseDelimited(raw, delimiter);
    if (rows.length < 2) {
        alert('ヘッダー行と少なくとも1行のデータが必要です。');
        return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map each header column to a category
    const columnMapping = headers.map(header => {
        for (const rule of COLUMN_RULES) {
            for (const pattern of rule.patterns) {
                if (header.toLowerCase().includes(pattern.toLowerCase())) {
                    return { category: rule.category, label: rule.label || header };
                }
            }
        }
        // Default: try to infer from position or skip
        return { category: '_unknown', label: header };
    });

    // Process each data row
    let importedCount = 0;
    const categoryCounts = { perception: 0, cognition: 0, emotion: 0, behavior: 0 };
    let controlScoresImported = 0;

    dataRows.forEach((row, rowIdx) => {
        // Find respondent name from the mapped column
        let respondent = `P${String(rowIdx + 1).padStart(2, '0')}`;
        columnMapping.forEach((map, colIdx) => {
            if (map.category === '_respondent' && row[colIdx]) {
                respondent = row[colIdx].trim();
            }
        });

        // Process each column
        columnMapping.forEach((map, colIdx) => {
            const cellValue = (row[colIdx] || '').trim();
            if (!cellValue) return;

            if (map.category === '_skip' || map.category === '_respondent') return;

            if (map.category === '_control_score') {
                const score = parseInt(cellValue);
                if (score >= 1 && score <= 5) {
                    state.controlScores.push({ respondent, score, id: Date.now() + colIdx + rowIdx * 100 });
                    controlScoresImported++;
                }
                return;
            }

            if (map.category === '_unknown') return;

            // Add as classified response
            state.responses.push({
                text: cellValue,
                category: map.category,
                respondent,
                sourceColumn: map.label,
                id: Date.now() + colIdx + rowIdx * 100
            });
            categoryCounts[map.category] = (categoryCounts[map.category] || 0) + 1;
            importedCount++;
        });
    });

    // Show result summary
    const resultDiv = document.getElementById('import-result');
    const summaryDiv = document.getElementById('import-summary');
    resultDiv.classList.remove('hidden');
    summaryDiv.innerHTML = `
        <div style="margin-bottom:8px"><strong>✅ ${dataRows.length}名分のデータを取り込みました（${importedCount}件の回答）</strong></div>
        <div>
            <span class="summary-stat resp-cat-perception">知覚 ${categoryCounts.perception || 0}件</span>
            <span class="summary-stat resp-cat-cognition">認知 ${categoryCounts.cognition || 0}件</span>
            <span class="summary-stat resp-cat-emotion">感情 ${categoryCounts.emotion || 0}件</span>
            <span class="summary-stat resp-cat-behavior">行動 ${categoryCounts.behavior || 0}件</span>
            ${controlScoresImported > 0 ? `<span class="summary-stat" style="background:var(--accent-warm-dim);color:var(--accent-warm)">コントロール感 ${controlScoresImported}件</span>` : ''}
        </div>
        <div style="margin-top:8px;font-size:0.76rem;color:var(--text-muted)">
            列マッピング: ${columnMapping.filter(m => m.category !== '_skip' && m.category !== '_respondent').map(m => `${m.label}→${getCategoryLabel(m.category)}`).join(' / ')}
        </div>
    `;

    // Refresh all views
    renderResponses();
    renderCausalFlow();
    renderControlScores();
    updateMeter();
    saveState();
}

function getCategoryLabel(cat) {
    const labels = { perception: '知覚', cognition: '認知', emotion: '感情', behavior: '行動', _control_score: 'スコア', _unknown: '未分類' };
    return labels[cat] || cat;
}

function parseDelimited(text, delimiter) {
    // Step 1: Split text into logical rows, respecting quoted fields with newlines
    const rows = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            // End of logical row
            if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
            if (current.trim()) rows.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) rows.push(current);

    // Step 2: Split each logical row into fields
    return rows.map(row => {
        const fields = [];
        let field = '';
        let q = false;
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '"') {
                if (q && row[i + 1] === '"') {
                    field += '"'; i++; // escaped quote
                } else {
                    q = !q;
                }
            } else if (ch === delimiter && !q) {
                fields.push(field.trim());
                field = '';
            } else {
                field += ch;
            }
        }
        fields.push(field.trim());
        return fields;
    });
}

function clearAllData() {
    if (!confirm('すべての取り込みデータをクリアしますか？')) return;
    state.responses = [];
    state.controlScores = [];
    document.getElementById('tsv-input').value = '';
    document.getElementById('import-result').classList.add('hidden');
    renderResponses();
    renderCausalFlow();
    renderControlScores();
    updateMeter();
    saveState();
}

/* ===== Response Management ===== */
function addResponse() {
    const text = document.getElementById('response-text').value.trim();
    const category = document.getElementById('response-category').value;
    const respondent = document.getElementById('response-respondent').value.trim() || 'P??';
    if (!text) return;

    state.responses.push({ text, category, respondent, id: Date.now() });
    document.getElementById('response-text').value = '';
    renderResponses();
    renderCausalFlow();
    saveState();
}

function removeResponse(id) {
    state.responses = state.responses.filter(r => r.id !== id);
    renderResponses();
    renderCausalFlow();
    saveState();
}

function renderResponses() {
    const container = document.getElementById('response-list');
    const catLabels = { perception: '知覚', cognition: '認知', emotion: '感情', behavior: '行動' };
    
    const filtered = state.currentFilter === 'all'
        ? state.responses
        : state.responses.filter(r => r.category === state.currentFilter);
    
    document.getElementById('total-response-count').textContent = state.responses.length;

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.84rem">まだ回答データがありません。スプレッドシートからデータを取り込んでください。</div>';
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="response-item">
            <span class="resp-cat resp-cat-${r.category}">${catLabels[r.category]}</span>
            <span class="resp-text">${escapeHtml(r.text)}</span>
            <span class="resp-id">${escapeHtml(r.respondent)}</span>
            <button class="resp-delete" onclick="removeResponse(${r.id})" title="削除">&times;</button>
        </div>
    `).join('');
}

/* ===== Word Management ===== */
function renderWords(type) {
    const list = document.getElementById(`${type}-list`);
    const count = document.getElementById(`${type}-count`);
    count.textContent = state.words[type].length;
    list.innerHTML = state.words[type].map((w, i) => `
        <li class="word-tag word-tag-${type}">
            ${escapeHtml(w)}
            <button onclick="removeWord('${type}', ${i})">&times;</button>
        </li>
    `).join('');
}

function renderAllWords() {
    ['anshin', 'kashika', 'design'].forEach(renderWords);
}

function removeWord(type, index) {
    state.words[type].splice(index, 1);
    renderWords(type);
    saveState();
}

/* ===== Control Meter ===== */
function addControlScore() {
    const respondent = document.getElementById('control-respondent').value.trim() || 'P??';
    const score = parseInt(document.getElementById('control-score-input').value);
    state.controlScores.push({ respondent, score, id: Date.now() });
    document.getElementById('control-respondent').value = '';
    document.getElementById('control-score-input').value = 3;
    document.getElementById('control-score-display').textContent = '3';
    renderControlScores();
    updateMeter();
    saveState();
}

function removeControlScore(id) {
    state.controlScores = state.controlScores.filter(s => s.id !== id);
    renderControlScores();
    updateMeter();
    saveState();
}

function renderControlScores() {
    const container = document.getElementById('control-response-list');
    container.innerHTML = state.controlScores.map(s => {
        const color = s.score <= 2 ? 'var(--accent-rose)' : s.score >= 4 ? 'var(--accent-emerald)' : 'var(--accent-warm)';
        return `<div class="control-chip">
            <span>${escapeHtml(s.respondent)}</span>
            <span class="chip-score" style="color:${color}">${s.score}</span>
            <button onclick="removeControlScore(${s.id})">&times;</button>
        </div>`;
    }).join('');
}

function updateMeter() {
    const fill = document.getElementById('meter-fill');
    const thumb = document.getElementById('meter-thumb');
    const valueText = document.getElementById('meter-value-text');
    const scoreText = document.getElementById('meter-score');

    let avg = 3;
    if (state.controlScores.length > 0) {
        avg = state.controlScores.reduce((sum, s) => sum + s.score, 0) / state.controlScores.length;
    }

    const pct = ((avg - 1) / 4) * 100;
    fill.style.width = pct + '%';
    thumb.style.left = pct + '%';
    scoreText.textContent = avg.toFixed(1) + ' / 5.0';

    if (avg <= 2) {
        valueText.textContent = '⚠️ 管理されている感が強い';
        valueText.style.color = 'var(--accent-rose)';
    } else if (avg >= 4) {
        valueText.textContent = '✅ 自律的コントロール感が高い';
        valueText.style.color = 'var(--accent-emerald)';
    } else {
        valueText.textContent = '⚖️ バランス良好';
        valueText.style.color = 'var(--accent-warm)';
    }
}

/* ===== Export ===== */
function exportData() {
    const data = {
        exportDate: new Date().toISOString(),
        project: '冬環境における可視化デザイン「温かい光の街灯」感性評価',
        responses: state.responses,
        kansei_words: {
            anshin_go: state.words.anshin,
            kashika_go: state.words.kashika,
            design_go: state.words.design
        },
        control_sense: {
            scores: state.controlScores,
            average: state.controlScores.length > 0
                ? (state.controlScores.reduce((s, c) => s + c.score, 0) / state.controlScores.length).toFixed(2)
                : null
        },
        causal_model: state.causalData
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kansei_analysis_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ===== Persistence ===== */
function saveState() {
    try {
        localStorage.setItem('visible-safety-state', JSON.stringify({
            responses: state.responses,
            words: state.words,
            controlScores: state.controlScores
        }));
    } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        const saved = localStorage.getItem('visible-safety-state');
        if (saved) {
            const data = JSON.parse(saved);
            state.responses = data.responses || [];
            state.words = data.words || { anshin: [], kashika: [], design: [] };
            state.controlScores = data.controlScores || [];
            renderResponses();
            renderAllWords();
            renderControlScores();
            updateMeter();
            renderCausalFlow();
        }
    } catch (e) { /* ignore */ }

    // Populate default words if empty
    if (state.words.anshin.length === 0) {
        state.words.anshin = ['安心', 'リラックス', '穏やか', '見守られている', 'ほっとする'];
        state.words.kashika = ['ぼんやりした光', '電球色', '境界の柔らかさ', '淡いオレンジ', '暖色系'];
        state.words.design = ['さりげない誘導', '選択の自由', '押し付けない', '自然な存在感', '調和'];
        renderAllWords();
        saveState();
    }
}

/* ===== Utils ===== */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
