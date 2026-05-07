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

    // Analysis
    document.getElementById('run-analysis-btn').addEventListener('click', runAnalysis);

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

/* ========================================
   QUALITATIVE ANALYSIS ENGINE
   ======================================== */

const DICTIONARY = {
    positive: ['安心','温かい','穏やか','リラックス','自然','ほっとする','優しい','柔らかい','落ち着く','心地よい','守られ','見守','快適','好き','良い','いい','素敵','きれい','美しい','嬉しい','楽しい','安全','信頼','自由','選べる','選んで'],
    negative: ['怖い','不安','暗い','危険','嫌','監視','管理','強制','圧迫','うるさい','邪魔','違和感','気持ち悪い','冷たい','寒い','滑','転','痛い','恐','心配','緊張','ストレス','追われ','見られ'],
    perception: ['光','色','明る','暗','オレンジ','電球','白','ぼんやり','くっきり','眩','影','輝','照','反射','温かみ','暖色','寒色'],
    control: ['自分で','選','コントロール','自由','自律','主体','押し付け','強制','誘導','管理','監視','指示','命令','従'],
    design: ['さりげな','自然','境界','ぼかし','グラデーション','帯','ルート','投影','プロジェクション','街灯','LED','センサー']
};

function runAnalysis() {
    if (state.responses.length === 0 && state.controlScores.length === 0) {
        document.getElementById('analysis-status').textContent = '⚠️ 先にデータを取り込んでください';
        return;
    }
    document.getElementById('analysis-status').textContent = '✅ 分析完了';
    document.getElementById('analysis-panels').classList.remove('hidden');
    renderKeywordChart();
    renderSentimentMap();
    renderControlDistChart();
    renderFeedback();
    renderRecommendations();
    renderInsight();
}

/* ----- Keyword Frequency Chart ----- */
function renderKeywordChart() {
    const allText = state.responses.map(r => r.text).join(' ');
    const freq = {};
    // Count dictionary words
    [...DICTIONARY.positive, ...DICTIONARY.negative, ...DICTIONARY.perception, ...DICTIONARY.design, ...DICTIONARY.control].forEach(w => {
        const re = new RegExp(w, 'gi');
        const m = allText.match(re);
        if (m && m.length > 0) freq[w] = (freq[w] || 0) + m.length;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (sorted.length === 0) return;

    const canvas = document.getElementById('keyword-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.offsetWidth, H = 220;
    ctx.clearRect(0, 0, W, H);

    const maxVal = sorted[0][1];
    const barH = 16, gap = 6, leftPad = 90, rightPad = 40;
    const barArea = W - leftPad - rightPad;

    sorted.forEach(([word, count], i) => {
        const y = 10 + i * (barH + gap);
        const bw = (count / maxVal) * barArea;
        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(word, leftPad - 8, y + barH - 3);
        // Bar
        const isPos = DICTIONARY.positive.includes(word);
        const isNeg = DICTIONARY.negative.includes(word);
        ctx.fillStyle = isNeg ? 'rgba(251,113,133,0.7)' : isPos ? 'rgba(52,211,153,0.7)' : 'rgba(251,191,36,0.5)';
        ctx.beginPath();
        ctx.roundRect(leftPad, y, bw, barH, 3);
        ctx.fill();
        // Count
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'left';
        ctx.fillText(count, leftPad + bw + 6, y + barH - 3);
    });
}

/* ----- Sentiment Map ----- */
function renderSentimentMap() {
    const container = document.getElementById('sentiment-map');
    const categories = ['perception', 'cognition', 'emotion', 'behavior'];
    const labels = { perception: '知覚', cognition: '認知', emotion: '感情', behavior: '行動' };
    let html = '';

    categories.forEach(cat => {
        const items = state.responses.filter(r => r.category === cat);
        if (items.length === 0) { html += `<div class="sentiment-row"><span class="sentiment-label">${labels[cat]}</span><span class="sentiment-pct" style="flex:1;text-align:left">データなし</span></div>`; return; }
        let pos = 0, neg = 0, neu = 0;
        items.forEach(r => {
            const t = r.text;
            const pHit = DICTIONARY.positive.some(w => t.includes(w));
            const nHit = DICTIONARY.negative.some(w => t.includes(w));
            if (pHit && !nHit) pos++;
            else if (nHit && !pHit) neg++;
            else if (pHit && nHit) { pos += 0.5; neg += 0.5; }
            else neu++;
        });
        const total = pos + neg + neu;
        const pP = Math.round(pos / total * 100), nP = Math.round(neg / total * 100), uP = 100 - pP - nP;
        html += `<div class="sentiment-row">
            <span class="sentiment-label">${labels[cat]}</span>
            <div class="sentiment-bar-track">
                <div class="sentiment-bar-pos" style="width:${pP}%"></div>
                <div class="sentiment-bar-neg" style="width:${nP}%"></div>
                <div class="sentiment-bar-neu" style="width:${uP}%"></div>
            </div>
            <span class="sentiment-pct">＋${pP}% −${nP}%</span>
        </div>`;
    });
    container.innerHTML = html;
}

/* ----- Control Distribution Chart ----- */
function renderControlDistChart() {
    const scores = state.controlScores.map(s => s.score);
    if (scores.length === 0) return;
    const dist = [0, 0, 0, 0, 0];
    scores.forEach(s => dist[s - 1]++);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
    const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Chart
    const canvas = document.getElementById('control-dist-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.offsetWidth, H = 160;
    ctx.clearRect(0, 0, W, H);
    const maxD = Math.max(...dist, 1);
    const barW = W / 7, pad = barW;
    const colors = ['rgba(251,113,133,0.7)', 'rgba(251,113,133,0.4)', 'rgba(251,191,36,0.5)', 'rgba(52,211,153,0.4)', 'rgba(52,211,153,0.7)'];

    dist.forEach((d, i) => {
        const x = pad + i * (barW + 8);
        const bh = (d / maxD) * (H - 40);
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.roundRect(x, H - 20 - bh, barW, bh, 4);
        ctx.fill();
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d, x + barW / 2, H - 24 - bh);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText(i + 1, x + barW / 2, H - 4);
    });

    // Stats
    document.getElementById('control-stats').innerHTML = `
        <div class="stat-row"><span class="stat-label">回答数</span><span class="stat-value">${scores.length}</span></div>
        <div class="stat-row"><span class="stat-label">平均値</span><span class="stat-value">${avg.toFixed(2)}</span></div>
        <div class="stat-row"><span class="stat-label">中央値</span><span class="stat-value">${median.toFixed(1)}</span></div>
        <div class="stat-row"><span class="stat-label">標準偏差</span><span class="stat-value">${stdDev.toFixed(2)}</span></div>
        <div class="stat-row"><span class="stat-label">最小–最大</span><span class="stat-value">${Math.min(...scores)} – ${Math.max(...scores)}</span></div>
    `;
}

/* ----- Feedback Extraction ----- */
function renderFeedback() {
    const container = document.getElementById('feedback-list');
    const items = [];

    state.responses.forEach(r => {
        const t = r.text;
        const pHit = DICTIONARY.positive.filter(w => t.includes(w));
        const nHit = DICTIONARY.negative.filter(w => t.includes(w));

        if (nHit.length > 0 && pHit.length === 0) {
            items.push({ type: 'negative', icon: '🔴', label: '警告フィードバック', cssType: 'neg', text: t, respondent: r.respondent, category: r.category, keywords: nHit, priority: 2 });
        }
        if (pHit.length > 0 && nHit.length === 0) {
            items.push({ type: 'positive', icon: '🟢', label: '肯定フィードバック', cssType: 'pos', text: t, respondent: r.respondent, category: r.category, keywords: pHit, priority: 1 });
        }
        if (pHit.length > 0 && nHit.length > 0) {
            items.push({ type: 'conflict', icon: '⚡', label: '矛盾・葛藤', cssType: 'conflict', text: t, respondent: r.respondent, category: r.category, keywords: [...pHit, ...nHit], priority: 3 });
        }
    });

    // Representative quotes (longest per category)
    const cats = ['perception', 'cognition', 'emotion', 'behavior'];
    const catLabels = { perception: '知覚', cognition: '認知', emotion: '感情', behavior: '行動' };
    cats.forEach(cat => {
        const catResponses = state.responses.filter(r => r.category === cat);
        if (catResponses.length === 0) return;
        const longest = catResponses.reduce((a, b) => a.text.length > b.text.length ? a : b);
        if (longest.text.length > 10) {
            items.push({ type: 'representative', icon: '💬', label: `代表的な声（${catLabels[cat]}）`, cssType: 'rep', text: longest.text, respondent: longest.respondent, category: cat, keywords: [], priority: 0 });
        }
    });

    items.sort((a, b) => b.priority - a.priority);

    if (items.length === 0) {
        container.innerHTML = '<div class="analysis-empty">フィードバックの抽出にはより多くの回答データが必要です</div>';
        return;
    }

    container.innerHTML = items.map(fb => `
        <div class="feedback-item fb-${fb.type}">
            <span class="feedback-icon">${fb.icon}</span>
            <div class="feedback-body">
                <div class="feedback-type feedback-type-${fb.cssType}">${fb.label}</div>
                <div class="feedback-quote">${escapeHtml(fb.text)}</div>
                <div class="feedback-meta">
                    回答者: ${escapeHtml(fb.respondent)}
                    ${fb.keywords.length > 0 ? ' — キーワード: ' + fb.keywords.map(k => `<strong>${escapeHtml(k)}</strong>`).join(', ') : ''}
                </div>
            </div>
        </div>
    `).join('');
}

/* ----- Design Recommendations ----- */
function renderRecommendations() {
    const container = document.getElementById('recommendations-list');
    const recs = [];
    const allText = state.responses.map(r => r.text).join(' ');
    const scores = state.controlScores.map(s => s.score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3;
    const totalResponses = state.responses.length;

    const countWord = (w) => (allText.match(new RegExp(w, 'g')) || []).length;
    const countWords = (arr) => arr.reduce((s, w) => s + countWord(w), 0);
    const negInPerception = state.responses.filter(r => r.category === 'perception' && DICTIONARY.negative.some(w => r.text.includes(w))).length;
    const negInCognition = state.responses.filter(r => r.category === 'cognition' && DICTIONARY.negative.some(w => r.text.includes(w))).length;

    // Rule 1: Low control sense
    if (avg < 2.5 && scores.length > 0) {
        recs.push({ icon: '⚠️', title: '光の帯の「強制感」を軽減する', desc: 'コントロール感の平均が低く、ユーザーが「管理されている」と感じている可能性があります。光の帯の境界をより曖昧にし、ルートを「提案」に留める表現に変更することを検討してください。', evidence: `コントロール感平均: ${avg.toFixed(1)} / 5.0`, priority: 'high' });
    }
    // Rule 2: High control - positive
    if (avg >= 4.0 && scores.length > 0) {
        recs.push({ icon: '✅', title: 'コントロール感は良好', desc: '回答者は自律的な選択感を感じており、「さりげない」デザインが機能しています。この方向性を維持することが推奨されます。', evidence: `コントロール感平均: ${avg.toFixed(1)} / 5.0`, priority: 'low' });
    }
    // Rule 3: Brightness concerns
    if (countWords(['明るすぎ', '眩', 'まぶし', '眩しい']) > 0) {
        recs.push({ icon: '💡', title: '光の輝度を下げる', desc: '「明るすぎる」「眩しい」という指摘があります。光の輝度を下げ、より間接的な照明効果にすることで「さりげなさ」を向上できる可能性があります。', evidence: `関連キーワード出現: ${countWords(['明るすぎ', '眩', 'まぶし'])}回`, priority: 'high' });
    }
    // Rule 4: Surveillance concern
    if (countWords(['監視', '見られ', '追われ', 'カメラ']) > 0) {
        recs.push({ icon: '🔴', title: '監視感の払拭が必要', desc: '「監視されている」「見られている」という感覚を報告した回答者がいます。センサーの存在を隠す、または光の反応を遅延させてリアルタイム追跡感を軽減することを検討してください。', evidence: `監視関連語の出現: ${countWords(['監視', '見られ', '追われ', 'カメラ'])}回`, priority: 'high' });
    }
    // Rule 5: Negative perception focus
    if (negInPerception > totalResponses * 0.3 && totalResponses > 0) {
        recs.push({ icon: '🎨', title: '色温度・拡散範囲の調整', desc: '知覚カテゴリにネガティブな反応が集中しています。色温度や光の拡散範囲を調整し、視覚的な圧迫感を軽減することが有効です。', evidence: `知覚カテゴリのネガティブ回答: ${negInPerception}件 / ${totalResponses}件`, priority: 'mid' });
    }
    // Rule 6: Fear/anxiety in cognition
    if (negInCognition > 0) {
        recs.push({ icon: '🧠', title: '現状の不安要因への対応', desc: '認知カテゴリに不安や恐怖に関する回答があります。これは光のデザインが対処すべき「問題」の存在を示しており、デザインの必要性を裏付けるエビデンスです。', evidence: `認知カテゴリのネガティブ回答: ${negInCognition}件`, priority: 'mid' });
    }
    // Rule 7: Warmth is working
    if (countWords(['温かい', '温かみ', '暖かい', 'あたたかい']) >= 2) {
        recs.push({ icon: '🌡️', title: '「温かさ」のイメージは成功', desc: '複数の回答者が「温かい」というキーワードを使用しており、デザインの意図する温かみの知覚が成立しています。', evidence: `「温かい」関連語: ${countWords(['温かい', '温かみ', '暖かい', 'あたたかい'])}回出現`, priority: 'low' });
    }
    // Rule 8: Behavioral change detected
    const behaviorResponses = state.responses.filter(r => r.category === 'behavior');
    if (behaviorResponses.length > 0 && behaviorResponses.some(r => DICTIONARY.positive.some(w => r.text.includes(w)))) {
        recs.push({ icon: '🚶', title: 'ポジティブな行動変容を確認', desc: '行動カテゴリにポジティブな変化（歩き方の改善、視線の変化など）が報告されています。光のデザインがユーザーの行動に好影響を与えている可能性があります。', evidence: `行動カテゴリの回答: ${behaviorResponses.length}件`, priority: 'low' });
    }

    if (recs.length === 0) {
        container.innerHTML = '<div class="analysis-empty">改善提案の生成にはより多くの回答データが必要です</div>';
        return;
    }

    recs.sort((a, b) => { const o = { high: 3, mid: 2, low: 1 }; return o[b.priority] - o[a.priority]; });

    container.innerHTML = recs.map(r => `
        <div class="rec-item rec-priority-${r.priority}">
            <span class="rec-icon">${r.icon}</span>
            <div class="rec-body">
                <div class="rec-title">${escapeHtml(r.title)}</div>
                <div class="rec-desc">${escapeHtml(r.desc)}</div>
                <div class="rec-evidence">📎 ${escapeHtml(r.evidence)}</div>
            </div>
        </div>
    `).join('');
}

/* ----- AI Insight (Overall Commentary) ----- */
function renderInsight() {
    const container = document.getElementById('insight-content');
    const allText = state.responses.map(r => r.text).join(' ');
    const scores = state.controlScores.map(s => s.score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const total = state.responses.length;
    const catCounts = { perception: 0, cognition: 0, emotion: 0, behavior: 0 };
    const catPos = { perception: 0, cognition: 0, emotion: 0, behavior: 0 };
    const catNeg = { perception: 0, cognition: 0, emotion: 0, behavior: 0 };

    state.responses.forEach(r => {
        if (catCounts[r.category] !== undefined) catCounts[r.category]++;
        const p = DICTIONARY.positive.some(w => r.text.includes(w));
        const n = DICTIONARY.negative.some(w => r.text.includes(w));
        if (p) catPos[r.category]++;
        if (n) catNeg[r.category]++;
    });

    const totalPos = Object.values(catPos).reduce((a, b) => a + b, 0);
    const totalNeg = Object.values(catNeg).reduce((a, b) => a + b, 0);
    const posRate = total > 0 ? Math.round(totalPos / total * 100) : 0;
    const negRate = total > 0 ? Math.round(totalNeg / total * 100) : 0;
    const respondentCount = new Set(state.responses.map(r => r.respondent)).size;

    // --- Section 1: Overview ---
    let overview = '';
    if (total === 0) {
        overview = 'データが不足しているため、総合的な評価を行うことができません。';
    } else {
        const tone = posRate > negRate + 20 ? 'ポジティブな傾向が顕著' : negRate > posRate + 20 ? 'ネガティブな反応が目立つ' : 'ポジティブとネガティブが混在した';
        overview = `${respondentCount}名の回答者から得られた${total}件の回答データを分析した結果、全体として<strong>${tone}</strong>であることが確認されました。`;
        overview += ` ポジティブ語を含む回答は${posRate}%、ネガティブ語を含む回答は${negRate}%でした。`;
        if (avg !== null) {
            const controlLabel = avg >= 4.0 ? '高い自律感を示しており、デザインの「さりげなさ」が機能している' : avg <= 2.0 ? '管理されている感覚が強く、デザインの見直しが急務である' : avg <= 2.9 ? 'やや管理感に傾いており、改善の余地がある' : 'バランスの取れた状態にある';
            overview += `コントロール感の平均スコアは<strong>${avg.toFixed(1)}</strong>であり、${controlLabel}と評価できます。`;
        }
    }

    // --- Section 2: Causal Model Verification ---
    const catLabels = { perception: '知覚', cognition: '認知', emotion: '感情', behavior: '行動' };
    const stages = ['perception', 'cognition', 'emotion', 'behavior'];
    const supported = stages.filter(c => catCounts[c] >= 2);
    const weak = stages.filter(c => catCounts[c] === 0);
    const partial = stages.filter(c => catCounts[c] === 1);

    let causal = '因果フロー（デザイン → 知覚 → 認知 → 感情 → 行動）の検証状況：';
    if (supported.length === 4) {
        causal += '全4段階でデータが確認されており、因果モデルの各接続が一定の裏付けを持っています。';
    } else {
        if (supported.length > 0) causal += `<strong>${supported.map(c => catLabels[c]).join('・')}</strong>の段階は十分なデータで裏付けられています。`;
        if (partial.length > 0) causal += `${partial.map(c => catLabels[c]).join('・')}はデータが1件のみで、さらなる収集が推奨されます。`;
        if (weak.length > 0) causal += `<strong>${weak.map(c => catLabels[c]).join('・')}</strong>にはデータがなく、因果フローのこの部分は未検証の状態です。`;
    }
    // Check flow coherence
    const flowCoherent = catPos.perception > 0 && catPos.emotion > 0;
    if (flowCoherent) {
        causal += ' 知覚段階のポジティブ評価が感情段階の安心感に接続しており、「光の温かみ → 安心」の因果経路が示唆されます。';
    }

    // --- Section 3: Risks & Warnings ---
    const risks = [];
    if (totalNeg > 0) {
        const negCats = stages.filter(c => catNeg[c] > 0).map(c => `${catLabels[c]}(${catNeg[c]}件)`);
        risks.push(`ネガティブ回答が${negCats.join('、')}に検出されました。`);
    }
    const conflictCount = state.responses.filter(r => {
        const p = DICTIONARY.positive.some(w => r.text.includes(w));
        const n = DICTIONARY.negative.some(w => r.text.includes(w));
        return p && n;
    }).length;
    if (conflictCount > 0) risks.push(`${conflictCount}件の回答でポジティブとネガティブの両方が含まれる「葛藤」が見られます。これは光のデザインが複合的な感情を喚起している可能性を示します。`);
    if (avg !== null && avg < 3.0) risks.push('コントロール感スコアが中央値を下回っており、ユーザーが「選ばされている」感覚を覚えている可能性があります。');
    if (scores.length > 1) {
        const stdDev = Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length);
        if (stdDev > 1.2) risks.push(`スコアのばらつきが大きく（σ=${stdDev.toFixed(2)}）、回答者間で受け取り方に大きな個人差があります。`);
    }
    const riskText = risks.length > 0 ? risks.join(' ') : '現時点で重大なリスクや懸念は検出されていません。デザインコンセプトは概ね好意的に受け止められています。';

    // --- Section 4: Next Actions ---
    const actions = [];
    if (weak.length > 0) actions.push(`${weak.map(c => catLabels[c]).join('・')}カテゴリのデータを追加収集し、因果フローの空白を埋めることを推奨します。`);
    if (respondentCount < 5) actions.push(`現在の回答者数は${respondentCount}名です。統計的な信頼性を高めるため、最低5名以上の回答を目指してください。`);
    if (totalNeg > totalPos && total > 0) actions.push('ネガティブ回答がポジティブを上回っています。デザインの根本的な見直し、特に光の強度や色温度の再検討を行ってから再調査することを推奨します。');
    if (avg !== null && avg >= 3.0 && avg < 4.0) actions.push('コントロール感をさらに改善するため、光の帯の「グラデーション境界」をより曖昧にし、選択の自由度を強調するデザイン修正を試みてください。');
    if (actions.length === 0) actions.push('現在のデータは良好な傾向を示しています。このままの方向性で調査を継続し、サンプル数を増やしてエビデンスを強化してください。');
    const actionText = actions.join(' ');

    // --- Render ---
    container.innerHTML = `
        <div class="insight-section sec-overview">
            <div class="insight-section-title">📋 総評</div>
            <p>${overview}</p>
        </div>
        <div class="insight-section sec-causal">
            <div class="insight-section-title">🔗 因果モデルの検証</div>
            <p>${causal}</p>
        </div>
        <div class="insight-section sec-risk">
            <div class="insight-section-title">⚠️ 注意点・リスク</div>
            <p>${riskText}</p>
        </div>
        <div class="insight-section sec-action">
            <div class="insight-section-title">🚀 次のアクション</div>
            <p>${actionText}</p>
        </div>
    `;
}
