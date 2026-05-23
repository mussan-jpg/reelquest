// ui/tooltip.js

export function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function setupTooltip() {
    const _tooltipEl = document.createElement('div');
    _tooltipEl.id = 'game-tooltip';
    _tooltipEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 20000;
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 12px;
        max-width: 280px;
        white-space: pre-wrap;
        line-height: 1.3;
        display: none;
    `;
    document.body.appendChild(_tooltipEl);

    let _tooltipTimer = null;
    document.addEventListener('mouseover', (e) => {
        const el = e.target.closest && e.target.closest('[data-tooltip]') || (e.target && e.target.getAttribute && e.target.getAttribute('data-tooltip') ? e.target : null);
        if (!el) return;
        const text = el.getAttribute('data-tooltip');
        if (!text) return;

        // ほぼ即時表示（遅延を極小に）
        if (_tooltipTimer) clearTimeout(_tooltipTimer);
        _tooltipTimer = setTimeout(() => {
            _tooltipEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
            _tooltipEl.style.display = 'block';
            const rect = el.getBoundingClientRect();
            const top = rect.top - 10 - _tooltipEl.offsetHeight;
            const left = rect.left + (rect.width / 2) - (_tooltipEl.offsetWidth / 2);
            _tooltipEl.style.top = (top > 8 ? top : rect.bottom + 12) + 'px';
            _tooltipEl.style.left = Math.max(8, left) + 'px';
        }, 30); // 30ms の短い遅延でほぼ即時表示
    });

    document.addEventListener('mouseout', (e) => {
        const related = e.relatedTarget;
        if (_tooltipTimer) { clearTimeout(_tooltipTimer); _tooltipTimer = null; }
        _tooltipEl.style.display = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (_tooltipEl.style.display === 'block') {
            // マウスに追従させない（固定表示）が望ましいが、軽く位置調整
            const maxRight = window.innerWidth - 16 - _tooltipEl.offsetWidth;
            const left = Math.min(Math.max(8, e.clientX - (_tooltipEl.offsetWidth / 2)), maxRight);
            const top = Math.min(Math.max(8, e.clientY - 24 - _tooltipEl.offsetHeight), window.innerHeight - 16 - _tooltipEl.offsetHeight);
            _tooltipEl.style.left = left + 'px';
            _tooltipEl.style.top = top + 'px';
        }
    });
}
