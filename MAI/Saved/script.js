document.addEventListener('DOMContentLoaded', () => {
    const scroll = document.getElementById('saved-scroll');
    const track = document.getElementById('saved-track');
    const thumb = document.getElementById('saved-thumb');

    if (scroll && track && thumb) {
        const THUMB_W = 188;

        function onScroll() {
            const maxScroll = scroll.scrollWidth - scroll.clientWidth;
            if (maxScroll <= 0) {
                thumb.style.left = '0px';
                return;
            }
            const progress = scroll.scrollLeft / maxScroll;
            const maxLeft = track.clientWidth - THUMB_W;
            thumb.style.left = (progress * maxLeft) + 'px';
        }

        track.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = track.getBoundingClientRect();
            const clickX = e.clientX - rect.left - THUMB_W / 2;
            const maxLeft = track.clientWidth - THUMB_W;
            const ratio = Math.max(0, Math.min(clickX / maxLeft, 1));
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
        });

        let isDragging = false;
        let startX = 0;
        let startLeft = 0;

        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = thumb.offsetLeft;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const maxLeft = track.clientWidth - THUMB_W;
            let newLeft = startLeft + deltaX;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            thumb.style.left = newLeft + 'px';
            const ratio = maxLeft === 0 ? 0 : newLeft / maxLeft;
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        scroll.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onScroll);

        onScroll();
    }

    document.querySelectorAll('.saved-card').forEach(card => {
        const MAX_TILT = 6;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);

            const nx = Math.max(-1, Math.min(1, dx));
            const ny = Math.max(-1, Math.min(1, dy));

            const ry = -nx * MAX_TILT;
            const rx =  ny * MAX_TILT;

            card.style.setProperty('--rx', rx + 'deg');
            card.style.setProperty('--ry', ry + 'deg');
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
        });
    });
});